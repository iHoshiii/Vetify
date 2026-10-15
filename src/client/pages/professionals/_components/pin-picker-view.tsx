import type { RefObject } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import type { Point } from './pin-picker';
import PinSearch from './pin-search';

type Props = {
  className: string;
  hostRef: RefObject<HTMLDivElement>;
  value: Point | null;
  tracking: boolean;
  accuracy: number | null;
  message: string | null;
  hideReadout: boolean;
  onPick: (point: Point) => void;
  onLocate: () => void;
};
export default function PinPickerView({
  className,
  hostRef,
  value,
  tracking,
  accuracy,
  message,
  hideReadout,
  onPick,
  onLocate,
}: Props) {
  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <div className="relative h-[clamp(12rem,50dvh,32rem)] w-full overflow-hidden rounded-xl border border-slate-200">
        <div ref={hostRef} className="absolute inset-0" />
        <PinSearch onPick={onPick} />
        <button
          type="button"
          onClick={onLocate}
          disabled={tracking}
          className="absolute bottom-3 right-3 z-[500] inline-flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-lg border border-teal-700 bg-white px-3 py-2 text-xs font-bold text-teal-800 shadow-md disabled:cursor-not-allowed disabled:text-slate-500"
        >
          <Crosshair className={`h-4 w-4 shrink-0 ${tracking ? 'animate-spin' : ''}`} />
          {tracking ? 'Reading…' : 'Use my current location'}
        </button>
      </div>
      {!hideReadout && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-mono font-semibold text-slate-700">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700" />
            {value
              ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
              : 'No pin yet — tap the map or drag the marker'}
          </span>
          {tracking && accuracy !== null && (
            <span className="font-semibold text-slate-500">accurate to about {accuracy} m</span>
          )}
        </div>
      )}
      {message && <p className="text-xs font-semibold text-rose-700">{message}</p>}
    </div>
  );
}
