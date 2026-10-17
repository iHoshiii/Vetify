import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { ChatRequest } from '@shared/schemas';

export function toBedrockMessages(history: ChatRequest['history'], message: string): Message[] {
  const messages: Message[] = [];
  for (const entry of [...history, { role: 'user', content: message }]) {
    const role = entry.role === 'user' ? 'user' : 'assistant';
    const previous = messages.at(-1);
    if (previous?.role === role) previous.content!.push({ text: entry.content });
    else messages.push({ role, content: [{ text: entry.content }] });
  }
  if (messages[0]?.role === 'assistant') {
    messages.unshift({
      role: 'user',
      content: [{ text: 'Continue this previous pet-care conversation.' }],
    });
  }
  return messages;
}
