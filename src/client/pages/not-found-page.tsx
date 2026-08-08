import { Link } from 'react-router-dom';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * The App Router had no not-found.tsx, so this route is new: a SPA catch-all
 * needs an explicit destination or unknown paths render a blank shell.
 */
export default function NotFoundPage() {
  useDocumentTitle('Page not found', 'The page you were looking for does not exist.');

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">404</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-slate-600">
        The page you are looking for may have moved, or never existed.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Back to home
      </Link>
    </main>
  );
}
