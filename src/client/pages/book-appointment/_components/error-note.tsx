/** What to show for a thrown value that may not be an Error. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** A read that failed, with the way to try it again. */
export default function ErrorNote({
  message,
  onRetry,
  className = 'mt-3',
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`${className} rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800`}
    >
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-1 font-bold underline">
        Try again
      </button>
    </div>
  );
}
