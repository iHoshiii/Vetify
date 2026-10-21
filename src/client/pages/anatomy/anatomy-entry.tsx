import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RequireAuth } from '@/components/providers/RequireAuth';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
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
  return <LoadingIndicator />;
}

function MainEntry() {
  const { isAuthenticated, status, setSession } = useAuth();
  const [checked, setChecked] = useState(isAuthenticated);
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (checked || isAuthenticated || started.current) return;
    started.current = true;
    refreshSession()
      .then(setSession)
      .catch((failure: unknown) => {
        if (!(failure instanceof ApiError && [401, 403].includes(failure.status)))
          setError('Vetify sign-in is unavailable. Please reload to try again.');
      })
      .finally(() => setChecked(true));
  }, [checked, isAuthenticated, setSession]);
  if (error)
    return (
      <main className="p-8 text-center" role="alert">
        {error}
      </main>
    );
  // Finish startup validation before leaving this document. Aborting a rotating
  // refresh here can leave the browser holding the previous cookie.
  if (status === 'loading' || (!isAuthenticated && !checked)) return <LoadingIndicator />;
  return (
    <RequireAuth>
      <Launch />
    </RequireAuth>
  );
}

function Hosted() {
  const { setSession, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const failed = ['failed', 'unavailable'].includes(params.get('auth') ?? '');
  const [ready, setReady] = useState(isAuthenticated);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) setReady(false);
  }, [isAuthenticated]);
  useEffect(() => {
    if (failed || started.current) return;
    started.current = true;
    refreshSession()
      .then((session) => {
        setSession(session);
        if (!session.user.emailVerified) throw new ApiError(403, 'Verify your email to continue.');
        setValidated(true);
        setReady(true);
      })
      .catch((failure: unknown) => {
        setReady(false);
        const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
        if (origin && failure instanceof ApiError && [401, 403].includes(failure.status)) {
          authorizeAnatomy(origin, anatomyView(params.get('view')));
        } else setError('Vetify sign-in is unavailable. Please reload to try again.');
      });
  }, [failed, params, setSession]);
  if (ready || failed) return <AnatomyPage canAuthenticate={validated} />;
  return error ? (
    <main className="p-8 text-center" role="alert">
      {error}
    </main>
  ) : (
    <LoadingIndicator />
  );
}

export default function AnatomyEntry() {
  const [params] = useSearchParams();
  return params.get('hosted') === '1' && window.parent !== window ? <Hosted /> : <MainEntry />;
}
