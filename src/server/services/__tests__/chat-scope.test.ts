import { describe, expect, it } from 'vitest';

import { isVeterinaryQuestion } from '../chat-scope';

describe('chat scope', () => {
  it('accepts direct animal health and care questions', () => {
    expect(isVeterinaryQuestion('What foods are toxic to cats?')).toBe(true);
    expect(isVeterinaryQuestion('My bird stopped eating. Should I be worried?')).toBe(true);
  });

  it('requires each message to identify a veterinary topic', () => {
    expect(isVeterinaryQuestion('How often should I do that?')).toBe(false);
  });

  it('rejects a non-veterinary question after a pet-care conversation', () => {
    expect(isVeterinaryQuestion('Tell me a law from the Philippines.')).toBe(false);
    expect(isVeterinaryQuestion('What medicine should I take for a headache?')).toBe(false);
  });
});
