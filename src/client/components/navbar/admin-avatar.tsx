import { useAuth } from '@/components/providers/AuthProvider';
import { Link } from 'react-router-dom';

/** A name if the account has one, the email otherwise. Every account has an email. */
function initialOf(user: { name: string | null; email: string }): string {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}

/**
 * The way into the console, as the account it belongs to.
 *
 * A circle rather than a labelled button because that is what it is: the signed-in
 * admin, sitting where a profile sits, and the console is what their profile opens.
 * Reads the provider itself instead of taking a prop, so the header does not have
 * to thread the user through two components to reach one.
 *
 * Absent for everybody else — which hides a link and nothing more. /admin is gated
 * by RequireRole, and every endpoint behind it re-reads the stored role, so forging
 * the flag in devtools buys a page full of 403s.
 */
export function AdminAvatar() {
  const { user } = useAuth();

  if (user?.role !== 'admin') return null;

  return (
    <Link
      to="/admin"
      // The label carries the whole meaning: the picture inside is decorative, and
      // an initial read out on its own says nothing.
      aria-label="Open the admin console"
      title="Admin console"
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-600 to-teal-800 text-sm font-black text-white shadow-md shadow-teal-600/25 ring-2 ring-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-teal-500"
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initialOf(user)}</span>
      )}
    </Link>
  );
}
