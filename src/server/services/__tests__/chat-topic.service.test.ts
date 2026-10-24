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

beforeEach(() => send.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('chat topic classifier', () => {
  it('allows only an exact veterinary classification', async () => {
    send.mockResolvedValue({ output: { message: { content: [{ text: 'VETERINARY' }] } } });
    await expect(isVeterinaryTopic('My dog is scratching.')).resolves.toBe(true);

    send.mockResolvedValue({ output: { message: { content: [{ text: 'OUT_OF_SCOPE' }] } } });
    await expect(isVeterinaryTopic('My dog needs health advice.')).resolves.toBe(false);
  });

  it('classifies the fever message instead of rejecting it locally', async () => {
    send.mockResolvedValue({ output: { message: { content: [{ text: 'VETERINARY' }] } } });

    await expect(isVeterinaryTopic('my dog have fever')).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.messages).toEqual([
      { role: 'user', content: [{ text: '<message>my dog have fever</message>' }] },
    ]);
  });

  it('still declines animal facts when the classifier marks them out of scope', async () => {
    send.mockResolvedValue({ output: { message: { content: [{ text: 'OUT_OF_SCOPE' }] } } });

    await expect(isVeterinaryTopic('what are dogs')).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('denies clear non-veterinary topics without calling the classifier', async () => {
    await expect(isVeterinaryTopic('Tell me a law from the Philippines.')).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('denies an unavailable or malformed classifier response', async () => {
    send.mockResolvedValue({ output: { message: { content: [{ text: 'Maybe veterinary' }] } } });
    await expect(isVeterinaryTopic('My cat is sick.')).resolves.toBe(false);
  });
});
