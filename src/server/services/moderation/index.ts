import { GoogleGenAI, Type } from '@google/genai';

import { env, isTest } from '../../config/env';
import type { BlogModeration } from '../../models';
import {
  MODERATION_CATEGORIES,
  type ModerationCategory,
  type ModerationVerdict,
} from './categories';
import { fetchCoverImage } from './image';
import { scanText } from './wordlist';

export { isFlagged, MODERATION_CATEGORIES } from './categories';
export type { ModerationCategory, ModerationOutcome, ModerationVerdict } from './categories';

/**
 * A verdict as the document stores it: the screening result, when it was taken,
 * and room for the human decision that has not happened yet.
 */
export function toBlogModeration(verdict: ModerationVerdict): BlogModeration {
  return { ...verdict, checkedAt: new Date(), reviewedBy: null, reviewedAt: null };
}

/**
 * Long enough for a flash model to answer, short enough that publishing does not
 * feel broken. Exceeding it is an 'unavailable' verdict, which holds the post.
 */
const TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT =
  'You screen posts for a veterinary blog before publication. Decide whether a human moderator ' +
  'must review this post before readers see it.\n\n' +
  'Flag it when the text or the image contains: nudity or sexually explicit material; slurs or ' +
  'hate directed at a group; harassment or threats against a person; graphic violence, including ' +
  'animal cruelty presented approvingly; encouragement of self-harm; or the sale of prescription ' +
  'medicines or anything else illegal.\n\n' +
  'Do NOT flag: clinical description of animal anatomy, injury, disease, parasites, wounds, ' +
  'surgery, euthanasia, birth or death. This is a veterinary publication, so frank medical detail ' +
  'and distressing-but-educational photographs are the normal content of it, not a violation. ' +
  'Blunt language about a difficult subject is not harassment.\n\n' +
  'severity is your confidence that a moderator must act, from 0 to 1. Use categories only from ' +
  'the enum. notes is one sentence, addressed to the moderator, naming what you saw.';

/** The verdict shape the model must answer in, so the reply is parsed and never
 * scraped out of prose. */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    flagged: { type: Type.BOOLEAN },
    categories: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: [...MODERATION_CATEGORIES] },
    },
    severity: { type: Type.NUMBER },
    notes: { type: Type.STRING },
  },
  required: ['flagged', 'categories', 'severity', 'notes'],
} as const;

const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export type ScreenPostInput = {
  title: string;
  excerpt: string;
  body: string;
  tags?: string[] | null;
  coverUrl?: string | null;
};

function verdict(
  partial: Partial<ModerationVerdict> & Pick<ModerationVerdict, 'outcome'>
): ModerationVerdict {
  return {
    categories: [],
    severity: 0,
    terms: [],
    notes: null,
    model: null,
    ...partial,
  };
}

/** Everything a reader would see, as one string for the wordlist. */
function writingOf(input: ScreenPostInput): string {
  return [input.title, input.excerpt, input.body, ...(input.tags ?? [])].join('\n');
}

/** Only the categories this codebase has a name for, so an unexpected label from
 * a model cannot end up rendered as a chip nobody can interpret. */
function knownCategories(values: unknown): ModerationCategory[] {
  if (!Array.isArray(values)) return [];

  return [...new Set(values)].filter((value): value is ModerationCategory =>
    (MODERATION_CATEGORIES as readonly unknown[]).includes(value)
  );
}

function clamped(value: unknown): number {
  const severity = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(0, Math.round(severity * 100) / 100));
}

/**
 * Asks the model, with the cover image attached when there is one.
 *
 * Throws on anything that is not a parsed verdict — an unreachable model, a
 * timeout, a reply that is not the schema — because the caller turns every one of
 * those into the same 'unavailable', and telling them apart here would only be
 * detail nobody acts on differently.
 */
async function askModel(
  input: ScreenPostInput,
  image: Awaited<ReturnType<typeof fetchCoverImage>>
) {
  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
    { text: `TITLE: ${input.title}\n\nEXCERPT: ${input.excerpt}\n\nBODY:\n${input.body}` },
  ];

  if (image) parts.push({ inlineData: image });

  const response = await client.models.generateContent({
    model: env.GEMINI_MODERATION_MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // Zero, because the same post screened twice should not get two answers.
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  return JSON.parse(response.text ?? '') as Record<string, unknown>;
}

/**
 * Screens a post that is about to become publicly readable.
 *
 * Two passes, cheapest first. The wordlist is deterministic and free, so an
 * unambiguous term returns without a network call at all — which also means the
 * obvious cases keep being caught on a day the model is down. Everything subtler
 * goes to the model, with the cover image attached, since "nudity" is mostly a
 * question about a picture.
 *
 * Never throws. A post that could not be screened comes back 'unavailable' rather
 * than clean, and the caller holds it: publishing the one post nobody managed to
 * look at is the opposite of what a screen is for. That is the deliberate cost -
 * while the model is unreachable, new posts queue for review instead of going
 * live.
 */
export async function screenPost(input: ScreenPostInput): Promise<ModerationVerdict> {
  const hit = scanText(writingOf(input));

  if (hit.severity > 0) {
    return verdict({
      outcome: 'flagged',
      categories: hit.categories,
      severity: hit.severity,
      terms: hit.terms,
      notes: `Matched a blocked term: ${hit.terms.join(', ')}.`,
    });
  }

  // The suite runs offline and has to be deterministic, so the model half is not
  // exercised here. The wordlist above is: it is the part with the branch that
  // matters, and it needs nothing but a string.
  if (isTest) return verdict({ outcome: 'clean' });

  const image = input.coverUrl ? await fetchCoverImage(input.coverUrl) : null;

  if (input.coverUrl && !image) {
    return verdict({
      outcome: 'unavailable',
      notes: 'The cover image could not be read, so it has not been screened.',
    });
  }

  try {
    const answer = await askModel(input, image);
    const flagged = answer.flagged === true;

    return verdict({
      outcome: flagged ? 'flagged' : 'clean',
      categories: flagged ? knownCategories(answer.categories) : [],
      severity: flagged ? clamped(answer.severity) : 0,
      notes: typeof answer.notes === 'string' && answer.notes.trim() ? answer.notes.trim() : null,
      model: env.GEMINI_MODERATION_MODEL,
    });
  } catch (err) {
    console.error('[moderation] screening failed:', err);

    return verdict({
      outcome: 'unavailable',
      notes: 'The automatic check could not be completed, so this post has not been screened.',
    });
  }
}
