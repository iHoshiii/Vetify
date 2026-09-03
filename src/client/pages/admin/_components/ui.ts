/**
 * The console's styling vocabulary, in one file.
 *
 * Every one of these was a string literal repeated across the admin pages — three
 * copies of the tab strip, two of the row action, four of the card frame — and they
 * had already drifted apart by a border colour and a padding step. A theme is not
 * something seventeen files can each hold an opinion about, so they import it.
 *
 * Two kinds of thing live here, and the split is the important part:
 *
 *  - **Class names**, for anything the browser paints from CSS. These name Tailwind
 *    utilities and are the whole of the visual language.
 *  - **Hex values**, under `CHART_*`, for anything handed to recharts. An SVG
 *    attribute cannot take a class, so those few colours are values — read off the
 *    same `forest` ramp in tailwind.config.ts rather than picked again by eye.
 *
 * The aesthetic, stated once so it is arguable: flat hairline borders instead of
 * shadows, one radius, standard padding, and colour reserved for the things a
 * reviewer acts on. No lift on hover, no glass, no gradients outside a chart fill —
 * a console is read for an hour at a time, and every effect is a tax on that.
 */

/* -------------------------------------------------------------------------- *
 * Surfaces
 * -------------------------------------------------------------------------- */

/** The page behind everything. Off-white with a green cast, not white. */
export const GROUND = 'bg-forest-50 text-slate-950';

/** The hairline every panel, table and divider is drawn with. */
export const HAIRLINE = 'border-forest-200';

/**
 * A panel: white, one hairline, one radius.
 *
 * `FRAME` is the bare box, for something that brings its own padding — a table that
 * must run edge to edge. `CARD` is the same box with the standard inset, for content
 * that does not.
 */
export const FRAME = 'rounded-lg border border-forest-200 bg-white';
export const CARD = `${FRAME} p-5`;

/** The wash under a table header, and behind a hovered row. */
export const HEADER_WASH = 'bg-forest-50';
export const ROW_HOVER = 'hover:bg-forest-50';

/* -------------------------------------------------------------------------- *
 * Type
 * -------------------------------------------------------------------------- */

/** A section heading, and the smaller one a panel carries. */
export const HEADING = 'text-lg font-bold tracking-tight text-forest-900';
export const PANEL_HEADING = 'text-sm font-bold tracking-tight text-forest-900';

/** The line under a heading that says what the screen is for. */
export const LEDE = 'text-sm leading-6 text-slate-600';

/**
 * A column header, or the label above a figure.
 *
 * slate-600 rather than slate-500: on the off-white ground slate-500 measures 4.4:1,
 * which is under the floor for text this size. On a white card it would pass, but one
 * label colour that is legible everywhere beats two that differ by where they sit.
 */
export const LABEL = 'text-xs font-bold uppercase tracking-wider text-slate-600';

/** Secondary text inside a panel — hints, counts, the range line under a table. */
export const MUTED = 'text-xs font-semibold text-slate-600';

/* -------------------------------------------------------------------------- *
 * Controls
 * -------------------------------------------------------------------------- */

/**
 * The primary control: white on deep forest.
 *
 * 9.2:1, so it carries small bold type. No shadow and no transform — the fill is
 * already the strongest thing on the screen, and a button that moves under the
 * cursor makes a form feel unserious.
 */
export const BUTTON =
  'inline-flex items-center justify-center rounded-md bg-forest-700 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/** The same, at the size a table row can spare. */
export const BUTTON_SM =
  'inline-flex items-center justify-center rounded-md bg-forest-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2';

/** An outlined control, for the actions a row offers several of at once. */
export const ACTION =
  'inline-flex items-center justify-center rounded-md border border-forest-200 bg-white px-2.5 py-1 text-xs font-bold text-forest-700 transition-colors hover:border-forest-400 hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-1';

/**
 * The same outline, in red, for the one that takes something away.
 *
 * A border and a word rather than a filled red button: on a row offering three
 * choices, a solid red one is the thing the eye lands on first, which is the wrong
 * emphasis for the action nobody should reach by accident.
 */
export const ACTION_DANGER =
  'inline-flex items-center justify-center rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 transition-colors hover:border-rose-400 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-1';

/** Text inputs and selects, so a filter row lines up without measuring. */
export const CONTROL =
  'rounded-md border border-forest-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700';

/** Paging, and anything else that is a control only while it is enabled. */
export const PAGE_BUTTON =
  'rounded-md border border-forest-200 bg-white px-3 py-1.5 text-xs font-bold text-forest-700 transition-colors hover:bg-forest-50 disabled:cursor-not-allowed disabled:border-forest-100 disabled:text-slate-400 disabled:hover:bg-white';

/* -------------------------------------------------------------------------- *
 * Tabs and sections
 * -------------------------------------------------------------------------- */

/**
 * The tab strip: a bordered rail whose tabs share the width between them.
 *
 * Content-width tabs left a console's worth of empty rail to the right of them,
 * which reads as an unfinished component rather than as breathing room. `flex-1`
 * with a `basis` floor spends it: every tab is at least as wide as its label and
 * they divide whatever is left equally, so the strip ends where the table below it
 * ends.
 *
 * Under `sm` the rail scrolls sideways instead, because five equal columns on a
 * phone is five unreadable ones.
 */
export const TAB_RAIL =
  'flex gap-1 overflow-x-auto rounded-lg border border-forest-200 bg-white p-1';
export const TAB_ITEM = 'shrink-0 sm:flex-1 sm:shrink';
export const TAB =
  'block rounded-md px-3 py-2 text-center text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700';
export const TAB_ON = 'bg-forest-800 text-white';
export const TAB_OFF = 'text-slate-600 hover:bg-forest-50 hover:text-forest-800';

/**
 * The count on a tab, for a queue with something in it.
 *
 * Amber on the idle tab and a light wash on the active one: on deep forest, amber
 * clears 3:1 but the badge stops reading as part of the selected tab, and the number
 * matters less once you are looking at the queue it counts.
 */
export const TAB_BADGE = 'ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold';
export const TAB_BADGE_ON = 'bg-white/20 text-white';
export const TAB_BADGE_OFF = 'bg-amber-100 text-amber-900';

// Three digits would widen the badge enough to wrap the label beside it.
export function badgeOf(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** The smaller strip a chart or a window control uses, sized to its content. */
export const CHIP = 'rounded-md px-3 py-1.5 text-xs font-bold transition-colors';
export const CHIP_ON = 'bg-forest-800 text-white';
export const CHIP_OFF = 'text-slate-600 hover:bg-forest-100 hover:text-forest-800';
