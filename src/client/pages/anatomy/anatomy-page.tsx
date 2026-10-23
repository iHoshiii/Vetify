import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  anatomyOrigin,
  anatomyView,
  authorizeAnatomy,
  handoffKey,
  notifyAnatomy,
} from './anatomy-integration';

export default function AnatomyPage({ canAuthenticate = true }: { canAuthenticate?: boolean }) {
  const [params, setParams] = useSearchParams();
  const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
  const view = anatomyView(params.get('view'));
  const frame = useRef<HTMLIFrameElement>(null);
  const redirecting = useRef(false);
  const [error, setError] = useState('');
  const [authenticationRequested, setAuthenticationRequested] = useState(false);
  const failed = ['failed', 'unavailable'].includes(params.get('auth') ?? '');

  useEffect(() => {
    if (!authenticationRequested || !canAuthenticate || !origin || failed || redirecting.current)
      return;
    const previous = Number(sessionStorage.getItem(handoffKey));
    if (previous && Date.now() - previous < 60_000) {
      setError('Anatomy could not restore your session. Please try again.');
      return;
    }
    redirecting.current = true;
    sessionStorage.setItem(handoffKey, String(Date.now()));
    authorizeAnatomy(origin, view);
  }, [authenticationRequested, canAuthenticate, origin, view, failed]);

  useEffect(() => {
    if (!origin || failed) return;
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'vetify-anatomy:ready') {
        setAuthenticationRequested(false);
        sessionStorage.removeItem(handoffKey);
        notifyAnatomy('ready');
      } else if (event.data?.type === 'vetify-anatomy:authenticate' && !redirecting.current) {
        setAuthenticationRequested(true);
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [origin, view, failed]);

  if (!origin || failed || error) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Vetify Anatomy</h1>
        <p role="alert">{error || 'Anatomy could not be opened. Please try again.'}</p>
        <button
          type="button"
          className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          onClick={() => {
            sessionStorage.removeItem(handoffKey);
            notifyAnatomy('retry');
            redirecting.current = false;
            setAuthenticationRequested(false);
            setError('');
            const next = new URLSearchParams(params);
            next.delete('auth');
            setParams(next, { replace: true });
          }}
        >
          Try again
        </button>
      </main>
    );
  }
  const source = new URL(view, origin);
  source.searchParams.set('embed', '1');
  return (
    <main
      aria-label="Vetify Anatomy"
      style={{
        height: 'calc(var(--viewport-height, 100dvh) - var(--site-header-height, 68px))',
        minHeight: 400,
      }}
    >
      <iframe
        ref={frame}
        title="Vetify Anatomy viewer"
        src={source.href}
        className="block h-full w-full border-0"
        referrerPolicy="strict-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </main>
  );
}
