export type ChatModel = {
  label: string;
  value: string;
};

export const CHAT_SUGGESTIONS = [
  'My dog is scratching a lot, what could it be?',
  'What foods are toxic to cats?',
  'How often should I deworm my pet?',
  'My bird stopped eating, should I be worried?',
];

export const CHAT_MODELS: ChatModel[] = [
  { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { label: 'Gemini 3.1 Flash Lite', value: 'gemini-3.1-flash-lite' },
];
