import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PasswordStrengthMeter, {
  evaluatePasswordStrength,
} from '@/pages/signup/_components/password-strength';

const EMAIL = 'ada@example.com';
const NAME = 'Ada Lovelace';

/** Async because the library is fetched on first use; cached from then on. */
const scored = (password: string) => evaluatePasswordStrength(password, EMAIL, NAME);

describe('password strength', () => {
  it('is not fooled by a password that ticks every rule', async () => {
    // Eleven characters, an uppercase, a digit and a symbol. The checklist this
    // replaced called that four out of four and printed "Strong"; it falls in
    // minutes, and that is the bug this fixes.
    const strength = await scored('Summer2024!');

    expect(strength.label).toBe('Fair');
    expect(strength.crackTime).not.toBe('');
  });

  it('credits a long ordinary phrase that ticks almost none of them', async () => {
    // No uppercase, no digit, no symbol — one out of four on the old count, and
    // filed under "Weak" next to the password above.
    const strength = await scored('correct horse battery staple');

    expect(strength.label).toBe('Strong');
    expect(strength.score).toBeGreaterThan((await scored('Summer2024!')).score);
  });

  it('marks down a password built out of the person signing up', async () => {
    const theirs = await scored('AdaLovelace2026!');
    const anybodys = await scored('ZephyrHarbour77!');

    // Same shape, same length, same character classes. The only difference is that
    // one of them is the name in the box above, which is the first thing anybody
    // who knows them would try.
    expect(theirs.score).toBeLessThan(anybodys.score);
  });

  it('says the one thing worth fixing about a bad password', async () => {
    const strength = await scored('password123');

    expect(strength.label).toBe('Weak');
    expect(strength.advice).toBeTruthy();
  });

  it('treats an empty box as unmeasured rather than as a verdict', async () => {
    const strength = await scored('   ');

    expect(strength.progress).toBe(0);
    expect(strength.advice).toBeUndefined();
    expect(strength.crackTime).toBe('');
  });
});

describe('password strength meter', () => {
  it('shows the verdict, the estimate and the advice', async () => {
    render(<PasswordStrengthMeter strength={await scored('Summer2024!')} />);

    expect(screen.getByText('Fair')).toBeInTheDocument();
    expect(screen.getByText(/an offline attack would need about/i)).toBeInTheDocument();
    expect(screen.getByText(/add more words/i)).toBeInTheDocument();
  });

  it('falls back to the generic line when there is nothing to estimate', async () => {
    render(<PasswordStrengthMeter strength={await scored('')} />);

    expect(screen.getByText(/use a strong password/i)).toBeInTheDocument();
  });
});
