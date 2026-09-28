import { useRef, useState } from 'react';

import { fileToAvatarDataUrl } from '@/lib/avatar-file';

// The circular preview and its controls; the file input stays hidden and the button drives it.
export default function AvatarPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset the input value so choosing the same file twice still fires a change.
  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That photo did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {value ? (
        <img
          src={value}
          alt="Your profile"
          className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-100 text-xl font-black text-teal-800">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? 'Working…' : value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                setError('');
                onChange(null);
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-700"
            >
              Remove
            </button>
          )}
        </div>
        <p className={`text-xs ${error ? 'font-semibold text-rose-700' : 'text-slate-500'}`}>
          {error || 'JPG or PNG.'}
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}
