import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { send, tracedInputs } = vi.hoisted(() => ({ send: vi.fn(), tracedInputs: vi.fn() }));
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(function () {
    return { send };
  }),
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));
vi.mock('langsmith/traceable', () => ({
  traceable: (fn: (request: unknown) => unknown) => (request: unknown) => {
    tracedInputs(request);
    return fn(request);
  },
}));

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { generateReply } from '../chat.service';
import { VETERINARY_SCOPE_POLICY } from '../chat-scope';

const request = {
  message: 'How should I groom my dog?',
  history: [],
  model: 'amazon.nova-lite-v1:0',
  session_id: 'test',
};
beforeEach(() => {
  send.mockReset();
  tracedInputs.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Bedrock veterinary chat', () => {
  it('uses Sydney and AWS default credentials with bounded retries', () => {
    expect(BedrockRuntimeClient).toHaveBeenCalledWith({ region: 'ap-southeast-2', maxAttempts: 2 });
  });

  it('preserves the veterinary instructions, message order, model and response contract', async () => {
    send.mockResolvedValue({
      output: { message: { content: [{ text: 'Use a suitable brush.' }] } },
    });
    const reply = await generateReply({
      ...request,
      model: 'amazon.nova-micro-v1:0',
      history: [
        { role: 'user', content: 'My dog has long fur.' },
        { role: 'model', content: 'What grooming do you do?' },
      ],
    });
    expect(reply).toBe('Use a suitable brush.');
    const [command, options] = send.mock.calls[0];
    expect(command.input).toMatchObject({
      modelId: 'amazon.nova-micro-v1:0',
      inferenceConfig: { temperature: 0.7, maxTokens: 2048 },
      messages: [
        { role: 'user', content: [{ text: 'My dog has long fur.' }] },
        { role: 'assistant', content: [{ text: 'What grooming do you do?' }] },
        { role: 'user', content: [{ text: request.message }] },
      ],
    });
    const prompt = command.input.system[0].text;
    expect(prompt).toContain('ONLY answer questions related to pets and animals');
    expect(prompt).toContain(VETERINARY_SCOPE_POLICY);
    expect(prompt).toContain('do NOT attempt to diagnose');
    expect(prompt).toContain('contact a licensed veterinarian immediately');
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('cannot invoke an arbitrary model even if request parsing is bypassed', async () => {
    send.mockResolvedValue({});
    await generateReply({ ...request, model: 'arn:aws:bedrock:us-east-1::foundation-model/other' });
    expect(send.mock.calls[0][0].input.modelId).toBe('amazon.nova-lite-v1:0');
  });

  it('keeps account/session identifiers out of external tracing inputs', async () => {
    send.mockResolvedValue({});
    await generateReply({ ...request, session_id: 'private-account-id' });
    expect(tracedInputs.mock.calls[0][0]).toEqual({
      message: request.message,
      history: [],
      model: request.model,
    });
    expect(JSON.stringify(tracedInputs.mock.calls)).not.toContain('private-account-id');
  });

  it('joins text blocks and excludes non-text provider output', async () => {
    send.mockResolvedValue({
      output: {
        message: {
          content: [
            { text: 'First part.' },
            { reasoningContent: { reasoningText: { text: 'internal' } } },
            { text: 'Second part.' },
          ],
        },
      },
    });
    expect(await generateReply(request)).toBe('First part.\nSecond part.');
  });

  it.each([{}, { output: { message: { content: [{ text: '   ' }] } } }])(
    'handles an empty response',
    async (response) => {
      send.mockResolvedValue(response);
      expect(await generateReply(request)).toBe('I could not generate a response.');
    }
  );

  it.each([
    { name: 'ThrottlingException' },
    { name: 'ServiceQuotaExceededException' },
    { $metadata: { httpStatusCode: 429 } },
  ])('retains HTTP 429 for throttling', async (error) => {
    send.mockRejectedValue(error);
    await expect(generateReply(request)).rejects.toMatchObject({ statusCode: 429 });
  });

  it.each(['AccessDeniedException', 'AbortError', 'ServiceUnavailableException'])(
    'handles %s without leaking provider details',
    async (name) => {
      send.mockRejectedValue({
        name,
        message: 'private-provider-details',
        $metadata: { httpStatusCode: 403 },
      });
      await expect(generateReply(request)).rejects.toMatchObject({
        statusCode: 502,
        message: 'The AI service is unavailable right now. Please try again.',
      });
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        'private-provider-details'
      );
    }
  );
});
