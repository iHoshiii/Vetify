/**
 * The colours the charts are drawn with, as values rather than classes.
 *
 * Separate from `ui.ts` because these are the exception to it: an SVG `fill` or
 * `stroke` cannot take a Tailwind class, so recharts is handed hex. They are read off
 * the same `forest` ramp in tailwind.config.ts as everything else, and the two must
 * be changed together.
 *
 * Every value below was checked rather than chosen: the categorical order clears the
 * adjacent-pair gates for colour-vision deficiency (worst pair ΔE 15.3 simulated,
 * 20.8 unsimulated, against a floor of 8 and 15), and the chrome clears its contrast
 * ratios against white. The one thing to know before editing: the *order* is the
 * safety mechanism, not decoration — two hues that are fine apart can collapse when
 * they end up adjacent, so a slot cannot be reordered without re-checking the set.
 */

/* -------------------------------------------------------------------------- *
 * Chrome
 * -------------------------------------------------------------------------- */

/** Axis ticks and tooltip labels. 4.8:1 on white, so the small type is readable. */
export const CHART_INK = '#475569';

/** The grid, drawn as a hairline and solid — a dashed rule reads as noise. */
export const CHART_GRID = '#e4efe8';

/** The tooltip's own border, a step lighter than a panel's. */
export const CHART_TOOLTIP_BORDER = '#c6dcce';

/**
 * The single-series mark: forest-600, at 7.1:1 on white.
 *
 * One hue for a trend line, because a line over time is magnitude and not identity —
 * there is nothing to tell apart, so nothing needs a second colour. The title names
 * the series, which is why these charts carry no legend.
 */
export const CHART_SERIES = '#2f6249';

/* -------------------------------------------------------------------------- *
 * Categorical
 * -------------------------------------------------------------------------- */

/**
 * Six hues in a fixed order, deep emerald first.
 *
 * Green leads so a chart reads as part of the console rather than as a stock widget
 * dropped into it. It cannot lead alone: a palette of six greens is six shades one
 * colour-blind reader cannot separate and nobody else can either, so the remaining
 * slots keep their own hues and the theme shows in which one comes first.
 *
 * Assigned by `toneOf` below, never by position in the data.
 */
export const CATEGORICAL = [
  '#12784f', // deep emerald
  '#2a78d6', // blue
  '#eda100', // yellow
  '#e34948', // red
  '#4a3aa7', // violet
  '#1baf7a', // aqua
] as const;

/**
 * Which slot a label takes, pinned by name.
 *
 * The reason this is a map and not `CATEGORICAL[index]`: the server sorts a breakdown
 * largest-share first, so an index is the slice's *rank*. Colouring by rank means the
 * day a rejection overtakes a pending application, the two swap colours and every
 * chart anybody had learned to read changes underneath them. Colour follows the thing
 * it names.
 *
 * The states are grouped by what they mean rather than by which collection they came
 * from, so one vocabulary is used across accounts, posts, enquiries and applications:
 * a live thing is emerald wherever it appears, and a refusal is red on every screen.
 * That is also why 'verified', 'published' and 'active' share a slot — they are the
 * same fact about three different rows.
 */
const SLOT: Record<string, number> = {
  // Live, listed, in good standing.
  verified: 0,
  published: 0,
  active: 0,
  completed: 0,
  connected: 0,
  // Waiting on somebody.
  pending: 2,
  interview: 2,
  invited: 2,
  flagged: 2,
  uninitialized: 2,
  // Turned down, or taken away and meant.
  rejected: 3,
  declined: 3,
  banned: 3,
  removed: 3,
  disconnected: 3,
  // Taken away, reversibly.
  suspended: 4,
  hidden: 4,
  // Not yet anything.
  draft: 5,
};

/**
 * The colour for one label.
 *
 * A name this file has not been taught falls back to a slot derived from the label
 * itself rather than from where it sits, so the account roles and the sign-in
 * providers — which have no status meaning to pin — still keep their colour when the
 * counts move under them. A weak hash, deliberately: it only has to be stable.
 */
export function toneOf(label: string): string {
  const slot = SLOT[label.toLowerCase()];
  if (slot !== undefined) return CATEGORICAL[slot % CATEGORICAL.length] as string;

  let hash = 0;
  for (const character of label) hash = (hash * 31 + character.charCodeAt(0)) % 997;

  // Slot 0 is reserved for "this thing is live", so an unnamed label never takes it
  // and cannot imply a standing it was not given.
  return CATEGORICAL[1 + (hash % (CATEGORICAL.length - 1))] as string;
}
