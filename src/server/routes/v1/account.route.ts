import {
  accountProfileUpdateSchema,
  passwordChangeSchema,
  userPreferencesUpdateSchema,
  type AccountProfileUpdate,
  type PasswordChange,
  type UserPreferencesUpdate,
} from '@shared/schemas';
import { Router } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import {
  comparePassword,
  findUsersByIds,
  findUserWithPasswordById,
  getPreferences,
  revokeAllRefreshTokensForUser,
  toPublicUser,
  updatePreferences,
  updateUser,
  updateUserPassword,
  type UserPatch,
} from '../../models';
import { fail, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

const router = Router();

// Preferences belong to one account, so the gate is on the router and every read and write is scoped to the caller.
router.use(optionalAuth, signedIn);

const MISSING = 'Account not found';

// GET /preferences — the caller's own notification and privacy settings.
router.get('/preferences', async (req, res) => {
  const preferences = await getPreferences(actorOf(req)._id);
  if (!preferences) return fail(res, 404, MISSING);
  ok(res, { preferences });
});

// PATCH /preferences — replace one or both sections and return the whole updated settings.
router.patch('/preferences', validate(userPreferencesUpdateSchema), async (req, res) => {
  const patch = req.body as UserPreferencesUpdate;
  const preferences = await updatePreferences(actorOf(req)._id, patch);
  if (!preferences) return fail(res, 404, MISSING);
  ok(res, { preferences });
});

// GET /blocked — the accounts on the caller's block list, resolved to names the client can show.
router.get('/blocked', async (req, res) => {
  const preferences = await getPreferences(actorOf(req)._id);
  if (!preferences) return fail(res, 404, MISSING);
  const blocked = await findUsersByIds(preferences.privacy.blockedUserIds);
  ok(res, { blocked: blocked.map(toPublicUser) });
});

// PATCH /profile — edit the caller's own name and avatar, returning the refreshed public account.
router.patch('/profile', validate(accountProfileUpdateSchema), async (req, res) => {
  const patch = req.body as AccountProfileUpdate;
  const fields: UserPatch = {};
  if (patch.name !== undefined) fields.name = patch.name;
  if (patch.avatarUrl !== undefined) fields.avatarUrl = patch.avatarUrl;
  const user = await updateUser(actorOf(req)._id, fields);
  if (!user) return fail(res, 404, MISSING);
  ok(res, { user: toPublicUser(user) });
});

// POST /password — change the password after proving the current one; provider accounts have none to change.
router.post('/password', validate(passwordChangeSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body as PasswordChange;
  const account = await findUserWithPasswordById(actorOf(req)._id);
  if (!account) return fail(res, 404, MISSING);
  if (!account.password)
    return fail(
      res,
      400,
      'This account signs in through a provider, so it has no password to change.'
    );
  const matches = await comparePassword(account.password, currentPassword);
  if (!matches) return fail(res, 400, 'Your current password is not correct.');
  await updateUserPassword(account._id, newPassword);
  // a new password must end every existing session so a stolen refresh token cannot outlive the change
  await revokeAllRefreshTokensForUser(account._id);
  ok(res, { changed: true });
});

export default router;
