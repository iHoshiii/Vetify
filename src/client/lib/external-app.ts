export function externalAppOrigin(value: string | undefined, development: boolean): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(development && local && url.protocol === 'http:'))
      return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch {
    return null;
  }
}
