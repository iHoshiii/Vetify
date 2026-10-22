import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { traceable } from 'langsmith/traceable';

import type { ChatRequest } from '@shared/schemas';
import { normalizeChatModel } from '@shared/chat-models';
import { toBedrockMessages } from './chat-messages';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SYSTEM_PROMPT =
  'You are Vetify, a specialized AI veterinary assistant. Your knowledge is strictly limited to pet and animal health topics only. ' +
  "You help pet owners with questions about their pet's health, symptoms, nutrition, behavior, and general care. " +
  '\n\n' +
  'STRICT RULES:\n' +
  '1. ONLY answer questions related to pets and animals (dogs, cats, birds, and other common pets). ' +
  'If the current user message is not directly about pet or animal health and care, decline it. This applies even after a pet-care conversation. ' +
  'Never assume a new topic is about the pet merely because earlier messages were. Politely remind the user you are a veterinary assistant only.\n' +
  '2. ASSESS COMPLEXITY: For simple questions (nutrition, grooming, general behavior), answer directly and helpfully. ' +
  'For moderate concerns (mild symptoms, minor injuries), give first-aid guidance but recommend monitoring closely.\n' +
  '3. ESCALATE WHEN NEEDED: If the situation sounds serious or complex (severe symptoms, emergencies, unusual behavior, possible poisoning, difficulty breathing, seizures, etc.), ' +
  'do NOT attempt to diagnose. Clearly tell the user this is beyond what you can safely assess and they must contact a licensed veterinarian immediately.\n' +
  '4. FUTURE FEATURE: In the future, you will be able to recommend the nearest verified vet clinic from our database. For now, advise users to search for a local vet if urgent.\n' +
  '5. Always be warm, calm, and empathetic — pet owners are often worried. Keep responses concise and easy to understand.\n' +
  '6. FORMATTING & SCANNABILITY:\n' +
  'For simple, single-point questions: reply in plain conversational sentences like a caring vet talking directly to the owner.\n' +
  'For multi-part questions, lists of causes/symptoms/steps/remedies, or complex advice: MUST use Markdown headers (###) and bullet points (-) to break it down. No walls of text.\n' +
  'Never use bold (**) or italics (*) for emphasis. No numbered lists unless steps must be sequential.\n' +
  '7. LENGTH: Keep replies short and to the point — 2 to 4 sentences for simple questions, no more than a short paragraph for complex ones. ' +
  'Never over-explain. Say what matters most, skip the filler. ' +
  'However, if the user explicitly asks for more detail, a full explanation, or a list, then go deeper and be as thorough as needed.';

const client = new BedrockRuntimeClient({ region: env.BEDROCK_REGION, maxAttempts: 2 });

async function reply({
  message,
  history,
  model,
}: Pick<ChatRequest, 'message' | 'history' | 'model'>): Promise<string> {
  try {
    const response = await client.send(
      new ConverseCommand({
        modelId: normalizeChatModel(model),
        messages: toBedrockMessages(history, message),
        system: [{ text: SYSTEM_PROMPT }],
        inferenceConfig: { temperature: 0.7, maxTokens: 2048 },
      }),
      { abortSignal: AbortSignal.timeout(22_000) }
    );
    const text = response.output?.message?.content
      ?.flatMap((block) => (block.text ? [block.text] : []))
      .join('\n');
    return text?.trim() ? text : 'I could not generate a response.';
  } catch (err) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    const status = error?.$metadata?.httpStatusCode;
    console.error('[chat.service] bedrock error:', { name: error?.name, status });
    if (
      status === 429 ||
      ['ThrottlingException', 'ServiceQuotaExceededException'].includes(error?.name ?? '')
    ) {
      throw AppError.tooManyRequests(
        '⏳ The AI is temporarily rate-limited. Please wait a moment and try again.'
      );
    }

    throw new AppError(502, 'The AI service is unavailable right now. Please try again.');
  }
}

const tracedReply = traceable(reply, {
  name: 'vetify-chat',
  run_type: 'llm',
  tags: ['bedrock', 'vetify', 'triage'],
  metadata: { integration: 'aws-bedrock' },
});

export function generateReply({ message, history, model }: ChatRequest): Promise<string> {
  return tracedReply({ message, history, model });
}
