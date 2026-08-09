import { PasswordStrength } from '@/types/signup';

export function evaluatePasswordStrength(
  password: string,
  email: string,
  name: string
): PasswordStrength {
  const normalizedPassword = password.trim();
  const normalizedLower = normalizedPassword.toLowerCase();
  const emailPrefix = email.split('@')[0].toLowerCase();
  const nameParts = name
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3);

  const criteria = {
    length: normalizedPassword.length >= 8,
    uppercase: /[A-Z]/.test(normalizedPassword),
    number: /[0-9]/.test(normalizedPassword),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(normalizedPassword),
  };

  const baseScore = Object.values(criteria).filter(Boolean).length;

  const sequentialPatterns = [
    '123',
    '234',
    '345',
    '456',
    '567',
    '678',
    '789',
    '012',
    'abc',
    'bcd',
    'cde',
    'qwerty',
    'asdf',
    'password',
    'admin',
  ];

  const sequentialDetected = sequentialPatterns.some((pattern) =>
    normalizedLower.includes(pattern)
  );
  const includesEmailPrefix = emailPrefix.length >= 4 && normalizedLower.includes(emailPrefix);
  const includesNamePart = nameParts.some((part) => normalizedLower.includes(part));
  const weakOverride = sequentialDetected || includesEmailPrefix || includesNamePart;

  const overrideReason = weakOverride
    ? sequentialDetected
      ? 'Password contains a common sequence.'
      : includesEmailPrefix
      ? 'Password contains part of your email address.'
      : 'Password contains part of your name.'
    : undefined;

  const score = weakOverride && baseScore > 1 ? 1 : baseScore;
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const labelClass =
    score <= 1
      ? 'bg-red-100 text-red-700'
      : score === 2
      ? 'bg-amber-100 text-amber-800'
      : score === 3
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-emerald-700 text-white';
  const barClass =
    score <= 1
      ? 'bg-red-500'
      : score === 2
      ? 'bg-amber-400'
      : score === 3
      ? 'bg-emerald-300'
      : 'bg-emerald-600';

  return {
    score,
    label,
    barClass,
    labelClass,
    progress: (score / 4) * 100,
    weakOverride,
    overrideReason,
  };
}

type Props = { strength: PasswordStrength };

export default function PasswordStrengthMeter({ strength }: Props) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Password strength</p>
          <p className="text-xs text-slate-500">Use a strong password to protect your account.</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${strength.labelClass}`}
          aria-live="polite"
        >
          {strength.label}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
          style={{ width: `${strength.progress}%` }}
        />
      </div>
    </div>
  );
}
