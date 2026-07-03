import { GoogleGenAI } from '@google/genai';
import * as wrappers from 'langsmith/wrappers';
import { NextRequest, NextResponse } from 'next/server';

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
  '5. Always be warm, calm, and empathetic — pet owners are often worried. Keep responses concise and easy to understand.';

// GoogleGenAI reads GEMINI_API_KEY from the environment
const geminiClient = new GoogleGenAI({});

// Wrap with LangSmith tracing
const client = wrappers.wrapSDK(geminiClient, {
  tags: ['gemini', 'vetify', 'triage'],
  metadata: { integration: 'google-genai' },
});

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], session_id = 'anonymous' } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ reply: 'Message cannot be empty.' }, { status: 400 });
    }

    // Build conversation contents for Gemini
    const contents = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    });

    return NextResponse.json({ reply: response.text ?? 'I could not generate a response.' });
  } catch (err: any) {
    const msg = err?.message ?? '';
    console.error('[chat/route] error:', err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { reply: '⏳ The AI is temporarily rate-limited. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { reply: `Error: ${msg || 'Something went wrong. Please try again.'}` },
      { status: 500 }
    );
  }
}
