import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function RecoveryCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        {children}
        <Link to="/login" className="block text-sm font-medium text-blue-600 hover:text-blue-500">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
