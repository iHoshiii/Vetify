import { MESSAGE_MAX_LENGTH } from '@shared/limits';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

export default function MessageEditor({
  body,
  busy,
  onCancel,
  onSave,
}: {
  body: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (body: string) => void;
}) {
  const [text, setText] = useState(body);
  const trimmed = text.trim();

  return (
    <div className="rounded-2xl rounded-br-sm bg-white p-2 shadow ring-1 ring-teal-300">
      <textarea
        autoFocus
        rows={2}
        value={text}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(event) => setText(event.target.value)}
        className="w-full resize-none rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-800 outline-none"
      />
      <div className="mt-1 flex justify-end gap-1">
        <button
          type="button"
          aria-label="Cancel editing"
          onClick={onCancel}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Save edited message"
          disabled={!trimmed || busy}
          onClick={() => onSave(trimmed)}
          className="rounded p-1 text-teal-700 hover:bg-teal-50 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
