import React, { useEffect, useRef, useState } from 'react';
import { CHAT_MODELS } from '@/types/chat';

interface ChatInputProps {
  input: string;
  loading: boolean;
  editingIndex: number | null;
  model: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onCancelEdit: () => void;
  onModelChange: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({
  input,
  loading,
  editingIndex,
  model,
  onInputChange,
  onSend,
  onCancel,
  onCancelEdit,
  onModelChange,
  inputRef,
}: ChatInputProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    if (e.key === 'Escape' && editingIndex != null) onCancelEdit();
  };

  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white px-6 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingIndex != null ? 'Edit your message…' : 'Ask about your pet…'}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-32"
          />
          {editingIndex != null && (
            <button
              onClick={onCancelEdit}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
              title="Cancel edit"
            >
              ✕
            </button>
          )}
          {loading ? (
            <button
              onClick={onCancel}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-all hover:bg-red-600"
              title="Cancel"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              aria-label="Send message"
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
        <div ref={modelRef} className="relative flex-shrink-0">
          <button
            onClick={() => setModelOpen((o) => !o)}
            disabled={loading}
            className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none hover:border-teal-400 focus:border-teal-400 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
          >
            {CHAT_MODELS.find((m) => m.value === model)?.label}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-3 h-3 transition-transform ${modelOpen ? 'rotate-180' : 'rotate-0'}`}
            >
              <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {modelOpen && (
            <div className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
              {CHAT_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    onModelChange(m.value);
                    setModelOpen(false);
                  }}
                  className={`w-full text-left text-[11px] px-4 py-2 whitespace-nowrap transition-colors ${
                    m.value === model
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1 text-center">
        Vetify AI provides general guidance only — always consult a licensed vet for medical
        decisions.
      </p>
    </div>
  );
}
