'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/chat-storage';

const SUGGESTIONS = [
  'My dog is scratching a lot, what could it be?',
  'What foods are toxic to cats?',
  'How often should I deworm my pet?',
  'My bird stopped eating, should I be worried?',
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\*\-]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

interface Props {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

export default function ChatWindow({ messages, onMessagesChange }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { data: session } = useSession();
  const sessionId = (session?.user as any)?.id ?? 'anonymous';
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Index of the last user message
  const lastUserIndex = messages.reduce((last, m, i) => (m.role === 'user' ? i : last), -1);

  const sendMessage = async (text?: string, replaceFromIndex?: number) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage: Message = { role: 'user', content };
    const base = replaceFromIndex != null ? messages.slice(0, replaceFromIndex) : messages;
    const updated = [...base, userMessage];
    onMessagesChange(updated);
    setInput('');
    setEditingIndex(null);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          history: base.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      onMessagesChange([...updated, { role: 'assistant', content: stripMarkdown(data.reply) }]);
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        // Restore the input with the cancelled message and roll back
        onMessagesChange(base);
        setInput(content);
      } else {
        onMessagesChange([
          ...updated,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editingIndex != null ? sendMessage(input, editingIndex) : sendMessage();
    }
    if (e.key === 'Escape' && editingIndex != null) {
      setEditingIndex(null);
      setInput('');
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
              <span className="text-3xl">🐾</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Ask Vetify AI</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Get instant guidance on your pet's health, nutrition, and care.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-all duration-200 shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm mt-1">
                    <span className="text-sm">🐾</span>
                  </div>
                )}
                <div
                  className={`flex flex-col items-end gap-1 max-w-[65%] ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-teal-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.role === 'user' && i === lastUserIndex && !loading && (
                    <button
                      onClick={() => startEdit(i)}
                      className="text-[11px] text-slate-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-3 h-3"
                      >
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-bold mt-1">
                    You
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm mt-1">
                  <span className="text-sm">🐾</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Disclaimer */}
      {!isEmpty && (
        <p className="text-center text-[11px] text-slate-400 px-4 pb-1">
          Vetify AI provides general guidance only — always consult a licensed vet for medical
          decisions.
        </p>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingIndex != null ? 'Edit your message…' : 'Ask about your pet…'}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-32"
          />
          {editingIndex != null && (
            <button
              onClick={() => {
                setEditingIndex(null);
                setInput('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
              title="Cancel edit"
            >
              ✕
            </button>
          )}
          {loading ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-all hover:bg-red-600"
              title="Cancel"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() =>
                editingIndex != null ? sendMessage(input, editingIndex) : sendMessage()
              }
              disabled={!input.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition-all hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 rotate-90"
              >
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">
          Press <kbd className="font-mono">Enter</kbd> to send ·{' '}
          <kbd className="font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
