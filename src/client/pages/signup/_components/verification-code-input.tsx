import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
};

export default function VerificationCodeInput({ value, onChange, disabled, describedBy }: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const digits = Array.from({ length: 6 }, (_, index) =>
    /^[0-9]$/.test(value[index] ?? '') ? value[index]! : ''
  );

  const focus = useCallback((index: number) => {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  }, []);

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    focus(pendingFocus.current);
    pendingFocus.current = null;
  }, [value, focus]);

  const commit = (next: string[], nextFocus?: number) => {
    if (disabled) return;
    const updated = next
      .map((digit) => digit || ' ')
      .join('')
      .trimEnd();
    pendingFocus.current = updated === value ? null : nextFocus ?? null;
    onChange(updated);
    if (nextFocus !== undefined) focus(nextFocus);
  };

  const insert = (index: number, text: string) => {
    if (disabled) return;
    const incoming = text.replace(/[^0-9]/g, '').slice(0, 6);
    if (text && !incoming) return;
    const start = incoming.length === 6 ? 0 : index;
    const next = [...digits];
    if (!incoming) {
      next[index] = '';
      commit(next);
      return;
    }
    [...incoming].forEach((digit, offset) => {
      if (start + offset < 6) next[start + offset] = digit;
    });
    commit(next, Math.min(start + incoming.length, 5));
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    if (/^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      insert(index, event.key);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      focus(Math.max(0, Math.min(5, index + (event.key === 'ArrowLeft' ? -1 : 1))));
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const target = event.key === 'Backspace' && !digits[index] ? Math.max(0, index - 1) : index;
      const next = [...digits];
      next[target] = '';
      commit(next, target);
    } else if (
      event.key.length === 1 &&
      !/[0-9]/.test(event.key) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
    }
  };

  return (
    <fieldset disabled={disabled} aria-describedby={describedBy} className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-slate-700">Confirmation code</legend>
      <div className="grid grid-cols-6 gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(input) => {
              inputs.current[index] = input;
            }}
            type="text"
            aria-label={`Digit ${index + 1} of 6`}
            aria-describedby={describedBy}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]"
            minLength={1}
            maxLength={index === 0 ? 6 : 1}
            value={digit}
            disabled={disabled}
            onChange={(event) => insert(index, event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => keyDown(event, index)}
            onPaste={(event) => {
              event.preventDefault();
              insert(index, event.clipboardData.getData('text'));
            }}
            className="h-12 min-w-0 w-full rounded-xl border border-slate-200 bg-white text-center text-xl font-semibold tabular-nums text-slate-900 outline-none transition-colors focus:border-vet-primary focus:ring-2 focus:ring-vet-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14"
            required
          />
        ))}
      </div>
    </fieldset>
  );
}
