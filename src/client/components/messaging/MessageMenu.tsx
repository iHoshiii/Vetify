import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  mine: boolean;
  canEdit: boolean;
  removeForMe: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function MessageMenu(props: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });

  useLayoutEffect(() => {
    if (!props.open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 160;
      const height = props.canEdit ? 82 : 42;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left - width / 2));
      const above = rect.top - height - 6;
      const preferredTop = above >= 8 ? above : rect.bottom + 6;
      const top = Math.max(8, Math.min(window.innerHeight - height - 8, preferredTop));
      setPosition({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [props.open, props.canEdit]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Message options"
        aria-expanded={props.open}
        onClick={(event) => {
          event.stopPropagation();
          props.onToggle();
        }}
        className={`absolute top-1/2 -translate-y-1/2 rounded-lg bg-white/90 p-1 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 ${
          props.open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100'
        } ${props.mine ? '-left-9' : '-right-9'}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {props.open &&
        createPortal(
          <div
            data-chat-overlay
            className="fixed z-[90] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl"
            style={position}
          >
            {props.canEdit && (
              <button
                type="button"
                onClick={props.onEdit}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={props.onDelete}
              className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> {props.removeForMe ? 'Remove for me' : 'Unsend'}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
