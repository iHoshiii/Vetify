import {
  metricsBreakdownQuerySchema,
  metricsOverviewQuerySchema,
  metricsTimeseriesQuerySchema,
  type MetricsBreakdownQuery,
  type MetricsOverviewQuery,
  type MetricsTimeseriesQuery,
} from '@shared/schemas';
import { Router } from 'express';

import { validateQuery } from '../../../middleware/validate';
import {
  metricsBreakdown,
  metricsOverview,
  metricsTimeseries,
} from '../../../services/metrics.service';
import { ok } from '../../../utils/response';

const router = Router();

/**
 * The dashboard's charts. Read-only, like the audit route and for a plainer
 * reason: there is nothing here to write. Every number is counted from a
 * collection that some other route is responsible for.
 *
 * All three answers are cached for a minute inside the service, so a dashboard
 * left open does not re-scan the collections on every poll. Nothing here decides
 * anything — a count that is up to sixty seconds stale is a chart, whereas the
 * pages that act on a specific row read it fresh.
 */

/**
 * GET /api/v1/admin/metrics/overview
 *
 * The stat cards: all-time totals, plus each series over the last `?days` against
 * the `days` before it. One request rather than one per card, because the cards
 * are read together and a dozen round trips to draw one row is not a design.
 */
router.get('/overview', validateQuery(metricsOverviewQuerySchema), async (req, res) => {
  const query = req.validatedQuery as MetricsOverviewQuery;

  ok(res, await metricsOverview(query.days));
});

/**
 * GET /api/v1/admin/metrics/timeseries?metric=&days=
 *
 * One line, one point per day, empty days included. `metric` and `days` are both
 * bounded by the schema — the window cannot reach past the retention of the events
 * behind it, so a chart never claims silence where there is simply no record.
 */
router.get('/timeseries', validateQuery(metricsTimeseriesQuerySchema), async (req, res) => {
  const query = req.validatedQuery as MetricsTimeseriesQuery;

  ok(res, await metricsTimeseries(query.metric, query.days));
});

/**
 * GET /api/v1/admin/metrics/breakdown?dimension=&role=
 *
 * How the accounts, posts or applications divide by one field, largest slice
 * first. No window: this is the shape of what exists, which is the question a
 * donut answers.
 *
 * `role` narrows the three account breakdowns to one role, so a tab showing only
 * users can print a status split of users rather than of every account. The
 * schema refuses it on the other two dimensions instead of ignoring it.
 */
router.get('/breakdown', validateQuery(metricsBreakdownQuerySchema), async (req, res) => {
  const query = req.validatedQuery as MetricsBreakdownQuery;

  ok(res, await metricsBreakdown(query.dimension, query.role));
});

export default router;
