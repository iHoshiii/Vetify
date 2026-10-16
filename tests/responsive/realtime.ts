import type { Route } from '@playwright/test';

export function pollingBridge() {
  const packets: string[] = [];
  let pending: (() => void) | undefined;
  return async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = 'ok';
    if (request.method() === 'POST') {
      for (const packet of (request.postData() ?? '').split('\x1e')) {
        if (packet.startsWith('40')) packets.push('40{"sid":"responsive-socket"}');
        const match = /^42(\d+)(\[.*)$/.exec(packet);
        if (match) {
          const [event] = JSON.parse(match[2]);
          const result =
            event === 'call:join'
              ? {
                  ok: true,
                  iceServers: [],
                  peerOnline: false,
                  polite: false,
                  endsAt: new Date(Date.now() + 3600000).toISOString(),
                  peer: { name: 'Dr Responsive', avatarUrl: null, role: 'vet' },
                }
              : { ok: true, delivered: true };
          packets.push(`43${match[1]}${JSON.stringify([result])}`);
        }
      }
      pending?.();
    } else if (!url.searchParams.has('sid')) {
      body = `0${JSON.stringify({
        sid: 'responsive-session',
        upgrades: [],
        pingInterval: 25000,
        pingTimeout: 20000,
      })}`;
    } else {
      if (!packets.length)
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 1000);
          pending = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      pending = undefined;
      body = packets.splice(0).join('\x1e') || '2';
    }
    await route.fulfill({ contentType: 'text/plain', body }).catch(() => {});
  };
}
