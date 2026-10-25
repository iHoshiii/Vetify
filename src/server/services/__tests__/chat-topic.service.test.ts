import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(function () {
    return { send };
  }),
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { isVeterinaryTopic } from '../chat-topic.service';
import { CHAT_SCOPE_CASES } from '../../test-utils/chat-scope-cases';
import { VETERINARY_SCOPE_POLICY } from '../chat-scope';

beforeEach(() => {
  send.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('chat topic classifier', () => {
  // This verifies delegation and result handling, not model accuracy. The live
  // suite separately runs the human-labelled cases against real Bedrock.
  it.each(CHAT_SCOPE_CASES)(
    'delegates $label to semantic classification',
    async ({ message, history = [], allowed }) => {
      send.mockResolvedValue({
        stopReason: 'end_turn',
        output: { message: { content: [{ text: allowed ? ' VETERINARY\n' : 'OUT_OF_SCOPE' }] } },
      });

      await expect(isVeterinaryTopic(message, history)).resolves.toBe(allowed);
      expect(send).toHaveBeenCalledTimes(1);
      const [command, options] = send.mock.calls[0];
      expect(command.input.messages).toEqual([
        { role: 'user', content: [{ text: JSON.stringify({ history, currentMessage: message }) }] },
      ]);
      expect(command.input.system[0].text).toContain(VETERINARY_SCOPE_POLICY);
      expect(command.input.inferenceConfig).toEqual({ temperature: 0, maxTokens: 32 });
      expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    }
  );

  it.each([
    {},
    { output: { message: { content: [] } } },
    { output: { message: { content: [{ text: 'Maybe veterinary' }] } } },
    { output: { message: { content: [{ text: 'VETERINARY because it mentions a dog' }] } } },
    { output: { message: { content: [{ text: 'OUT_OF_SCOPE VETERINARY' }] } } },
    { output: { message: { content: [{ text: 'BRIEF SOCIAL EXCHANGE' }] } } },
    { output: { message: { content: [{ text: 'GREETING' }] } } },
    { stopReason: 'max_tokens', output: { message: { content: [{ text: 'VETERINARY' }] } } },
  ])('rejects malformed or truncated results as service failures', async (response) => {
    send.mockResolvedValue(response);
    await expect(isVeterinaryTopic('My cat is sick.')).rejects.toMatchObject({
      statusCode: 503,
      message: 'The AI service is unavailable right now. Please try again.',
    });
  });

  it.each(['AccessDeniedException', 'AbortError', 'ThrottlingException'])(
    'reports %s as unavailable, without calling a valid pet question off-topic',
    async (name) => {
      send.mockRejectedValue({ name, message: 'private-provider-details' });
      await expect(isVeterinaryTopic('My cat is sick.')).rejects.toMatchObject({
        statusCode: 503,
        message: 'The AI service is unavailable right now. Please try again.',
      });
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        'private-provider-details'
      );
    }
  );

  it('uses empty context when none is supplied', async () => {
    send.mockResolvedValue({ output: { message: { content: [{ text: 'VETERINARY' }] } } });
    await expect(isVeterinaryTopic('Dog anatomy')).resolves.toBe(true);
    expect(JSON.parse(send.mock.calls[0][0].input.messages[0].content[0].text)).toEqual({
      history: [],
      currentMessage: 'Dog anatomy',
    });
  });
});
