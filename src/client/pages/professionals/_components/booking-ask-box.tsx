import { ACT_PRIMARY, ACT_QUIET, type Ask } from './booking-actions';

export default function BookingAskBox({
  ask,
  text,
  onText,
  error,
  busy,
  onSend,
  onDrop,
}: {
  ask: Ask;
  text: string;
  onText: (value: string) => void;
  error?: string;
  busy: boolean;
  onSend: () => void;
  onDrop: () => void;
}) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
      <label htmlFor="ask-text" className="text-sm font-bold text-teal-900">
        {ask.label}
      </label>
      <textarea
        id="ask-text"
        value={text}
        onChange={(event) => onText(event.target.value)}
        rows={2}
        placeholder={ask.placeholder}
        className="mt-2 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSend}
          // The floors are the server's: ten characters for a reason, a URL for a
          // link. Held here so the answer is a disabled button rather than a 400.
          disabled={busy || (ask.action === 'confirm' ? !text.trim() : text.trim().length < 10)}
          className={`${ACT_PRIMARY} h-9 px-4 disabled:opacity-60`}
        >
          {busy ? 'Sending…' : 'Send it'}
        </button>
        <button type="button" onClick={onDrop} className={`${ACT_QUIET} h-9 px-4`}>
          Never mind
        </button>
      </div>
    </div>
  );
}
