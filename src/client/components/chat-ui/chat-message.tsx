import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/lib/chat-storage';

interface ChatMessageProps {
  message: Message;
  index: number;
  isLastUser: boolean;
  loading: boolean;
  onEdit: (index: number) => void;
}

export function ChatMessage({
  message: m,
  index: i,
  isLastUser,
  loading,
  onEdit,
}: ChatMessageProps) {
  return (
    <div className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {m.role === 'assistant' && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm mt-1">
          <span className="text-sm">🐾</span>
        </div>
      )}
      <div
        className={`flex flex-col gap-1 max-w-[65%] ${
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
          <ReactMarkdown
            components={{
              h3: ({ children }: { children?: React.ReactNode }) => (
                <p className="font-semibold text-slate-800 mt-2 mb-1">{children}</p>
              ),
              ul: ({ children }: { children?: React.ReactNode }) => (
                <ul className="list-disc list-inside space-y-1">{children}</ul>
              ),
              li: ({ children }: { children?: React.ReactNode }) => (
                <li className="text-sm">{children}</li>
              ),
              p: ({ children }: { children?: React.ReactNode }) => (
                <p className="whitespace-pre-wrap">{children}</p>
              ),
            }}
          >
            {m.content}
          </ReactMarkdown>
        </div>
        {m.role === 'user' && isLastUser && !loading && (
          <button
            onClick={() => onEdit(i)}
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
  );
}
