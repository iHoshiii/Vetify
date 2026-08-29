import type { ProfessionalInquiry } from '@shared/schemas';

/**
 * The automatic first pass over a professional enquiry.
 *
 * Two rules, one per half of the policy: an enquiry that gives no licence number,
 * and one whose own words say the writer is not a registered veterinarian. Both are
 * deterministic and quotable — there is no model call here, and there should not be.
 * A refusal has to be explainable to the person it was applied to, months later, by
 * somebody who did not write it.
 *
 * The property that makes an automatic refusal acceptable at all: **the screen fires
 * only on a positive signal**. There is deliberately no veterinary-vocabulary floor,
 * so a licensed vet who writes three terse sentences without saying "clinic" is not
 * turned away for it — everything the rules below do not catch reaches a human. The
 * patterns are first-person-scoped for the same reason: "I report vets practising
 * without a licence" is a vet, and a bare "without a licence" match would refuse
 * them.
 *
 * The way back is open by construction. An automatic decline nulls openEmail like any
 * other, so the same address may write in again immediately, and the decline email
 * already says so and points at support.
 */
export const INQUIRY_SCREEN_RULES = ['no-licence', 'not-licensed'] as const;
export type InquiryScreenRule = (typeof INQUIRY_SCREEN_RULES)[number];

export type InquiryRefusal = {
  /** Which rule fired. Named, because a rule nobody can name is one nobody can fix. */
  rule: InquiryScreenRule;
  /**
   * What goes on the record, written for the reviewer who reads the queue later and
   * not for the applicant — who is told only that the enquiry went no further,
   * exactly as a reviewer's own decline tells them.
   */
  detail: string;
};

/**
 * What the screen reads. Two fields rather than the whole enquiry, so the signature
 * says what a refusal can possibly have been based on.
 */
export type ScreenableInquiry = Pick<ProfessionalInquiry, 'licenseNumber' | 'motivation'>;

/**
 * What people type into a required field when they have no licence to put in it.
 *
 * Matched whole, after normalising, so a real licence that happens to contain one of
 * these as a substring is untouched.
 */
const NON_ANSWERS = new Set([
  '-',
  '--',
  '.',
  '0',
  'APPLYING',
  'ASAP',
  'IN PROCESS',
  'N.A.',
  'N/A',
  'NA',
  'NIL',
  'NO',
  'NO LICENCE',
  'NO LICENCE YET',
  'NO LICENSE',
  'NO LICENSE YET',
  'NONE',
  'NOT YET',
  'NOTHING',
  'NULL',
  'ON PROCESS',
  'PENDING',
  'PROCESSING',
  'SOON',
  'TBA',
  'TBD',
  'TO FOLLOW',
  'UNKNOWN',
  'WILL FOLLOW',
  'X',
  'XX',
  'XXX',
]);

/** A PRC registration is six or seven digits, so three or fewer is not one. */
const LICENCE_DIGITS_MIN = 4;

/** One digit repeated: 0000000, 1111111. */
const ONE_DIGIT_REPEATED = /^(\d)\1+$/;

const ASCENDING = '01234567890';
const DESCENDING = '09876543210';

/**
 * The licence half.
 *
 * The field cleared the schema's three-character floor, which nearly anything does;
 * this is what asks whether what cleared it is a licence number. Uppercased and
 * space-collapsed here as well as by the schema, so the function is total for a
 * caller that has not been through Zod — a test, or a later importer.
 */
function noLicence(value: string): InquiryRefusal | null {
  const licence = value.trim().toUpperCase().replace(/\s+/g, ' ');
  const digits = licence.replace(/\D/g, '');

  const detail =
    licence === '' || NON_ANSWERS.has(licence)
      ? 'no licence number was given'
      : digits.length < LICENCE_DIGITS_MIN
      ? 'the licence number given has no registration number in it'
      : ONE_DIGIT_REPEATED.test(digits) || ASCENDING.includes(digits) || DESCENDING.includes(digits)
      ? 'the licence number given is filler'
      : null;

  // The value is quoted into the reason, because the reviewer's first question about
  // an automatic refusal is what the applicant actually typed.
  return detail ? { rule: 'no-licence', detail: `${detail} (${JSON.stringify(value)})` } : null;
}

/**
 * A first-person claim, which is what nearly every pattern below needs.
 *
 * Scoping to the writer talking about themselves is the difference between catching
 * "I am a groomer" and refusing the vet who wrote "I work alongside groomers".
 */
const I_AM = String.raw`\bi(?:'m|\s+am|\s+work\s+as|\s+am\s+working\s+as)\s+(?:an?\s+)?`;

/** An optional "vet"/"veterinary" in front of a job title. */
const VET = String.raw`(?:vet(?:erinary)?\s+)?`;

/** An optional qualifier in front of "exam". */
const EXAM = String.raw`(?:prc\s+|licensure\s+|board\s+|licen[sc]ing\s+)?exam`;

/**
 * Statements that the writer is not a registered veterinarian, each with the words to
 * put on the record when it fires.
 *
 * Phrases, never bare words. A pattern on "student" alone would refuse the vet who
 * wrote "studying new treatments for feline diabetes", and one on "assistant" alone
 * would refuse the vet whose assistant handles their bookings.
 */
const NOT_LICENSED: { pattern: RegExp; says: string }[] = [
  {
    pattern: new RegExp(String.raw`\bi(?:'m|\s+am)\s+not\s+(?:yet\s+)?(?:a\s+)?licen[sc]ed\b`),
    says: 'says they are not licensed',
  },
  { pattern: /\bnot yet licen[sc]ed\b/, says: 'says they are not licensed yet' },
  { pattern: /\bunlicen[sc]ed\b/, says: 'says they are unlicensed' },
  {
    pattern: new RegExp(
      String.raw`\bi\s+(?:have|hold)\s+no\s+(?:prc\s+)?licen[sc]e\b|\bi\s+(?:do\s+not|don't)\s+(?:have|hold)\s+(?:a\s+)?(?:prc\s+)?licen[sc]e\b`
    ),
    says: 'says they hold no licence',
  },
  { pattern: /\bno licen[sc]e (?:yet|so far)\b/, says: 'says they have no licence yet' },
  {
    pattern: new RegExp(`${I_AM}(?:still\\s+|currently\\s+)?${VET}student\\b`),
    says: 'says they are a student',
  },
  {
    pattern: /\b(?:still|currently) (?:in|at) (?:vet(?:erinary)? )?(?:school|college)\b/,
    says: 'says they are still in school',
  },
  {
    pattern:
      /\b(?:aspiring|future|soon[- ]to[- ]be|incoming|would[- ]be) (?:vet\b|veterinarian|veterinary)/,
    says: 'describes themselves as an aspiring vet',
  },
  {
    pattern: /\bwant(?:ing)? to (?:be|become) (?:a )?(?:vet\b|veterinarian)/,
    says: 'wants to become a vet rather than being one',
  },

  {
    pattern: new RegExp(
      String.raw`\b(?:have\s+not|haven't|has\s+not|hasn't|did\s+not|didn't)\s+(?:yet\s+)?(?:taken|passed|sat)\s+(?:the\s+)?${EXAM}`
    ),
    says: 'has not passed the licensure exam',
  },
  {
    pattern: new RegExp(String.raw`\bfailed\s+(?:the\s+)?${EXAM}`),
    says: 'has not passed the licensure exam',
  },
  {
    pattern: new RegExp(
      String.raw`\b(?:about\s+to|going\s+to|planning\s+to|hoping\s+to|will)\s+(?:take|sit)\s+(?:the\s+)?${EXAM}`
    ),
    says: 'has not sat the licensure exam',
  },
  {
    pattern: new RegExp(`${I_AM}${VET}(?:assistant|receptionist|secretary|tech(?:nician)?)\\b`),
    says: 'describes a role that is not a licensed vet',
  },
  {
    pattern: new RegExp(
      `${I_AM}(?:groomer|breeder|pet\\s?shop\\s+owner|pet\\s+owner|caretaker)\\b`
    ),
    says: 'describes a role that is not a licensed vet',
  },
];

/**
 * The "registered veterinarian" half, read off the motivation.
 *
 * Lowercased with runs of whitespace collapsed, so a line break in the middle of a
 * phrase does not slip it past a pattern.
 */
function notLicensed(motivation: string): InquiryRefusal | null {
  const said = motivation.toLowerCase().replace(/\s+/g, ' ');
  const hit = NOT_LICENSED.find((rule) => rule.pattern.test(said));

  return hit ? { rule: 'not-licensed', detail: `the enquiry ${hit.says}` } : null;
}

/**
 * Reads one enquiry and answers with the rule that refuses it, or null to send it on
 * to a person.
 *
 * Null is the common answer and the safe one: the two rules are narrow on purpose, and
 * every enquiry they do not catch still lands in a reviewer's queue.
 */
export function screenInquiry(input: ScreenableInquiry): InquiryRefusal | null {
  return noLicence(input.licenseNumber) ?? notLicensed(input.motivation);
}
