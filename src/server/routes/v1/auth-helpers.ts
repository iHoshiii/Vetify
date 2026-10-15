import type { Request, Response } from 'express';
import { env } from '../../config/env';
import {
  currentStatus,
  type BlockedStatus,
  type StatusState,
} from '../../services/user-status.service';

export async function accountBlockReason(account: StatusState): Promise<BlockedStatus | null> {
  const status = await currentStatus(account);
  return status === 'active' ? null : status;
}

export function readRefreshCookie(req: Request): string | undefined {
  const jar = req.cookies as Record<string, string> | undefined;
  return jar?.[env.REFRESH_COOKIE_NAME] ?? jar?.refresh_token;
}

export function redirectWithError(res: Response, reason: string, signup = false): void {
  const url = new URL(env.OAUTH_FAILURE_REDIRECT);
  if (signup) url.pathname = '/signup';
  url.searchParams.set('error', 'oauth');
  url.searchParams.set('reason', reason);
  res.redirect(url.toString());
}
