import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export default function MessageMenu({
  open,
  onToggle,
  onEdit,
  onUnsend,
}: {
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onUnsend: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Message options"
        aria-expanded={open}
        onClick={onToggle}
        className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 opacity-0 hover:bg-slate-200 focus:opacity-100 group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onUnsend}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            Unsend
          </button>
        </div>
      )}
    </>
  );
}
