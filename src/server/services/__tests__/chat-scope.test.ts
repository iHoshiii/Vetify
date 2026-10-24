import { describe, expect, it } from 'vitest';

import { mightBeVeterinaryQuestion } from '../chat-scope';

describe('chat scope', () => {
  it('accepts direct animal health and care questions', () => {
    expect(mightBeVeterinaryQuestion('What foods are toxic to cats?')).toBe(true);
    expect(mightBeVeterinaryQuestion('My bird stopped eating. Should I be worried?')).toBe(true);
  });

  it.each(['my dog have fever', 'My cat is bleeding.', 'My rabbit seems lethargic.'])(
    'passes animal concerns to the topic classifier: %s',
    (message) => {
      expect(mightBeVeterinaryQuestion(message)).toBe(true);
    }
  );

  it('requires each message to identify a veterinary topic', () => {
    expect(mightBeVeterinaryQuestion('How often should I do that?')).toBe(false);
  });

  it('rejects a non-veterinary question after a pet-care conversation', () => {
    expect(mightBeVeterinaryQuestion('Tell me a law from the Philippines.')).toBe(false);
    expect(mightBeVeterinaryQuestion('What medicine should I take for a headache?')).toBe(false);
  });
});
