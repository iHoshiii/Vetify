import { useEffect, useId, useState } from 'react';

const CONTROL =
  'rounded-md border border-teal-900/15 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

/**
 * A filter with an explicit "everything" option.
 *
 * The empty string is that option, and the hook that owns the URL drops it — so
 * clearing a filter removes the param rather than sending `?status=`, which the
 * server's enum would have to refuse.
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
  allLabel?: string;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={CONTROL}
      >
        <option value="">{allLabel}</option>
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
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onSearch: (value: string | undefined) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? '');

  // Follows the URL, so the back button and a cleared filter both land in the box.
  useEffect(() => setText(value ?? ''), [value]);

  return (
    <form
      className="flex items-center gap-2"
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
        className={`${CONTROL} w-56`}
      />
      <button
        type="submit"
        className="rounded-md bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-900"
      >
        Search
      </button>
    </form>
  );
}

/** The row the filters sit in. Wraps on a phone, one line on a desktop. */
export function ListToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
