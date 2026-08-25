import type { Document } from 'mongodb';

/** One bar or one point on a chart: a day, and how many of something it held. */
export type DailyCount = {
  /** ISO calendar day, 'YYYY-MM-DD'. */
  date: string;
  count: number;
};

/**
 * The stages that turn any dated collection into one row per day.
 *
 * Shared because the bucketing rule has to be the same for every line on the
 * chart: two series bucketed on different day boundaries would be drawn against
 * one x-axis and quietly disagree about when yesterday ended.
 *
 * Days are UTC. Not a stance on where the reader lives — it is that the boundary
 * has to be fixed somewhere, and a server-local one would redraw history the day
 * the app moves region.
 *
 * Days with nothing in them are absent here rather than zero: an aggregation can
 * only group what exists. Filling the gaps is the caller's job, and skipping it
 * draws a chart that reads as "no data" where it means "none that day".
 */
export function dailyCountStages(field: string): Document[] {
  return [
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: 'UTC' } },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, date: '$_id', count: 1 } },
    { $sort: { date: 1 } },
  ];
}
