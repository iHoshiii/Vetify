import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useAuth } from '@/components/providers/AuthProvider';
import { refreshSession } from '@/lib/auth';
import { ApiError } from '@/services/api';
import { anatomyOrigin, anatomyView, authorizeAnatomy, visitAnatomy } from './anatomy-integration';
import AnatomyPage from './anatomy-page';

function Launch() {
  const [params] = useSearchParams();
  const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
  const view = anatomyView(params.get('view'));
  useEffect(() => {
    if (origin) visitAnatomy(origin, view);
  }, [origin, view]);
  return (
    <main className="p-8 text-center" role="status">
      Opening Vetify Anatomy...
    </main>
  );
}

function Hosted() {
  const { setSession } = useAuth();
  const [params] = useSearchParams();
  const failed = ['failed', 'unavailable'].includes(params.get('auth') ?? '');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (failed || started.current) return;
    started.current = true;
    refreshSession({ fresh: true })
      .then((session) => {
        setSession(session);
        if (!session.user.emailVerified) throw new ApiError(403, 'Verify your email to continue.');
        setReady(true);
      })
      .catch((failure: unknown) => {
        const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
        if (origin && failure instanceof ApiError && [401, 403].includes(failure.status)) {
          authorizeAnatomy(origin, anatomyView(params.get('view')));
        } else setError('Vetify sign-in is unavailable. Please reload to try again.');
      });
  }, [failed, params, setSession]);
  if (ready || failed) return <AnatomyPage />;
  return (
    <main className="p-8 text-center" role={error ? 'alert' : 'status'}>
      {error || 'Connecting to your Vetify session...'}
    </main>
  );
}

export default function AnatomyEntry() {
  const [params] = useSearchParams();
  return params.get('hosted') === '1' && window.parent !== window ? (
    <Hosted />
  ) : (
    <RequireAuth>
      <Launch />
    </RequireAuth>
  );
}
