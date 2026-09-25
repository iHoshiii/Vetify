import { ADMIN_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection } from 'mongodb';

import { APPOINTMENTS_COLLECTION } from '../appointments';
import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { USERS_COLLECTION } from '../users';
import {
  REVIEW_REPORTS_COLLECTION,
  type ReviewReportDocument,
  type ReviewReportRow,
  type ReviewReportStatus,
} from './types';

export function reviewReportsCollection(): Collection<ReviewReportDocument> {
  return getDb().collection<ReviewReportDocument>(REVIEW_REPORTS_COLLECTION);
}

// Files one report. Everything an admin decides on is null at this point.
export async function insertReviewReport(attrs: {
  appointment: ObjectId;
  professional: ObjectId;
  reporter: ObjectId;
  reason: string;
}): Promise<ReviewReportDocument> {
  const now = new Date();
  const doc: ReviewReportDocument = {
    _id: new ObjectId(),
    appointment: attrs.appointment,
    professional: attrs.professional,
    reporter: attrs.reporter,
    reason: attrs.reason,
    status: 'pending',
    decidedBy: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await reviewReportsCollection().insertOne(doc);
  return doc;
}

export async function findReviewReportById(
  id: string | ObjectId
): Promise<ReviewReportDocument | null> {
  return await reviewReportsCollection().findOne({ _id: toObjectId(id) });
}

// One page of the queue, each report joined to the review it flags and to the two accounts behind it. The reviewer name comes through the reported booking's client; both names stay unmasked because only an admin reads this.
export async function findReviewReports(options: {
  status?: ReviewReportStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: ReviewReportRow[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, options.limit ?? ADMIN_PAGE_SIZE);
  const filter = options.status ? { status: options.status } : {};

  const [items, total] = await Promise.all([
    reviewReportsCollection()
      .aggregate<ReviewReportRow>([
        { $match: filter },
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: APPOINTMENTS_COLLECTION,
            localField: 'appointment',
            foreignField: '_id',
            as: '_appt',
          },
        },
        {
          $lookup: {
            from: USERS_COLLECTION,
            localField: 'reporter',
            foreignField: '_id',
            as: '_reporter',
          },
        },
        {
          $lookup: {
            from: USERS_COLLECTION,
            let: { clientId: { $arrayElemAt: ['$_appt.client', 0] } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$clientId'] } } },
              { $project: { name: 1 } },
            ],
            as: '_reviewer',
          },
        },
        {
          $addFields: {
            stars: { $arrayElemAt: ['$_appt.rating', 0] },
            comment: { $arrayElemAt: ['$_appt.ratingComment', 0] },
            reviewerName: { $arrayElemAt: ['$_reviewer.name', 0] },
            reporterName: { $arrayElemAt: ['$_reporter.name', 0] },
          },
        },
        { $project: { _appt: 0, _reporter: 0, _reviewer: 0 } },
      ])
      .toArray(),
    reviewReportsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

// Closes a report with a status and stamps who decided it. Guarded on the report still being pending, so two admins cannot both decide it.
export async function setReviewReportStatus(
  id: string | ObjectId,
  patch: { status: ReviewReportStatus; decidedBy: ObjectId }
): Promise<ReviewReportDocument | null> {
  const now = new Date();
  return await reviewReportsCollection().findOneAndUpdate(
    { _id: toObjectId(id), status: 'pending' },
    { $set: { status: patch.status, decidedBy: patch.decidedBy, decidedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}
