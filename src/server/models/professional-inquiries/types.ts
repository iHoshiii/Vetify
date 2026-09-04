import { PROFESSIONAL_INQUIRY_STATUSES, type ProfessionalInquiryStatus } from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';

export const PROFESSIONAL_INQUIRIES_COLLECTION = 'professionalinquiries';

/**
 * Where an enquiry sits. Re-exported from the shared contract for the same reason
 * the user statuses are: the admin queue renders these as filters and badges, so
 * a second copy here would let the server store a status the screen cannot draw.
 */
export { PROFESSIONAL_INQUIRY_STATUSES };
export type { ProfessionalInquiryStatus };

/** The statuses that mean somebody could still walk through the door. */
export const PROFESSIONAL_INQUIRY_OPEN_STATUSES: ProfessionalInquiryStatus[] = [
  'pending',
  'invited',
];

/** A dropped marker. The pair the map is drawn from, in reading order. */
export type InquiryPin = { latitude: number; longitude: number };

/** An enquiry as the database holds it. */
export type ProfessionalInquiryDocument = {
  _id: ObjectId;
  /** What the applicant says their name is. Nothing has been checked yet. */
  name: string;
  email: string;
  /**
   * The same address, present only while the enquiry is open.
   *
   * The uniqueness rule is "one open enquiry per address", and Mongo cannot
   * express that as a filter over a status list on an index. So the field is the
   * filter: it holds the email while the enquiry is pending or invited, and is
   * nulled when the enquiry is declined or completed, at which point the same
   * person may write in again. Same trick the users collection uses to scope
   * provider uniqueness to accounts that actually have a provider id.
   */
  openEmail: string | null;
  licenseNumber: string;
  licenseAuthority: string;
  /** Where the applicant is now, when they gave it. Null when only the clinic was pinned. */
  currentLocation: string | null;
  // The marker behind that line. Carried to the application and published on
  // verification, which is the only way a vet reaches the map.
  currentPin: InquiryPin | null;
  /** Where they practise, when that is somewhere else. */
  clinicLocation: string | null;
  clinicPin: InquiryPin | null;
  clinicName: string | null;
  motivation: string;
  phone: string | null;
  yearsExperience: number | null;
  status: ProfessionalInquiryStatus;
  /**
   * The emailed link, stored as a hash.
   *
   * The token itself is in one place only — the applicant's inbox. A leaked
   * database therefore leaks no usable links, which is the same reasoning the
   * refresh tokens are stored under, and the reason this reuses their hash.
   */
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | null;
  inviteNote: string | null;
  invitedAt: Date | null;
  /** How many links have been sent. A resend is a new token, not a second row. */
  inviteCount: number;
  // The reviewer's trail. Null while nobody has looked.
  reviewedBy: ObjectId | null;
  reviewedAt: Date | null;
  declineReason: string | null;
  /** When the application behind the link was filed, which retires the link. */
  completedAt: Date | null;
  application: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * An enquiry as a reviewer sees it: everything filed, plus where it now stands.
 *
 * No `inviteTokenHash`, and no token: a hash is of no use on a screen, and the
 * link itself is handed back exactly once, by the route that mints it, so the
 * reviewer can pass it on if the email bounces.
 */
export type AdminInquiry = {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  licenseAuthority: string;
  currentLocation: string | null;
  clinicLocation: string | null;
  clinicName: string | null;
  motivation: string;
  phone: string | null;
  yearsExperience: number | null;
  status: ProfessionalInquiryStatus;
  inviteNote: string | null;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
  /** Whether the emailed link would still work if somebody clicked it now. */
  inviteLive: boolean;
  inviteCount: number;
  declineReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInquiryPage = {
  items: AdminInquiry[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

/**
 * What the application form is told about the invitation behind it.
 *
 * Deliberately thin. The token is the only credential involved, so anything this
 * returns is readable by whoever holds the link — which is the applicant, and also
 * anyone the applicant forwarded it to. The three identity fields are what the
 * form has to show as locked; the motivation and the reviewer's trail are not the
 * applicant's business twice over.
 */
export type InviteSummary = {
  name: string;
  email: string;
  licenseNumber: string;
  licenseAuthority: string;
  currentLocation: string | null;
  currentPin: InquiryPin | null;
  clinicLocation: string | null;
  clinicPin: InquiryPin | null;
  clinicName: string | null;
  phone: string | null;
  yearsExperience: number;
  expiresAt: string;
};

export const PROFESSIONAL_INQUIRY_INDEXES: IndexDescription[] = [
  // One open enquiry per address, so a reviewer's queue cannot fill with the same
  // person. Scoped with a partial filter on the presence of `openEmail` rather
  // than on the status, because an index filter cannot ask "is the status one of
  // these two" — see the field's own note.
  {
    key: { openEmail: 1 },
    unique: true,
    partialFilterExpression: { openEmail: { $type: 'string' } },
  },
  // The queue: enquiries in a status, newest first.
  { key: { status: 1, createdAt: -1 } },
  // Looking an emailed link up by its hash. Unique, and partial for the same
  // reason as above: most rows have no token at all, and two nulls are not a
  // collision.
  {
    key: { inviteTokenHash: 1 },
    unique: true,
    partialFilterExpression: { inviteTokenHash: { $type: 'string' } },
  },
];
