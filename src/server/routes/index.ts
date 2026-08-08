import { Router } from 'express';

import v1Routes from './v1';

const router = Router();

// Versioned from the start, so a breaking change can ship as /api/v2 without
// forcing every client to move at once.
router.use('/v1', v1Routes);

export default router;
