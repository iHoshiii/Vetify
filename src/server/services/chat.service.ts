import { GoogleGenAI } from '@google/genai';
import * as wrappers from 'langsmith/wrappers';

import type { ChatRequest } from '@shared/schemas';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SYSTEM_PROMPT =
  'You are Vetify, a specialized AI veterinary assistant. Your knowledge is strictly limited to pet and animal health topics only. ' +
  "You help pet owners with questions about their pet's health, symptoms, nutrition, behavior, and general care. " +
  '\n\n' +
  'STRICT RULES:\n' +
  '1. ONLY answer questions related to pets and animals (dogs, cats, birds, and other common pets). ' +
  'If the user asks about anything outside of pet/animal health and care, politely decline and remind them you are a veterinary assistant only.\n' +
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

const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Wrap with LangSmith tracing
const client = wrappers.wrapSDK(geminiClient, {
  tags: ['gemini', 'vetify', 'triage'],
  metadata: { integration: 'google-genai' },
});

export async function generateReply({ message, history, model }: ChatRequest): Promise<string> {
  // Gemini calls the assistant turn "model"; the client and DB call it "assistant".
  const contents = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    return response.text ?? 'I could not generate a response.';
  } catch (err) {
    const msg = (err as Error)?.message ?? '';
    console.error('[chat.service] gemini error:', err);

    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw AppError.tooManyRequests(
        '⏳ The AI is temporarily rate-limited. Please wait a moment and try again.'
      );
    }

    throw new AppError(502, 'The AI service is unavailable right now. Please try again.');
  }
}
