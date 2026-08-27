import { PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import { Binary, ObjectId, type Collection } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import {
  PROFESSIONAL_CAPTURES_COLLECTION,
  type ProfessionalCaptureDocument,
  type ProfessionalCaptureIds,
  type ProfessionalPhotoKind,
} from './types';

export function professionalCapturesCollection(): Collection<ProfessionalCaptureDocument> {
  return getDb().collection<ProfessionalCaptureDocument>(PROFESSIONAL_CAPTURES_COLLECTION);
}

/** One photograph as it arrives on the wire: base64, plus what it claims to be. */
export type CaptureInput = {
  kind: ProfessionalPhotoKind;
  /** Raw base64 — the shared schema has already refused a data: prefix. */
  data: string;
  mimeType: string;
  capturedAt: string | Date;
};

/**
 * Writes the photographs for one application.
 *
 * Decoding happens here rather than in the route because this is the only place
 * that needs the bytes, and the size is re-checked against the decoded length
 * rather than trusted from the base64 estimate the schema used: the estimate is
 * for telling a caller off early, and this is the number that decides what goes on
 * disk.
 *
 * One `insertMany`, so three photographs are three documents in one round trip
 * and a failure on the third does not leave two behind.
 */
export async function insertProfessionalCaptures(input: {
  application: string | ObjectId;
  user: string | ObjectId;
  captures: CaptureInput[];
}): Promise<ProfessionalCaptureDocument[]> {
  const application = toObjectId(input.application);
  const user = toObjectId(input.user);
  const now = new Date();

  const docs: ProfessionalCaptureDocument[] = input.captures.map((capture) => {
    const bytes = Buffer.from(capture.data, 'base64');

    if (bytes.byteLength === 0) throw new Error(`The ${capture.kind} capture decoded to nothing`);
    if (bytes.byteLength > PROFESSIONAL_PHOTO_MAX_BYTES) {
      throw new Error(`The ${capture.kind} capture is larger than the limit allows`);
    }

    return {
      _id: new ObjectId(),
      application,
      user,
      kind: capture.kind,
      mimeType: capture.mimeType,
      bytes: new Binary(bytes),
      byteLength: bytes.byteLength,
      capturedAt: new Date(capture.capturedAt),
      createdAt: now,
    };
  });

  await professionalCapturesCollection().insertMany(docs);
  return docs;
}

/** One capture, bytes included. The only read that carries an image. */
export async function findProfessionalCapture(
  id: string | ObjectId
): Promise<ProfessionalCaptureDocument | null> {
  return await professionalCapturesCollection().findOne({ _id: toObjectId(id) });
}

/**
 * The capture ids on one application, by kind.
 *
 * Projected without `bytes`, which is the whole point: a detail view wants three
 * URLs, not three JPEGs, and the route that streams one is where the bytes belong.
 */
export async function findCaptureIds(
  application: string | ObjectId
): Promise<ProfessionalCaptureIds> {
  const rows = await professionalCapturesCollection()
    .find({ application: toObjectId(application) }, { projection: { kind: 1 } })
    .toArray();

  return Object.fromEntries(rows.map((row) => [row.kind, row._id.toString()]));
}

/**
 * The capture ids for several applications at once, keyed by application id.
 *
 * One `$in` for a whole page of the review queue, same shape as the applicant
 * lookup beside it — twenty rows should not be twenty round trips.
 */
export async function findCaptureIdsForApplications(
  applications: Array<string | ObjectId>
): Promise<Map<string, ProfessionalCaptureIds>> {
  if (applications.length === 0) return new Map();

  const rows = await professionalCapturesCollection()
    .find(
      { application: { $in: applications.map(toObjectId) } },
      { projection: { kind: 1, application: 1 } }
    )
    .toArray();

  const byApplication = new Map<string, ProfessionalCaptureIds>();
  for (const row of rows) {
    const key = row.application.toString();
    const existing = byApplication.get(key) ?? {};
    existing[row.kind] = row._id.toString();
    byApplication.set(key, existing);
  }

  return byApplication;
}

/**
 * Removes the photographs of one application.
 *
 * The compensating half of filing an application: the row is inserted first,
 * because that is where a duplicate licence is caught and it costs nothing to
 * find out before megabytes are written. If the photographs then fail to land,
 * the application is deleted and this clears whatever did — so no application
 * exists without its captures, and no captures sit pointing at nothing.
 */
export async function deleteProfessionalCaptures(application: string | ObjectId): Promise<number> {
  const result = await professionalCapturesCollection().deleteMany({
    application: toObjectId(application),
  });
  return result.deletedCount;
}
