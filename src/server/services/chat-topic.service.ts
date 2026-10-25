import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

import { DEFAULT_CHAT_MODEL } from '@shared/chat-models';
import type { ChatRequest } from '@shared/schemas';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { VETERINARY_SCOPE_POLICY } from './chat-scope';

const CLASSIFIER_PROMPT =
  'You are the scope classifier for a veterinary assistant. Classify the currentMessage in the supplied JSON using this policy.\n' +
  VETERINARY_SCOPE_POLICY +
  '\nReply with exactly VETERINARY for an in-scope request or OUT_OF_SCOPE otherwise. Output no explanation, formatting, or other text.';

const client = new BedrockRuntimeClient({ region: env.BEDROCK_REGION, maxAttempts: 2 });

export async function isVeterinaryTopic(
  message: string,
  history: ChatRequest['history'] = []
): Promise<boolean> {
  try {
    const response = await client.send(
      new ConverseCommand({
        modelId: DEFAULT_CHAT_MODEL,
        system: [{ text: CLASSIFIER_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: JSON.stringify({ history, currentMessage: message }) }],
          },
        ],
        inferenceConfig: { temperature: 0, maxTokens: 32 },
      }),
      { abortSignal: AbortSignal.timeout(8_000) }
    );
    const classification = response.output?.message?.content
      ?.flatMap((block) => (block.text ? [block.text] : []))
      .join('\n')
      .trim();
    if (response.stopReason !== 'max_tokens') {
      if (classification === 'VETERINARY') return true;
      if (classification === 'OUT_OF_SCOPE') return false;
    }
    throw new Error('Invalid topic classification');
  } catch (error) {
    console.error('[chat-topic] classifier unavailable:', {
      name: (error as { name?: string }).name,
    });
    // An unavailable classifier must not masquerade as a topic refusal or let an
    // unchecked request reach generation. The client can retry this failure.
    throw new AppError(503, 'The AI service is unavailable right now. Please try again.');
  }
}
