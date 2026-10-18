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
  const destination = new URL('/auth/login', origin);
  destination.searchParams.set('returnTo', view);
  window.location.replace(destination.href);
}

export const handoffKey = 'vetify-anatomy-handoff';
