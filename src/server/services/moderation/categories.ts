import {
  MODERATION_CATEGORIES,
  MODERATION_OUTCOMES,
  type ModerationCategory,
  type ModerationOutcome,
} from '@shared/schemas';

/**
 * The screening vocabulary lives in @shared/schemas, because the queue renders
 * these strings and the list the server may write has to be the list the
 * dashboard can label. Re-exported here so the rest of this folder reads as one
 * module rather than reaching across the tree for its own words.
 */
export { MODERATION_CATEGORIES, MODERATION_OUTCOMES };
export type { ModerationCategory, ModerationOutcome };

/** A screening result, before it is stamped and stored on the post. */
export type ModerationVerdict = {
  outcome: ModerationOutcome;
  categories: ModerationCategory[];
  /** 0 to 1, worst category wins. Orders the review queue. */
  severity: number;
  /** The literal terms the wordlist matched, so a reviewer sees the trigger. */
  terms: string[];
  /** One line of explanation, from the model or from the failure. */
  notes: string | null;
  /** Which model answered, or null when no model was reached. */
  model: string | null;
};

/** Whether this verdict holds the post back. Anything but a clean pass does. */
export function isFlagged(verdict: ModerationVerdict): boolean {
  return verdict.outcome !== 'clean';
}
