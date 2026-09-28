import { userPreferencesUpdateSchema, type UserPreferencesUpdate } from '@shared/schemas';
import { Router } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { findUsersByIds, getPreferences, toPublicUser, updatePreferences } from '../../models';
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

export default router;
