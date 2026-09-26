import { Router } from 'express';

import { getOsmClinics } from '../../services/osm-clinics.service';
import { ok } from '../../utils/response';

const router = Router();

router.get('/', async (_req, res) => {
  const clinics = await getOsmClinics();
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
  ok(res, clinics);
});

export default router;
