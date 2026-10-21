export default function LoadingIndicator() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div role="status" aria-label="Loading">
        <span
          aria-hidden="true"
          className="block h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent motion-reduce:animate-none"
        />
      </div>
    </main>
  );
}
