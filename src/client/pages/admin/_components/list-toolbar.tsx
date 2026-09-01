import { useEffect, useId, useRef, useState } from 'react';

import { BUTTON, CONTROL, LABEL } from './ui';

/**
 * A filter with an explicit "everything" option.
 *
 * The empty string is that option, and the hook that owns the URL drops it — so
 * clearing a filter removes the param rather than sending `?status=`, which the
 * server's enum would have to refuse.
 *
 * `allLabel: null` drops the option entirely, for a filter whose surrounding screen
 * is already the scope — the application phases, where an "everything" reaching past
 * the phase would turn two tabs into one screen shown twice. The value is then always
 * a real option, so the caller supplies the default rather than the empty string.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
}: {
  label: string;
  value: string | undefined;
  options: readonly string[];
  onChange: (value: string | undefined) => void;
  allLabel?: string | null;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={CONTROL}
      >
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Search, on submit rather than on keystroke.
 *
 * Every letter typed would otherwise be a request, a cache key and a page reset.
 * A form means Enter searches and the button says so, which is also the only
 * version that works without a debounce nobody can see.
 */
export function SearchBox({
  label,
  value,
  placeholder,
  onSearch,
  live = false,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onSearch: (value: string | undefined) => void;
  live?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? '');
  const onSearchRef = useRef(onSearch);

  // Follows the URL, so the back button and a cleared filter both land in the box.
  useEffect(() => setText(value ?? ''), [value]);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (!live) return;

    const timer = window.setTimeout(() => {
      onSearchRef.current(text.trim() || undefined);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [text, live]);

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim() || undefined);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className={`${CONTROL} min-w-0 flex-1`}
      />
      <button type="submit" className={BUTTON}>
        Search
      </button>
    </form>
  );
}

/**
 * The row the filters sit in. Wraps on a phone, one line on a desktop.
 *
 * Left-aligned, deliberately. Pushing the filters to the far right would spend the
 * width, but it also puts the two controls a reviewer alternates between at opposite
 * ends of a console-wide screen — the width is better spent by the table below, which
 * has columns to put in it.
 */
export function ListToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-wrap items-center gap-3">{children}</div>;
}
