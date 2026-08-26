import { escapeRegex } from '../../models/text-search';

import type { ModerationCategory } from './categories';

/**
 * The deterministic half of the screen.
 *
 * It runs first, costs nothing, and needs no network, so the obvious cases never
 * depend on a model being reachable. Everything here is a term that on its own
 * justifies holding a post back for a human, which is why there is no mild-swearing
 * tier: a starter list that held every post saying "damn" would teach an admin to
 * clear the queue without reading it.
 *
 * A starter list on purpose. It is meant to be extended in place, and the shape
 * below — term, category, severity — is the whole contract for doing so.
 */
type Rule = { term: string; category: ModerationCategory; severity: number };

const RULES: Rule[] = [
  // Slurs. Highest severity in the list: there is no context on a pet-care blog
  // that makes one of these a false positive worth softening for.
  { term: 'nigger', category: 'slur', severity: 0.97 },
  { term: 'faggot', category: 'slur', severity: 0.97 },
  { term: 'tranny', category: 'slur', severity: 0.95 },
  { term: 'chink', category: 'slur', severity: 0.95 },
  { term: 'spic', category: 'slur', severity: 0.95 },
  { term: 'kike', category: 'slur', severity: 0.95 },
  { term: 'retard', category: 'harassment', severity: 0.7 },
  // Explicit sexual content, including the words used to advertise it.
  { term: 'porn', category: 'sexual', severity: 0.8 },
  { term: 'pornhub', category: 'sexual', severity: 0.85 },
  { term: 'onlyfans', category: 'sexual', severity: 0.7 },
  { term: 'blowjob', category: 'sexual', severity: 0.85 },
  { term: 'creampie', category: 'sexual', severity: 0.85 },
  { term: 'cumshot', category: 'sexual', severity: 0.85 },
  { term: 'bestiality', category: 'sexual', severity: 0.99 },
  { term: 'zoophilia', category: 'sexual', severity: 0.99 },
  // Nudity, as described in text. The cover image is screened separately.
  { term: 'nudes', category: 'nudity', severity: 0.75 },
  { term: 'nsfw', category: 'nudity', severity: 0.65 },
  { term: 'topless', category: 'nudity', severity: 0.65 },
  // Threats and incitement.
  { term: 'kill yourself', category: 'self-harm', severity: 0.9 },
  { term: 'kys', category: 'self-harm', severity: 0.8 },
  { term: 'gas the', category: 'hate', severity: 0.95 },
  // Illegal trade, which on this site would be the medicines.
  { term: 'buy xanax', category: 'illegal', severity: 0.8 },
  { term: 'without prescription', category: 'illegal', severity: 0.6 },
];

/**
 * Letters people substitute to get a term past a naive filter.
 *
 * Applied to the text being searched, never to the rules, so a substitution can
 * only ever turn a disguised banned term into a matched one. It cannot invent a
 * match for a term the list does not contain.
 */
const SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[013457@$!]/g, (character) => SUBSTITUTIONS[character] ?? character)
      // Collapse every run of a repeated character to one, so 'niiiigger' reads as
      // the term it is. Applied to the rules as well as to the text, because
      // collapsing only one side would stop 'faggot' matching itself.
      .replace(/(.)\1+/g, '$1')
  );
}

/**
 * Word-boundary matching, which is what keeps Scunthorpe out of the queue: 'spic'
 * does not fire inside 'suspicious'. A multi-word term keeps its spaces and is
 * matched the same way.
 */
const BOUNDARY = String.raw`\b`;

const MATCHERS: (Rule & { pattern: RegExp })[] = RULES.map((rule) => ({
  ...rule,
  // String.raw so the boundary is a backslash-b and not a backspace: a plain
  // template would turn `\\b` into a control character and match nothing.
  pattern: new RegExp(BOUNDARY + escapeRegex(normalize(rule.term)) + BOUNDARY, 'i'),
}));

export type WordlistHit = {
  terms: string[];
  categories: ModerationCategory[];
  /** The worst single term found. Zero when nothing matched. */
  severity: number;
};

/**
 * Every rule the text trips, worst first.
 *
 * Returns the terms as well as the categories because a reviewer deciding whether
 * this is a false positive needs to see the actual word, not a label describing
 * the kind of word it was.
 */
export function scanText(text: string): WordlistHit {
  const haystack = normalize(text);
  const hits = MATCHERS.filter((matcher) => matcher.pattern.test(haystack)).sort(
    (first, second) => second.severity - first.severity
  );

  return {
    terms: hits.map((hit) => hit.term),
    categories: [...new Set(hits.map((hit) => hit.category))],
    severity: hits[0]?.severity ?? 0,
  };
}
