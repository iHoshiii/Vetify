import { PROFESSIONAL_REVIEWS_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Filter } from 'mongodb';

import { toObjectId } from '../object-id';
import { USERS_COLLECTION } from '../users';
import { appointmentsCollection } from './repository';
import type { AppointmentDocument } from './types';

// One rating as the public profile and the card popup show it: stars, the note if any, when it was left, and the rater's name already masked.
export type ProfessionalReview = {
  id: string;
  stars: number;
  comment: string | null;
  reviewer: string;
  ratedAt: string;
};

export type ProfessionalReviewPage = {
  items: ProfessionalReview[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

// Keeps the first letter of each word and stars the rest, so "Aldwin Loreto" reads as "A***** L*****" and a full name never reaches the client.
export function maskName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'A pet owner';
  return trimmed
    .split(/\s+/)
    .map((word) => word[0] + '*'.repeat(Math.max(0, word.length - 1)))
    .join(' ');
}

type ReviewRow = {
  _id: ObjectId;
  rating: number;
  ratingComment: string | null;
  reviewerName: string | null;
  ratedAt: Date;
};

// One page of a vet's ratings, newest first, the rater's account name masked in place. withComment narrows it to ratings that carry a written note, which is what the profile's Ratings panel lists. ratedAt reads through updatedAt for rows rated before the field existed.
export async function findProfessionalReviews(input: {
  professional: string | ObjectId;
  page?: number;
  limit?: number;
  withComment?: boolean;
}): Promise<{ items: ProfessionalReview[]; total: number }> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, input.limit ?? PROFESSIONAL_REVIEWS_PAGE_SIZE);

  // Loose here rather than Filter<AppointmentDocument> because the query-only $type: 'number' alias, which matches ratings stored as int or double alike, is not in the driver's typed BSON-alias union.
  const match: Record<string, unknown> = {
    professional: toObjectId(input.professional),
    rating: { $type: 'number' },
  };
  if (input.withComment) match.ratingComment = { $type: 'string' };

  const [rows, total] = await Promise.all([
    appointmentsCollection()
      .aggregate<ReviewRow>([
        { $match: match },
        { $addFields: { ratedAt: { $ifNull: ['$ratedAt', '$updatedAt'] } } },
        { $sort: { ratedAt: -1, _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: USERS_COLLECTION,
            localField: 'client',
            foreignField: '_id',
            as: '_reviewer',
          },
        },
        {
          $project: {
            rating: 1,
            ratingComment: 1,
            ratedAt: 1,
            reviewerName: { $arrayElemAt: ['$_reviewer.name', 0] },
          },
        },
      ])
      .toArray(),
    appointmentsCollection().countDocuments(match as Filter<AppointmentDocument>),
  ]);

  const items = rows.map((row) => ({
    id: row._id.toString(),
    stars: row.rating,
    comment: row.ratingComment ?? null,
    reviewer: maskName(row.reviewerName),
    ratedAt: row.ratedAt.toISOString(),
  }));

  return { items, total };
}

// Wraps a page of reviews in the standard list envelope every other paginated read uses.
export function toReviewPage(input: {
  items: ProfessionalReview[];
  total: number;
  page: number;
  limit: number;
}): ProfessionalReviewPage {
  return {
    items: input.items,
    page: input.page,
    limit: input.limit,
    total: input.total,
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
