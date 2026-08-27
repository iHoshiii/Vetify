import { PROFESSIONAL_PHOTO_KINDS, type ProfessionalPhotoKind } from '@shared/limits';
import { Binary, ObjectId, type IndexDescription } from 'mongodb';

export const PROFESSIONAL_CAPTURES_COLLECTION = 'professionalcaptures';

export { PROFESSIONAL_PHOTO_KINDS };
export type { ProfessionalPhotoKind };

/**
 * One photograph taken during an application.
 *
 * Its own collection rather than three fields on the application, for two
 * reasons. The application document is read on every queue page and every
 * directory listing, and nothing about those screens wants four megabytes of
 * JPEG travelling with each row. And the bytes have a different audience: the
 * application is shown to the applicant and to reviewers, while these are
 * verification material behind an authorised route that streams one at a time.
 */
export type ProfessionalCaptureDocument = {
  _id: ObjectId;
  /**
   * The application this belongs to. The pointer runs this way and not the other,
   * so neither document has to be written twice: the application is inserted
   * first and these follow, and there is no id to patch back in afterwards.
   */
  application: ObjectId;
  /**
   * The account that filed it.
   *
   * Copied rather than joined, because it is what authorises a read: the route
   * that streams a capture has to decide whether this caller may see it, and a
   * lookup through the application to find out is a join on the hot path of an
   * image request.
   */
  user: ObjectId;
  kind: ProfessionalPhotoKind;
  mimeType: string;
  bytes: Binary;
  /** Kept alongside the bytes so a listing can report sizes without reading them. */
  byteLength: number;
  /**
   * When the camera took it, as the browser reported.
   *
   * The claim the freshness check was made against, kept so a reviewer can see it
   * too: three captures minutes apart on the same evening read differently from
   * three that claim the same second.
   */
  capturedAt: Date;
  createdAt: Date;
};

/** The capture ids on one application, by kind — what a detail view links to. */
export type ProfessionalCaptureIds = Partial<Record<ProfessionalPhotoKind, string>>;

export const PROFESSIONAL_CAPTURE_INDEXES: IndexDescription[] = [
  // One photograph of each kind per application, and the read that fetches all
  // three. Unique because a second portrait on the same application is not a
  // second photograph, it is a retake that should have replaced the first.
  { key: { application: 1, kind: 1 }, unique: true },
];
