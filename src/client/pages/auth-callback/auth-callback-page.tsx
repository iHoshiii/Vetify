import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/providers/AuthProvider';
import { refreshSession } from '@/lib/auth';

/**
 * Landing spot for the OAuth callback. The server has already set the refresh
 * cookie and knows who this is; all that is left is to trade that cookie for an
 * access token so the SPA learns it too. Nothing sensitive rides in the URL.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [failed, setFailed] = useState(false);
  // StrictMode runs effects twice in development; one exchange is enough.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    refreshSession()
      .then((session) => {
        setSession(session);
        navigate('/', { replace: true });
      })
      .catch(() => {
        setFailed(true);
        // Leave the message up briefly so it is not a blank flash, then bail out
        // to the form where they can try another way in.
        window.setTimeout(
          () => navigate('/login?error=oauth&reason=session', { replace: true }),
          1800
        );
      });
  }, [navigate, setSession]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl">
        {failed ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900">Could not finish signing in</h1>
            <p className="mt-2 text-sm text-slate-600">Taking you back to the login page…</p>
          </>
        ) : (
          <>
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
              role="status"
              aria-label="Signing you in"
            />
            <h1 className="mt-4 text-lg font-semibold text-slate-900">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-600">One moment while we finish up.</p>
          </>
        )}
      </div>
    </div>
  );
}
