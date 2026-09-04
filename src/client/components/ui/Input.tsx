import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, type, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  /**
   * Whether this field is currently showing what was typed.
   *
   * Per field rather than per form: revealing a new password and revealing the
   * confirmation are separate decisions, and the point of the second box is to
   * check the typing in the first one.
   */
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  // A required box that has something in it has nothing left to ask for, so the star goes
  const asking = Boolean(props.required) && !String(props.value ?? '').trim();

  // The star sits beside the label rather than inside it: the input's own `required` is what
  // a screen reader announces, and the label's text stays exactly what it says it is.
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <span className="flex items-center gap-1">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
          {asking && (
            <span aria-hidden className="text-sm font-bold text-red-500">
              *
            </span>
          )}
        </span>
      )}
      <div className="relative">
        <input
          id={inputId}
          // Swapped to a text field while revealed, which is the only way a browser
          // will show the characters. The prop still says 'password', so nothing
          // outside here has to know or care.
          type={isPassword && revealed ? 'text' : type}
          className={`
          flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm 
          ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed 
          disabled:opacity-50 transition-shadow
          ${isPassword ? 'pr-10' : ''}
          ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          ${className}
        `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            // A button, not a checkbox, and inside the field rather than beside it:
            // aria-pressed is what says it is a toggle, and the label says which way
            // pressing it goes. `type="button"` keeps it from submitting the form.
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {revealed ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
