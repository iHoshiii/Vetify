import { Router } from 'express';
import {
  accountDeactivationSchema,
  passwordChangeSchema,
  type AccountDeactivation,
  type PasswordChange,
} from '@shared/schemas';
import { validate } from '../../middleware/validate';
import {
  comparePassword,
  findUserWithPasswordById,
  revokeAllRefreshTokensForUser,
  updateUserPassword,
} from '../../models';
import { disconnectUserSessions } from '../../realtime/hub';
import { saveAccountChange } from '../../models/users/account-change';
import { fail, ok } from '../../utils/response';
import { actorOf } from './caller';

const router = Router();

router.post('/password', validate(passwordChangeSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body as PasswordChange;
  const account = await findUserWithPasswordById(actorOf(req)._id);
  if (!account) return fail(res, 404, 'Account not found');
  if (!account.password)
    return fail(
      res,
      400,
      'This account signs in through a provider, so it has no password to change.'
    );
  if (!(await comparePassword(account.password, currentPassword)))
    return fail(res, 400, 'Your current password is not correct.');
  const version = await updateUserPassword(account._id, newPassword);
  if (version === null) return fail(res, 404, 'Account not found');
  disconnectUserSessions(account._id.toString(), version);
  await revokeAllRefreshTokensForUser(account._id, version).catch((error) => {
    console.error('[account] old session cleanup failed', error);
  });
  ok(res, { changed: true });
});

router.post('/deactivate', validate(accountDeactivationSchema), async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as AccountDeactivation;
  const account = await findUserWithPasswordById(actor._id);
  if (!account) return fail(res, 404, 'Account not found');
  if (account.password || actor.provider === 'local') {
    if (!account.password || !body.currentPassword)
      return fail(res, 400, 'Enter your current password');
    if (!(await comparePassword(account.password, body.currentPassword)))
      return fail(res, 400, 'Your current password is not correct.');
  }
  const restricted = await saveAccountChange(
    actor._id,
    {
      status: 'deactivated',
      statusReason: 'Deactivated by account owner',
      statusChangedBy: actor._id,
      statusChangedAt: new Date(),
      statusUntil: null,
    },
    true
  );
  if (!restricted) return fail(res, 404, 'Account not found');
  disconnectUserSessions(actor._id.toString(), restricted.sessionVersion ?? 0);
  await revokeAllRefreshTokensForUser(actor._id, restricted.sessionVersion ?? 0).catch((error) => {
    console.error('[account] deactivated session cleanup failed', error);
  });
  ok(res, { deactivated: true });
});

export default router;
