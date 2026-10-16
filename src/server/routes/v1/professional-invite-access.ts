import type { Request, Response } from 'express';
import type { ProfessionalInviteRefusal } from '@shared/schemas';
import { readInvite } from '../../services/professional-inquiries.service';
import { AppError } from '../../utils/AppError';
import { failReason } from '../../utils/response';
import { actorOf } from './caller';

const refusals: Record<ProfessionalInviteRefusal, { status: number; error: string }> = {
  'not-found': { status: 404, error: 'That application link is not one of ours.' },
  withdrawn: { status: 410, error: 'That invitation was withdrawn. Please get in touch with us.' },
  used: { status: 410, error: 'That link has already been used to file an application.' },
  expired: { status: 410, error: 'That link has expired. Ask us for a new one.' },
};
export function tokenOf(req: Request): string | null {
  const token = req.params.token;
  return typeof token === 'string' && /^[a-f\d]{64}$/i.test(token) ? token : null;
}
export function refuseInvite(res: Response, reason: ProfessionalInviteRefusal): Response {
  const refusal = refusals[reason];
  return failReason(res, refusal.status, refusal.error, reason);
}
export async function ownedProfessionalInvite(req: Request) {
  const token = tokenOf(req);
  const result = token
    ? await readInvite(token)
    : { ok: false as const, reason: 'not-found' as const };
  if (!result.ok) {
    const refusal = refusals[result.reason];
    throw new AppError(refusal.status, refusal.error, result.reason);
  }
  if (actorOf(req).email.trim().toLowerCase() !== result.inquiry.email)
    throw AppError.forbidden(
      `This link was sent to ${result.inquiry.email}. Sign in with that address to continue.`,
      'invite-email-mismatch'
    );
  return result.inquiry;
}
