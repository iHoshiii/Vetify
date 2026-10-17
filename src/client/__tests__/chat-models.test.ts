import { describe, expect, it } from 'vitest';
import { CHAT_MODELS } from '@/types/chat';
import { chatRequestSchema } from '@shared/schemas';

describe('Bedrock model selection', () => {
  it('defaults to Nova Lite in the selector and API', () => {
    expect(CHAT_MODELS[0]).toEqual({ label: 'Amazon Nova Lite', value: 'amazon.nova-lite-v1:0' });
    expect(chatRequestSchema.parse({ message: 'Hello' }).model).toBe(CHAT_MODELS[0].value);
  });

  it.each(CHAT_MODELS)('accepts the $label selection', ({ value }) => {
    expect(chatRequestSchema.parse({ message: 'Hello', model: value }).model).toBe(value);
  });

  it.each(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'unapproved-model'])(
    'normalizes %s without losing saved history',
    (model) => {
      const history = [{ role: 'model', content: 'Previous veterinary reply' }];
      const result = chatRequestSchema.parse({ message: 'Hello', history, model });
      expect(result.model).toBe('amazon.nova-lite-v1:0');
      expect(result.history).toEqual(history);
    }
  );
});
