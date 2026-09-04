import { X } from 'lucide-react';
import { useState } from 'react';
import PinPicker, { type Point } from './pin-picker';
import type { MarkerGlyph } from '@/components/marker-icon';
import { MapSkeleton } from '@/components/vetmap/map-skeleton';

export type PickedAddress = {
  line1: string;
  city: string;
  province: string;
  postalCode: string;
};

/** Pin a place and turn the selected coordinates into a readable address. */
export default function LocationPickerField({
  label,
  value,
  address = '',
  kind = 'clinic',
  onChange,
}: {
  label: string;
  value: Point | null;
  address?: string;
  kind?: MarkerGlyph;
  onChange: (point: Point, address: PickedAddress) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [choice, setChoice] = useState<'pin' | null>(value ? 'pin' : null);
  const [mapReady, setMapReady] = useState(false);

  async function pick(point: Point): Promise<void> {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.latitude}&lon=${point.longitude}`
      );
      if (!response.ok) throw new Error('Address lookup failed');
      const data = (await response.json()) as { address?: Record<string, string> };
      const address = data.address ?? {};
      const locality =
        address.city ?? address.town ?? address.municipality ?? address.village ?? '';
      onChange(point, {
        line1:
          [address.house_number, address.road].filter(Boolean).join(' ') ||
          address.neighbourhood ||
          address.suburb ||
          locality,
        city: locality,
        province: address.state ?? address.region ?? '',
        postalCode: address.postcode ?? '',
      });
    } catch {
      setMessage('We could not read the address for that pin. Try moving it slightly.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      {!choice && (
        <button
          type="button"
          onClick={() => {
            setMapReady(false);
            setChoice('pin');
          }}
          className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-900"
        >
          Pin on the map
        </button>
      )}
      {choice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-8">
          <div className="animate-scaleIn relative w-full max-w-6xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <button
              type="button"
              onClick={() => setChoice(null)}
              aria-label="Close map"
              className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-2 text-slate-500 shadow-sm hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {!mapReady && (
              <div className="absolute inset-0 z-20 overflow-hidden rounded-xl">
                <MapSkeleton />
              </div>
            )}
            <div className={mapReady ? '' : 'opacity-0'}>
              <PinPicker
                value={value}
                kind={kind}
                onChange={(point) => void pick(point)}
                hideReadout
                className="pt-2"
                onReady={() => setMapReady(true)}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {loading ? 'Finding the address…' : address || 'Move the pin to choose an address.'}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setChoice(null)}
                disabled={!value || loading}
                className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use this pinned location
              </button>
            </div>
          </div>
        </div>
      )}
      {loading && <p className="mt-2 text-xs text-slate-500">Finding the address…</p>}
      {message && <p className="mt-2 text-xs font-medium text-red-600">{message}</p>}
    </div>
  );
}
