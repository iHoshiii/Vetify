import { useCallback, useState } from 'react';

export type MyLocationStatus = 'idle' | 'asking' | 'ready' | 'denied' | 'failed' | 'unsupported';

export type MyLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

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
