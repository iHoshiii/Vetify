import { useEffect, useId, useRef, type ReactNode } from 'react';

export const DIALOG_PRIMARY =
  'rounded-lg bg-[#16796f] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#115c54] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500';
export const DIALOG_SECONDARY =
  'rounded-lg border border-[#0a0c14]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#0a0c14] transition-colors hover:bg-[#0a0c14]/5';

type Props = {
  open: boolean;
  eyebrow: string;
  title: string;
  lead: string;
  onCancel: () => void;
  children: ReactNode;
  footer: ReactNode;
};

export default function DialogShell(props: Props) {
  const { open, eyebrow, title, lead, onCancel, children, footer } = props;
  const titleId = useId();
  const bodyId = useId();
  const panel = useRef<HTMLDivElement | null>(null);

  // Focus lands on the panel rather than a control, so the text is the first thing read
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Hidden from assistive tech because Escape and the footer buttons are the reachable ways out */}
      <div
        className="absolute inset-0 bg-[#0a0c14]/60 backdrop-blur-sm"
        onClick={onCancel}
        role="presentation"
        aria-hidden="true"
      />

      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#FAF9F6] shadow-2xl outline-none"
      >
        <div className="border-b border-[#0a0c14]/10 px-6 pb-5 pt-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#16796f]">{eyebrow}</p>
          <h2 id={titleId} className="mt-2 text-2xl font-black tracking-tight text-[#0a0c14]">
            {title}
          </h2>
          <p id={bodyId} className="mt-2 text-sm leading-6 text-slate-600">
            {lead}
          </p>
        </div>

        {children}

        <div className="border-t border-[#0a0c14]/10 bg-white px-6 py-5 sm:px-8">{footer}</div>
      </div>
    </div>
  );
}
