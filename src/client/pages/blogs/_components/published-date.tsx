const FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/**
 * A publication date as a `<time>`, so the machine-readable value survives the
 * formatting. Renders nothing for a draft, which has no date to show yet.
 */
export function PublishedDate({ value, className }: { value: string | null; className?: string }) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return (
    <time dateTime={value} className={className}>
      {date.toLocaleDateString(undefined, FORMAT)}
    </time>
  );
}
