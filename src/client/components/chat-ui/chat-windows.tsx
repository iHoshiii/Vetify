import { useAuth } from '@/components/providers/AuthProvider';
import type { Message } from '@/lib/chat-storage';
import {
  FREE_ANON_QUERIES,
  markAnonQuotaExhausted,
  readAnonQueryCount,
  recordAnonQuery,
} from '@/lib/chat-quota';
import { ApiError } from '@/services/api';
import { sendMessage as sendChatMessage } from '@/services/chat.service';
import { CHAT_MODELS } from '@/types/chat';
import { useRef, useState } from 'react';
import { ChatEmpty } from './chat-empty';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatQuotaBanner, ChatQuotaLock } from './chat-quota-notice';

interface Props {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

export default function ChatWindow({ messages, onMessagesChange }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [model, setModel] = useState(CHAT_MODELS[0].value);
  const { user, isAuthenticated } = useAuth();
  // Was a bare localStorage read, which left messages sent right after logging
  // in attributed to 'anonymous' until the next reload.
  const sessionId = user?.id ?? 'anonymous';
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Seeded from storage so the allowance survives a reload, then kept in state
  // so spending one re-renders the composer without another read.
  const [anonUsed, setAnonUsed] = useState(() => readAnonQueryCount());
  const remaining = Math.max(0, FREE_ANON_QUERIES - anonUsed);
  const quotaSpent = !isAuthenticated && remaining === 0;

  const lastUserIndex = messages.reduce((last, m, i) => (m.role === 'user' ? i : last), -1);

  const sendMessage = async (text?: string, replaceFromIndex?: number) => {
    const content = (text ?? input).trim();
    if (!content || loading || quotaSpent) return;

    // Counted before the request, so a failed or cancelled call still spends the
    // question. The alternative — refunding on error — is a free retry loop.
    if (!isAuthenticated) setAnonUsed(recordAnonQuery());

    const base = replaceFromIndex != null ? messages.slice(0, replaceFromIndex) : messages;
    const updated = [...base, { role: 'user' as const, content }];
    onMessagesChange(updated);
    setInput('');
    setEditingIndex(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { reply, anonRemaining } = await sendChatMessage({
        message: content,
        sessionId,
        history: base.map((m) => ({ role: m.role, content: m.content })),
        model,
        signal: controller.signal,
      });
      // The server's count is authoritative; trust it over the local guess.
      if (anonRemaining !== undefined) setAnonUsed(FREE_ANON_QUERIES - anonRemaining);
      onMessagesChange([...updated, { role: 'assistant', content: reply }]);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        onMessagesChange(base);
        setInput(content);
      } else if (err instanceof ApiError && err.reason === 'anon-quota') {
        // Storage was cleared, or another tab spent the last one. Fall in line
        // with the server and swap in the login prompt.
        markAnonQuotaExhausted();
        setAnonUsed(FREE_ANON_QUERIES);
        onMessagesChange(base);
        setInput(content);
      } else {
        onMessagesChange([
          ...updated,
          {
            role: 'assistant',
            content:
              err instanceof ApiError
                ? err.message
                : 'Sorry, something went wrong. Please try again.',
          },
        ]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setInput(messages[index].content);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isEmpty ? (
          <ChatEmpty onSuggest={(s) => void sendMessage(s)} />
        ) : (
          <ChatMessages
            messages={messages}
            loading={loading}
            lastUserIndex={lastUserIndex}
            onEdit={startEdit}
          />
        )}
      </div>
      {quotaSpent ? (
        <ChatQuotaLock />
      ) : (
        <>
          {!isAuthenticated ? <ChatQuotaBanner remaining={remaining} /> : null}
          <ChatInput
            input={input}
            loading={loading}
            editingIndex={editingIndex}
            model={model}
            onInputChange={setInput}
            onSend={() =>
              void (editingIndex != null ? sendMessage(input, editingIndex) : sendMessage())
            }
            onCancel={() => abortRef.current?.abort()}
            onCancelEdit={() => {
              setEditingIndex(null);
              setInput('');
            }}
            onModelChange={setModel}
            inputRef={inputRef}
          />
        </>
      )}
    </div>
  );
}
