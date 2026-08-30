import { useCallback, useState } from 'react';

/**
 * One reading of where the person asking is, for ranking vets by distance.
 *
 * A sibling of `useLiveFix` rather than a reuse of it. That one watches at high
 * accuracy for twenty seconds and keeps the best reading, which is the right tool for
 * pinning a clinic door to the metre. This is the other question — roughly where is
 * this person — and a cached coarse fix answers it instantly and produces exactly the
 * same ordering. Asking for high accuracy here would light up the GPS and make somebody
 * wait for a list that would not change.
 *
 * Nothing is stored. The coordinate lives in this state for as long as the page is
 * open, goes to the server as a query string, and is not written down at either end.
 */

export type MyLocationStatus =
  /** Never asked. The browser prompt has not been shown. */
  | 'idle'
  /** The prompt is up, or the device is answering it. */
  | 'asking'
  | 'ready'
  /** They said no, which is an answer and not an error. */
  | 'denied'
  /** The device tried and could not — no signal, or it timed out. */
  | 'failed'
  /** No geolocation at all: an old browser, or a page served without HTTPS. */
  | 'unsupported';

export type MyLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

/** Coarse and cached is the point: five minutes old is the same ordering. */
const OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

export function useMyLocation() {
  const [status, setStatus] = useState<MyLocationStatus>('idle');
  const [location, setLocation] = useState<MyLocation | null>(null);

  const ask = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setStatus('ready');
      },
      // Told apart because the answers differ: a refusal is final and gets the
      // directory instead, while a failure is worth trying again.
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      OPTIONS
    );
  }, []);

  const forget = useCallback(() => {
    setLocation(null);
    setStatus('idle');
  }, []);

  return { status, location, ask, forget };
}
