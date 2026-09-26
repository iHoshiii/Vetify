import { useCallback, useState } from 'react';

export type MyLocationStatus = 'idle' | 'asking' | 'ready' | 'denied' | 'failed' | 'unsupported';

export type MyLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

// A nearby-vet search does not need a slow GPS-level fix. Let the browser reuse a recent
// position and prefer its faster network/Wi-Fi estimate; the search radius is much wider
// than the usual accuracy difference.
const OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 7_000,
  maximumAge: 5 * 60_000,
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
