import { PROFESSIONAL_STATUSES, type ProfessionalStatus } from '@shared/schemas';
import { ObjectId } from 'mongodb';

import type { UserRole, UserStatus } from '../users/types';

/**
 * Where an application sits.
 *
 * 'pending' is the only status an applicant can create. The other three are a
 * reviewer's verdict: 'verified' is a listing in the directory and the
 * 'professional' role, 'rejected' is a decision with a reason attached, and
 * 'suspended' pulls an already-verified vet without pretending the verification
 * never happened. Nothing deletes an application — a rejected applicant may
 * appeal, and a suspension has to be explainable months later.
 */
export { PROFESSIONAL_STATUSES };
export type { ProfessionalStatus };

/** The only status the public directory reads. */
export const PROFESSIONAL_PUBLIC_STATUSES: ProfessionalStatus[] = ['verified'];

/** An application as the database holds it. */
export type ProfessionalDocument = {
  _id: ObjectId;
  /** The account applying. Unique: one application per person. */
  user: ObjectId;
  licenseNumber: string;
  /** The board or council that issued the licence, part of its identity. */
  licenseAuthority: string;
  /** Links a reviewer opens: the licence itself, a diploma, board certificates. */
  credentialUrls: string[];
  specialties: string[];
  clinicName: string;
  clinicAddress: string;
  bio: string;
  yearsExperience: number;
  status: ProfessionalStatus;
  /**
   * When the applicant consented to a background check, rather than whether.
   * The site promises every listed vet has consented, and a date answers "when
   * did they agree, and to which version of the terms" — a boolean does not.
   */
  backgroundCheckConsentAt: Date | null;
  // Review trail, written by the admin verification routes. Null while pending.
  reviewedBy: ObjectId | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A verified application joined to the account behind it, which is what the
 * directory reads: the vet's name and picture live on the user document.
 */
export type ProfessionalWithAccount = ProfessionalDocument & {
  account: {
    _id: ObjectId;
    name: string | null;
    avatarUrl: string | null;
    status: UserStatus;
  };
};

/**
 * The applicant's own view of their application.
 *
 * Dates are ISO strings for the same reason the blog shapes use them: that is
 * what the response actually carries. `reviewedBy` is absent — who reviewed it is
 * internal, and the applicant is told the outcome and the reason, not the name.
 */
export type OwnProfessional = {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseAuthority: string;
  credentialUrls: string[];
  specialties: string[];
  clinicName: string;
  clinicAddress: string;
  bio: string;
  yearsExperience: number;
  status: ProfessionalStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A directory entry.
 *
 * Deliberately narrower than the applicant's own view: the licence number and
 * the credential links are verification material, not a public profile. They are
 * absent by construction here rather than deleted somewhere downstream.
 */
export type PublicProfessional = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  clinicName: string;
  clinicAddress: string;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  /** When the licence was verified. Every entry in the directory has one. */
  verifiedAt: string | null;
};

/** One page of directory entries, plus what the client needs to draw a pager. */
export type ProfessionalPage = {
  items: PublicProfessional[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

/** The applicant, as the review queue needs to see them. */
export type AdminApplicant = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
};

/**
 * An application as a reviewer sees it: everything the applicant submitted, plus
 * who they are, plus who decided and when.
 *
 * Wider than either the applicant's own view or the directory entry, and
 * deliberately so — the licence number and the credential links are the whole
 * point of the screen, and `reviewedBy` is internal detail that only this
 * audience is shown.
 */
export type AdminProfessional = OwnProfessional & {
  applicant: AdminApplicant | null;
  reviewedBy: string | null;
};

export type AdminProfessionalPage = {
  items: AdminProfessional[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};
