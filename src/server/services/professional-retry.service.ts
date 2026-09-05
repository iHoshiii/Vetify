import { PROFESSIONAL_RETRY_DAYS } from '@shared/limits';
import type { ObjectId } from 'mongodb';

import {
  deleteProfessional,
  deleteProfessionalCaptures,
  findLatestInquiryByEmail,
  findProfessionalByUser,
  inviteRefusal,
  updateProfessionalInquiry,
  PROFESSIONAL_INQUIRY_OPEN_STATUSES,
  type ProfessionalDocument,
} from '../models';
import { MANILA_DATE } from './mail-template';

const RETRY_MS = PROFESSIONAL_RETRY_DAYS * 24 * 60 * 60 * 1000;

// What the route answers with. One 409 per reason, so the form can tell "wait for us"
// apart from "come back on the 5th" without reading the sentence.
export type InquiryBlock = { code: string; message: string };

function dueDate(from: Date): Date {
  return new Date(from.getTime() + RETRY_MS);
}

// A verdict is dated by the review. The row's own last write stands in for one filed
// straight into a decided status, which only a script or a fixture does.
function reopensAt(application: ProfessionalDocument): Date {
  return dueDate(application.reviewedAt ?? application.updatedAt);
}

// The link is spent and nobody used it, so the enquiry stops holding the address. The
// status stays 'invited' because that is what happened, and the lapsed date still reads
// as 'expired' to anyone who clicks the old link.
async function closeLapsedInvite(id: ObjectId): Promise<void> {
  await updateProfessionalInquiry(id, { openEmail: null });
}

// Why this account cannot send an enquiry today, or null when it can. Read before the
// insert: the unique index only knows about enquiries that are still open, and these
// three rules are about the ones that have closed.
export async function inquiryBlock(input: {
  user: string | ObjectId;
  email: string;
}): Promise<InquiryBlock | null> {
  const applied = await findProfessionalByUser(input.user);

  if (applied && applied.status !== 'rejected') {
    return {
      code: 'application-filed',
      message:
        'You have already filed an application. Wait for the reviewers to answer it, or contact customer service.',
    };
  }

  if (applied) {
    const due = reopensAt(applied);
    if (due.getTime() > Date.now()) {
      const from = MANILA_DATE.format(due);
      return {
        code: 'application-rejected',
        message: `Your application was turned down. You can apply again from ${from}.`,
      };
    }
  }

  const previous = await findLatestInquiryByEmail(input.email);
  if (!previous) return null;

  if (previous.status === 'invited' && inviteRefusal(previous) === 'expired') {
    await closeLapsedInvite(previous._id);
    return null;
  }

  // Anything still open belongs to the unique index, which has a better sentence for it
  if (PROFESSIONAL_INQUIRY_OPEN_STATUSES.includes(previous.status)) return null;

  // An automatic refusal does not start the clock. The screen turns down a mistyped
  // licence number without anybody reading the enquiry, and a month is a long time to
  // wait for a typo.
  if (previous.status === 'declined' && !previous.reviewedBy) return null;

  const due = dueDate(previous.createdAt);
  if (due.getTime() <= Date.now()) return null;

  const sent = MANILA_DATE.format(previous.createdAt);
  const from = MANILA_DATE.format(due);
  return {
    code: 'inquiry-cooldown',
    message: `We already have your enquiry from ${sent}. You can send another from ${from}.`,
  };
}

// Drops an application refused long enough ago that its author may try again, so the
// one-per-account index does not refuse the replacement. Deleted rather than rewritten:
// the three identity photographs go with it, and the rejection is still in the audit
// log, which is where the history belongs. False for every other case, which leaves the
// index to answer exactly as it did before.
export async function dropStaleRefusal(user: string | ObjectId): Promise<boolean> {
  const application = await findProfessionalByUser(user);
  if (!application || application.status !== 'rejected') return false;
  if (reopensAt(application).getTime() > Date.now()) return false;

  await deleteProfessionalCaptures(application._id);
  return await deleteProfessional(application._id);
}
