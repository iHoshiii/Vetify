import type {
  ProfessionalAvailabilityStatus,
  ProfessionalBookingNotificationTime,
} from '@shared/limits';
import {
  PROFESSIONAL_STATUSES,
  type ProfessionalAddressKind,
  type ProfessionalStatus,
  type WeeklyScheduleItem,
  type WorkHistoryItem,
} from '@shared/schemas';
import { ObjectId } from 'mongodb';

import type { ProfessionalCaptureIds } from '../professional-captures';
import type { UserRole, UserStatus } from '../users/types';

/**
 * Where an application sits.
 *
 * 'pending' is the only status an applicant can create. The rest are a reviewer's:
 * 'interview' is a booked conversation the applicant is waiting on, 'verified' is
 * a listing in the directory and the 'professional' role, 'rejected' is a decision
 * with a reason attached, and 'suspended' pulls an already-verified vet without
 * pretending the verification never happened. Nothing deletes an application — a
 * rejected applicant may appeal, and a suspension has to be explainable months
 * later.
 */
export { PROFESSIONAL_STATUSES };
export type { ProfessionalStatus };

/** The only status the public directory reads. */
export const PROFESSIONAL_PUBLIC_STATUSES: ProfessionalStatus[] = ['verified'];

/**
 * A reading taken from the device at the address, as the database holds it.
 *
 * `accuracyMeters` is kept rather than thrown away once the coordinate passed
 * validation, because it is the only thing that makes the coordinate readable
 * later: a pin is a claim, and "good to within 12 m" is what makes it one a
 * reviewer can weigh.
 */
export type ProfessionalLocationFix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: Date;
};

/** One address on an application. Private: verification material, not a listing. */
export type ProfessionalAddress = {
  kind: ProfessionalAddressKind;
  line1: string;
  city: string;
  province: string;
  postalCode: string | null;
  /** Present on every home address, and on a clinic only if one was taken. */
  fix: ProfessionalLocationFix | null;
};

/** An application as the database holds it. */
export type ProfessionalDocument = {
  _id: ObjectId;
  /** The account applying. Unique: one application per person. */
  user: ObjectId;
  /**
   * The name as the licensing board has it.
   *
   * Not the account's name, which its holder can change from settings whenever
   * they like: this one was checked against the register, so a later rename must
   * not be able to quietly detach a verified listing from the licence behind it.
   */
  fullName: string;
  licenseNumber: string;
  /** The board or council that issued the licence, part of its identity. */
  licenseAuthority: string;
  /** Extra links a reviewer may open: a diploma, a board certificate. */
  credentialUrls: string[];
  specialties: string[];
  /** Null for a vet who practises out of their house and has no clinic to name. */
  clinicName: string | null;
  /**
   * The address line a listing leads with.
   *
   * Derived from `addresses` rather than typed, and deliberately not the same thing:
   * a clinic is written out in full, and an applicant with only a home address gets
   * their city and province. A summary line rather than the whole answer — the
   * listing publishes the addresses themselves beside it, so somebody searching by
   * where they live can find a vet who works from home.
   */
  clinicAddress: string;
  /** Where the applicant lives, practises, or both. At least one. */
  addresses: ProfessionalAddress[];
  /** A number for the practice. Optional on the form and often absent. */
  businessPhone: string | null;
  bio: string;
  yearsExperience: number;
  hourlyRate?: number;
  availabilityStatus?: ProfessionalAvailabilityStatus;
  weeklySchedule?: WeeklyScheduleItem[];
  avatarUrl?: string | null;
  workHistory?: WorkHistoryItem[];
  bookingNotificationMinutes?: ProfessionalBookingNotificationTime;
  flaggedForRateReview?: boolean;
  status: ProfessionalStatus;
  /**
   * When the applicant consented to a background check, rather than whether.
   * The site promises every listed vet has consented, and a date answers "when
   * did they agree, and to which version of the terms" — a boolean does not.
   */
  backgroundCheckConsentAt: Date | null;
  /** The booked conversation, and anything the reviewer wanted to say about it. */
  interviewAt: Date | null;
  interviewNote: string | null;
  // Review trail, written by the admin verification routes. Null while pending.
  reviewedBy: ObjectId | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A verified application joined to the account behind it, which is what the
 * directory reads: the avatar and the fallback name live on the user document.
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
 * One address as the directory publishes it.
 *
 * `ProfessionalAddressView` without the `fix`. That reading came off the applicant's
 * device during verification and carries its accuracy in metres: it says where a
 * phone was on the day somebody applied, and nothing in it helps a pet owner find
 * the door. Verification material, so it stays where a reviewer can see it and
 * nowhere else.
 */
export type PublicAddress = Omit<ProfessionalAddressView, 'fix'>;

/** One address as a response carries it: the fix stamped as an ISO string. */
export type ProfessionalAddressView = {
  kind: ProfessionalAddressKind;
  line1: string;
  city: string;
  province: string;
  postalCode: string | null;
  fix: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  } | null;
};

/**
 * The applicant's own view of their application.
 *
 * Everything they submitted, plus where it stands. Dates are ISO strings for the
 * same reason the blog shapes use them: that is what the response actually
 * carries. `reviewedBy` is absent — who decided is internal, and the applicant is
 * told the outcome and the reason, not the name.
 *
 * There is no counterpart that writes any of this. The whole submission is frozen
 * once it is filed, which is why the dashboard renders it read-only and points at
 * support rather than offering a form.
 */
export type OwnProfessional = {
  id: string;
  userId: string;
  fullName: string;
  licenseNumber: string;
  licenseAuthority: string;
  credentialUrls: string[];
  specialties: string[];
  clinicName: string | null;
  clinicAddress: string;
  addresses: ProfessionalAddressView[];
  businessPhone: string | null;
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  weeklySchedule: WeeklyScheduleItem[];
  avatarUrl: string | null;
  workHistory: WorkHistoryItem[];
  bookingNotificationMinutes: ProfessionalBookingNotificationTime;
  flaggedForRateReview: boolean;
  status: ProfessionalStatus;
  /** Ids for the three photographs, to be streamed one at a time. */
  captures: ProfessionalCaptureIds;
  interviewAt: string | null;
  interviewNote: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A directory entry.
 *
 * Deliberately narrower than the applicant's own view: the licence number, the
 * photographs and the addresses in full are verification material, not a public
 * profile. They are absent by construction here rather than deleted somewhere
 * downstream. `clinicAddress` is the one publishable line, which for a vet with no
 * clinic is a city rather than a doorstep.
 */
export type PublicProfessional = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  clinicName: string | null;
  clinicAddress: string;
  /**
   * Where they work, home addresses included, so a search can match on a street that
   * a clinic name would miss. Without the device fix each one was verified with.
   */
  addresses: PublicAddress[];
  businessPhone: string | null;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  weeklySchedule: WeeklyScheduleItem[];
  workHistory: WorkHistoryItem[];
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
 * deliberately so — the licence number, the photographs and the addresses are the
 * whole point of the screen, and `reviewedBy` is internal detail that only this
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
