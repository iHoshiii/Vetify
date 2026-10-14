import type { ObjectId } from 'mongodb';
import {
  findProfessionalById,
  findUserById,
  publishPinnedAddresses,
  recordAudit,
  updateProfessional,
  type AuditAction,
  type ProfessionalDocument,
  type User,
  type UserPatch,
  type UserRole,
} from '../models';
import { saveProfessionalAccount } from '../models/users/account-change';
import { AppError } from '../utils/AppError';
import { deliverMail, type MailDelivery } from './mail.service';
import { rejectedEmail, verifiedEmail } from './professional-mail';

export type ProfessionalDecision = 'verified' | 'rejected' | 'suspended';
const AUDIT_ACTION: Record<ProfessionalDecision, AuditAction> = {
  verified: 'professional.verified',
  rejected: 'professional.rejected',
  suspended: 'professional.suspended',
};

export type ReviewProfessionalInput = {
  id: string | ObjectId;
  decision: ProfessionalDecision;
  reviewer: User;
  reason?: string | null;
  ip?: string | null;
};

export type ReviewProfessionalResult = {
  application: ProfessionalDocument;
  roleFrom: UserRole;
  roleTo: UserRole;
  mail: MailDelivery | null;
};

function roleAfter(decision: ProfessionalDecision, current: UserRole): UserRole {
  if (decision === 'verified') return current === 'user' ? 'professional' : current;
  return current === 'professional' ? 'user' : current;
}

async function tellApplicant(
  decision: ProfessionalDecision,
  applicant: User | null,
  licenceName: string,
  reason: string | null
): Promise<MailDelivery | null> {
  if (decision === 'suspended') return null;
  if (!applicant)
    return { delivered: false, deliveryError: 'The applicant no longer has an account' };
  const to = applicant.email;
  const name = licenceName || applicant.name || '';
  const message =
    decision === 'verified'
      ? verifiedEmail({ to, name })
      : reason
      ? rejectedEmail({ to, name, reason })
      : null;
  return message ? await deliverMail(message) : null;
}

export async function reviewProfessional(
  input: ReviewProfessionalInput
): Promise<ReviewProfessionalResult | null> {
  const { id, decision, reviewer, reason = null, ip = null } = input;
  const current = await findProfessionalById(id);
  if (!current) return null;
  const stated = reason?.trim() || null;
  if (decision !== 'verified' && !stated) {
    throw AppError.badRequest('A reason is required to reject or suspend an application');
  }
  if (current.user.equals(reviewer._id)) {
    throw AppError.forbidden('You cannot review your own application');
  }
  const applicant = await findUserById(current.user);
  const roleFrom = applicant?.role ?? 'user';
  let roleTo = roleAfter(decision, roleFrom);
  const decided = await updateProfessional(current._id, {
    status: decision,
    reviewedBy: reviewer._id,
    reviewedAt: new Date(),
    rejectionReason: decision === 'verified' ? null : stated,
  });
  if (!decided) return null;
  const application =
    decision === 'verified' ? (await publishPinnedAddresses(decided._id)) ?? decided : decided;
  const accountPatch: UserPatch = {};
  if (roleTo !== roleFrom) accountPatch.role = roleTo;
  if (decision === 'verified' && applicant?.name !== application.fullName) {
    accountPatch.name = application.fullName;
  }
  if (applicant && Object.keys(accountPatch).length > 0) {
    const saved = await saveProfessionalAccount(applicant._id, accountPatch);
    roleTo = saved?.role ?? roleTo;
  }
  const mail = await tellApplicant(decision, applicant, application.fullName, stated);
  await recordAudit({
    action: AUDIT_ACTION[decision],
    targetType: 'professional',
    targetId: application._id,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason: stated,
    metadata: {
      applicantId: current.user.toString(),
      applicantEmail: applicant?.email ?? null,
      licenseNumber: current.licenseNumber,
      licenseAuthority: current.licenseAuthority,
      roleFrom,
      roleTo,
      delivered: mail?.delivered ?? null,
    },
    ip,
  });
  return { application, roleFrom, roleTo, mail };
}
