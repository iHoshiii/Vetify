import { CHAT_SUGGESTIONS } from '@/types/chat';

interface ChatEmptyProps {
  onSuggest: (text: string) => void;
}

export function ChatEmpty({ onSuggest }: ChatEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
        <span className="text-3xl">🐾</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800">Ask Vetify AI</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Get instant guidance on your pet&apos;s health, nutrition, and care.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {CHAT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-all duration-200 shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
