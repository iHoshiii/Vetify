// The "are you sure" step before a delete, kept apart so the menu stays small.
export default function DeleteConfirm({
  onCancel,
  onConfirm,
  error,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  error: string | null;
}) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      <p className="text-sm font-bold text-slate-900">Delete this conversation?</p>
      <p className="mt-1 text-xs text-slate-500">
        It clears the messages from your side. The other person keeps their copy.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
        >
          Delete
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
