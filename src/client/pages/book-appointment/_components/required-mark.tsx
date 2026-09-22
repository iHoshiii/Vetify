// A red asterisk on a field that still needs filling; it clears once the field has a value.
export default function RequiredMark({ filled }: { filled: boolean }) {
  if (filled) return null;
  return (
    <span aria-hidden className="ml-0.5 text-rose-600">
      *
    </span>
  );
}
