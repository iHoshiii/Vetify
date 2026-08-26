import { describe, expect, it } from 'vitest';

import { scanText } from '../moderation/wordlist';

/**
 * The deterministic half of the screen, tested on its own: it needs no database,
 * no key and no network, and it is the half that decides whether the obvious cases
 * still get caught on a day the model is unreachable.
 */
describe('wordlist screening', () => {
  it('leaves ordinary veterinary writing alone', () => {
    const hit = scanText(
      'Older cats hide pain well. Watch for weight loss, a dull coat, and any change in how ' +
        'they use the litter tray, and ask your vet about a blood panel.'
    );

    expect(hit.severity).toBe(0);
    expect(hit.terms).toEqual([]);
    expect(hit.categories).toEqual([]);
  });

  it('does not fire on a banned term sitting inside an innocent word', () => {
    // 'spic' is on the list; 'suspicious' is the reason word boundaries are.
    const hit = scanText('The lump looked suspicious, so we sent it for histopathology.');

    expect(hit.severity).toBe(0);
  });

  it('catches a slur and reports the term, not just the category', () => {
    const hit = scanText('Some faggot left their dog in the car again.');

    expect(hit.categories).toContain('slur');
    expect(hit.terms).toContain('faggot');
    expect(hit.severity).toBeGreaterThan(0.9);
  });

  it('sees through digit substitution and padded letters', () => {
    expect(scanText('p0rn').severity).toBeGreaterThan(0);
    expect(scanText('pooorn').severity).toBeGreaterThan(0);
  });

  it('matches a multi-word term across its space', () => {
    const hit = scanText('You can buy xanax here, no questions asked.');

    expect(hit.categories).toContain('illegal');
    expect(hit.terms).toContain('buy xanax');
  });

  it('takes its severity from the worst term and lists every one it found', () => {
    const hit = scanText('nsfw: bestiality');

    // The list is ordered worst-first, so the severity and the first term agree.
    expect(hit.terms[0]).toBe('bestiality');
    expect(hit.terms).toHaveLength(2);
    expect(hit.severity).toBeGreaterThan(0.95);
  });
});
