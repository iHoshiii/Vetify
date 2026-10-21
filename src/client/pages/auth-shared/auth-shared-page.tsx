import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import { refreshSession } from '@/lib/auth';
import { ApiError, apiFetch } from '@/services/api';

export default function SharedAuthPage() {
  const [params] = useSearchParams();
  const uid = params.get('interaction') ?? '';
  const valid = /^[A-Za-z0-9_-]{16,128}$/.test(uid);
  const resume = `/auth/shared?interaction=${encodeURIComponent(uid)}`;
  const navigate = useNavigate();
  const { user, setSession, logout } = useAuth();
  const started = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (ready && form.current && !submitted.current) {
      submitted.current = true;
      form.current.requestSubmit();
    }
  }, [ready]);

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      await apiFetch('/auth/logout-all', { method: 'POST' });
      await logout();
      navigate('/login', { replace: true, state: { from: resume } });
    } catch {
      setError('Could not sign out everywhere. Please try again.');
      setSigningOut(false);
    }
  }

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    refreshSession()
      .then((session) => {
        setSession(session);
        if (!session.user.emailVerified) {
          navigate('/signup', { replace: true, state: { from: resume } });
        } else setReady(true);
      })
      .catch((failure: unknown) => {
        if (failure instanceof ApiError && failure.status === 401) {
          navigate('/login', { replace: true, state: { from: resume } });
        } else {
          setError(
            failure instanceof ApiError
              ? failure.message
              : 'Vetify sign-in is unavailable. Please reload to try again.'
          );
        }
      });
  }, [navigate, resume, setSession, valid]);

  return (
    <main className="mx-auto my-12 max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Continue with Vetify</h1>
      {!valid || error ? (
        <p role="alert">
          {error || 'This sign-in link is invalid. Return to the app and try again.'}
        </p>
      ) : ready ? (
        <>
          <p>Continuing with your Vetify account, {user?.email}...</p>
          <p>Signing out of Vetify also ends app access from this session.</p>
          <form
            ref={form}
            method="post"
            action={`/api/oidc/interaction/${uid}/complete`}
            className="flex gap-4"
          >
            <input type="hidden" name="decision" value="allow" />
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-white">
              Continue
            </button>
            <button
              type="submit"
              className="rounded-lg border px-4 py-2"
              onClick={(event) => {
                const decision = event.currentTarget.form?.elements.namedItem('decision');
                if (decision instanceof HTMLInputElement) decision.value = 'deny';
              }}
            >
              Cancel
            </button>
          </form>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOutEverywhere()}
            className="text-sm underline"
          >
            Sign out of Vetify everywhere
          </button>
        </>
      ) : (
        <p role="status">Checking your Vetify session...</p>
      )}
      <Link to="/login" state={{ from: resume }} className="block text-sm underline">
        Use another account
      </Link>
    </main>
  );
}
