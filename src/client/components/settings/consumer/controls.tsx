import { useEffect, useId, useRef, type ReactNode } from 'react';

export const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500';

export function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, '-')}-heading`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), [title]);
  return (
    <section aria-labelledby={headingId}>
      <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="text-xl font-black tracking-tight text-slate-900 outline-none"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="px-5 py-6 sm:px-7">{children}</div>
    </section>
  );
}

export function SaveRow({
  pending,
  error,
  saved,
  dirty = true,
  label,
  onReset,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
  dirty?: boolean;
  label: string;
  onReset?: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-5">
      <div aria-live="polite">
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        {saved && <p className="text-sm font-semibold text-emerald-700">Changes saved.</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onReset && dirty && (
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Reset
          </button>
        )}
        <button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Saving…' : label}
        </button>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  desc,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  desc?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 ${
        disabled ? 'bg-slate-50 opacity-60' : 'bg-white'
      }`}
    >
      <span className="min-w-0">
        <span id={`${id}-label`} className="block text-sm font-bold text-slate-800">
          {label}
        </span>
        {desc && (
          <span id={`${id}-desc`} className="mt-0.5 block text-xs leading-5 text-slate-500">
            {desc}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={desc ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
          checked ? 'bg-teal-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
