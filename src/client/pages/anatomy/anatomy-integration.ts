import { externalAppOrigin } from '@/lib/external-app';

export function anatomyOrigin(configured: string | undefined, development: boolean) {
  return externalAppOrigin(
    configured?.trim() || (development ? 'http://localhost:5176' : 'https://anatomy.vetify.page'),
    development
  );
}

export function anatomyView(value: string | null) {
  return value &&
    /^\/(?:dog|cat|bird)\/(?:skeletal|muscular|digestive|cardiovascular|nervous)$/.test(value)
    ? value
    : '/';
}

export function authorizeAnatomy(origin: string, view: string) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'vetify-anatomy:authenticate', view }, origin);
    return;
  }
  const destination = new URL('/auth/login', origin);
  destination.searchParams.set('returnTo', view);
  window.location.replace(destination.href);
}

export function visitAnatomy(origin: string, view: string) {
  window.location.replace(new URL(view, origin).href);
}

export function notifyAnatomy(type: 'ready' | 'retry') {
  const origin = anatomyOrigin(import.meta.env.VITE_ANATOMY_ORIGIN, import.meta.env.DEV);
  if (origin && window.parent !== window)
    window.parent.postMessage({ type: `vetify-anatomy:${type}` }, origin);
}

export const handoffKey = 'vetify-anatomy-handoff';
