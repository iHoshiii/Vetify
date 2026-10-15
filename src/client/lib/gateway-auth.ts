export function renewalDelay(token: string): number {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(encoded)) as { exp: number };
    return Math.max(0, exp * 1000 - Date.now() - 60_000);
  } catch {
    return 0;
  }
}
