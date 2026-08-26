import { Router } from 'express';

import { optionalAuth } from '../../../middleware/optionalAuth';
import { requireAdmin } from '../../../middleware/requireAuth';
import { adminLimiter } from '../../../middleware/security';
import auditRoute from './audit.route';
import blogsRoute from './blogs.route';
import inquiriesRoute from './inquiries.route';
import metricsRoute from './metrics.route';
import professionalsRoute from './professionals.route';
import usersRoute from './users.route';

const router = Router();

/**
 * Everything under /admin, gated once here rather than per route.
 *
 * Order matters. The limiter runs first so a flood is refused before it costs a
 * database read — the two gates below both do one, which is exactly what an
 * unauthenticated flood would otherwise be paying for. Then `optionalAuth`
 * verifies the signature and annotates the request, and `requireAdmin` re-reads
 * the account so a demotion or a ban takes hold on the next request instead of
 * whenever the 15-minute token happens to expire.
 *
 * A single `use` also means a new admin route cannot be added unguarded: there is
 * no way to mount one below this line and accidentally leave it public.
 */
router.use(adminLimiter, optionalAuth, requireAdmin);

router.use('/audit', auditRoute);
router.use('/blogs', blogsRoute);
router.use('/inquiries', inquiriesRoute);
router.use('/metrics', metricsRoute);
router.use('/professionals', professionalsRoute);
router.use('/users', usersRoute);

export default router;
