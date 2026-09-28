import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// The accordion row every settings section shares; children mount only while open, so a form seeds fresh from the latest data each time.
export function SettingRow({
  label,
  summary,
  isExpanded,
  onToggle,
  children,
}: SectionProps & { label: string; summary: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold text-slate-800">{label}</span>
          <span className="block truncate text-sm text-slate-500">{summary}</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && <div className="space-y-4 px-6 pb-5">{children}</div>}
    </div>
  );
}

// The submit button and the two lines that can follow it, so the three forms do not each copy them.
export function SaveRow({
  pending,
  error,
  saved,
  label,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
  label: string;
}) {
  return (
    <>
      {error && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-800 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-900 disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Saving…' : label}
      </button>
    </>
  );
}

// A labelled on/off switch, used for every boolean setting on the page.
export function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        {desc && <span className="block text-xs text-slate-500">{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-teal-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
