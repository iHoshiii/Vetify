import type { ZxcvbnFactory } from '@zxcvbn-ts/core';

import { PasswordStrength } from '@/types/signup';

/**
 * The estimator, built on first use and kept.
 *
 * Imported on demand rather than at the top of the file, because the dictionaries
 * and keyboard graphs behind zxcvbn are 1.6 MB of it — static imports put all of
 * that in the main bundle, where every visitor to the home page would download a
 * meter that exists on one screen. This way it is a chunk that arrives when
 * somebody starts typing a password.
 *
 * The type import above is erased at build time, so naming the class here costs
 * nothing at runtime.
 */
let estimator: ZxcvbnFactory | null = null;

async function load(): Promise<ZxcvbnFactory> {
  if (estimator) return estimator;

  const [core, common, english] = await Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
  ]);

  // Built once. The dictionaries do not change between passwords, and rebuilding
  // them per keystroke is the one expensive thing this library can be asked to do.
  estimator = new core.ZxcvbnFactory({
    translations: english.translations,
    graphs: common.adjacencyGraphs,
    dictionary: { ...common.dictionary, ...english.dictionary },
  });

  return estimator;
}

const LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

const LABEL_CLASSES = [
  'bg-red-100 text-red-700',
  'bg-red-100 text-red-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-emerald-700 text-white',
];

const BAR_CLASSES = [
  'bg-red-500',
  'bg-red-500',
  'bg-amber-400',
  'bg-emerald-300',
  'bg-emerald-600',
];

/**
 * The things about this particular person that a password should not be made of.
 *
 * Handed to zxcvbn as a user dictionary, which is what replaced the hand-written
 * checks this file used to do: it matches these through capitalisation, l33t
 * substitution and reversal, so 'A1da!' scores as the name it is.
 */
function userInputsOf(email: string, name: string): string[] {
  const [local = ''] = email.split('@');

  return [email, local, name, ...name.split(/\s+/)]
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);
}

/**
 * Nothing typed yet. Its own answer, so an empty box is not a score — and the
 * state the form holds before the library has finished arriving.
 */
export const NO_PASSWORD: PasswordStrength = {
  score: 0,
  label: 'Weak',
  barClass: BAR_CLASSES[0] as string,
  labelClass: LABEL_CLASSES[0] as string,
  progress: 0,
  crackTime: '',
};

/**
 * How strong a password actually is, according to zxcvbn.
 *
 * The rules this used to count — a length, an uppercase, a digit, a symbol - are
 * a checklist rather than a measurement: 'Password1!' passes all four and is one
 * of the first guesses any real attacker makes, while a long ordinary phrase fails
 * three of them and would take centuries. zxcvbn estimates the number of guesses
 * instead, against dictionaries, keyboard patterns, dates, repeats and the details
 * of the person signing up.
 *
 * Those four rules are still enforced — `signupSchema` refuses a password without
 * them, on the client and again on the server. This only decides what the meter
 * says, so a strong reading never waves a short password through.
 */
export async function evaluatePasswordStrength(
  password: string,
  email: string,
  name: string
): Promise<PasswordStrength> {
  const trimmed = password.trim();
  if (!trimmed) return NO_PASSWORD;

  const zxcvbn = await load();
  const result = zxcvbn.check(trimmed, userInputsOf(email, name));
  const { score } = result;

  return {
    score,
    label: LABELS[score] ?? 'Weak',
    barClass: BAR_CLASSES[score] ?? BAR_CLASSES[0]!,
    labelClass: LABEL_CLASSES[score] ?? LABEL_CLASSES[0]!,
    // Five scores over five steps, so the weakest reading still draws something.
    // A bar at zero reads as "not measured yet" rather than as a verdict.
    progress: ((score + 1) / 5) * 100,
    advice: result.feedback.warning ?? result.feedback.suggestions[0],
    // The slow-hashing figure, because this app stores bcrypt hashes. Quoting the
    // fast-hashing one would describe an attack on a database we do not keep.
    crackTime: result.crackTimes.offlineSlowHashingXPerSecond.display,
  };
}

type Props = { strength: PasswordStrength };

/**
 * The meter.
 *
 * The estimate and the advice are the parts worth reading, so they are on screen
 * rather than computed and dropped — which is what the old version did with its
 * reasons. `aria-live` on the pair, not on each: a screen reader announcing the
 * label and then the sentence separately on every keystroke is unusable.
 */
export default function PasswordStrengthMeter({ strength }: Props) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Password strength</p>
          <p className="text-xs text-slate-500">
            {strength.crackTime
              ? `An offline attack would need about ${strength.crackTime}.`
              : 'Use a strong password to protect your account.'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${strength.labelClass}`}>
          {strength.label}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
          style={{ width: `${strength.progress}%` }}
        />
      </div>

      {/* One thing to fix, not a list of five. */}
      {strength.advice && (
        <p aria-live="polite" className="text-xs font-medium text-slate-600">
          {strength.advice}
        </p>
      )}
    </div>
  );
}
