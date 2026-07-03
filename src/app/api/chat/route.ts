import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import * as wrappers from 'langsmith/wrappers';

const SYSTEM_PROMPT =
  'You are Vetify, a knowledgeable and empathetic AI veterinary assistant. ' +
  "Help pet owners with questions about their pet's health, symptoms, nutrition, and care. " +
  'Be concise, warm, and practical. ' +
  'Always remind users to consult a licensed veterinarian for diagnosis or emergencies.';

// GoogleGenAI reads GEMINI_API_KEY from the environment
const geminiClient = new GoogleGenAI({});

// Wrap with LangSmith tracing
const client = wrappers.wrapSDK(geminiClient, {
  tracing_extra: {
    tags: ['gemini', 'vetify', 'triage'],
    metadata: { integration: 'google-genai' },
  },
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
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    });

    return NextResponse.json({ reply: response.text ?? 'I could not generate a response.' });
  } catch {
    return NextResponse.json({ reply: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
