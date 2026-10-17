export const CHAT_MODELS = [
  { label: 'Amazon Nova Lite', value: 'amazon.nova-lite-v1:0' },
  { label: 'Amazon Nova Micro', value: 'amazon.nova-micro-v1:0' },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODELS[0].value;

export function normalizeChatModel(model?: string): string {
  return CHAT_MODELS.some(({ value }) => value === model) ? model! : DEFAULT_CHAT_MODEL;
}
