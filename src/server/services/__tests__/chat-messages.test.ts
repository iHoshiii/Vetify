import { describe, expect, it } from 'vitest';
import { toBedrockMessages } from '../chat-messages';

describe('Bedrock conversation compatibility', () => {
  it('appends a fresh message exactly once', () => {
    expect(toBedrockMessages([], 'Hello')).toEqual([
      { role: 'user', content: [{ text: 'Hello' }] },
    ]);
  });

  it('merges adjacent roles and preserves every message, including legacy model turns', () => {
    const history = [
      { role: 'user' as const, content: 'My dog is itchy.' },
      { role: 'user' as const, content: 'It started today.' },
      { role: 'model' as const, content: 'Any other symptoms?' },
      { role: 'assistant' as const, content: 'Is your dog eating?' },
    ];
    expect(toBedrockMessages(history, 'Yes')).toEqual([
      { role: 'user', content: [{ text: 'My dog is itchy.' }, { text: 'It started today.' }] },
      {
        role: 'assistant',
        content: [{ text: 'Any other symptoms?' }, { text: 'Is your dog eating?' }],
      },
      { role: 'user', content: [{ text: 'Yes' }] },
    ]);
    expect(history).toHaveLength(4);
  });

  it('retains assistant-first saved history while starting with a valid user turn', () => {
    const result = toBedrockMessages(
      [{ role: 'assistant', content: 'Previous advice.' }],
      'Thank you'
    );
    expect(result[0].role).toBe('user');
    expect(result.slice(1)).toEqual([
      { role: 'assistant', content: [{ text: 'Previous advice.' }] },
      { role: 'user', content: [{ text: 'Thank you' }] },
    ]);
  });
});
