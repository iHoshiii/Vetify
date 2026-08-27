import Input from '@/components/ui/Input';
import { PROFESSIONAL_LOCATION_MAX_ACCURACY_M } from '@shared/limits';
import { useCallback, useEffect, useRef, useState } from 'react';

/** A device reading, in the shape the application schema expects it. */
export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

/** One address on the form. Strings throughout, because that is what inputs hold. */
export type AddressValue = {
  kind: 'home' | 'clinic';
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  fix: LocationFix | null;
};

export function emptyAddress(kind: AddressValue['kind']): AddressValue {
  return { kind, line1: '', city: '', province: '', postalCode: '', fix: null };
}

/**
 * Accuracy at which the tracker stops on its own.
 *
 * Well inside the {@link PROFESSIONAL_LOCATION_MAX_ACCURACY_M} the server accepts:
 * a phone standing still outdoors reaches this within seconds, and waiting past it
 * only spends battery for digits nobody reads.
 */
const GOOD_ENOUGH_M = 20;

/**
 * Watches the device until the reading is precise enough to keep.
 *
 * `watchPosition` rather than `getCurrentPosition`, because the first fix is
 * usually the network's guess at the neighbourhood and the good one arrives a few
 * seconds later once the GPS has settled. Only an improvement is kept, so a later
 * worse reading cannot undo a better one, and the applicant watches the number
 * fall rather than wondering whether anything is happening.
 */
export function useLiveFix(onFix: (fix: LocationFix) => void) {
  const watch = useRef<number | null>(null);
  const bestRef = useRef<number>(Number.POSITIVE_INFINITY);
  const [tracking, setTracking] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const stop = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setTracking(false);
  }, []);

  // A watch outlives the component that started it unless somebody clears it.
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    setMessage('');

    if (!navigator.geolocation) {
      setMessage('This browser cannot report a location. Open the link on your phone instead.');
      return;
    }

    bestRef.current = Number.POSITIVE_INFINITY;
    setAccuracy(null);
    setTracking(true);

    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        const accuracyMeters = position.coords.accuracy;
        setAccuracy(Math.round(accuracyMeters));

        if (accuracyMeters >= bestRef.current) return;
        bestRef.current = accuracyMeters;

        onFix({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters,
          capturedAt: new Date().toISOString(),
        });

        if (accuracyMeters <= GOOD_ENOUGH_M) stop();
      },
      () => {
        setMessage('We could not read your location. Allow location access and try again.');
        stop();
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  }, [onFix, stop]);

  return { tracking, accuracy, message, start, stop };
}

type Props = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  /** Absent on the first address, which cannot be removed — one is the minimum. */
  onRemove?: () => void;
  errors?: Record<string, string | undefined>;
};

const KIND_COPY: Record<AddressValue['kind'], { title: string; hint: string }> = {
  home: {
    title: 'Home address',
    hint: 'A live location fix is required here. Stand at the address and start the tracker — a house on an unnamed road cannot be found any other way.',
  },
  clinic: {
    title: 'Clinic address',
    hint: 'This is the address pet owners are shown. A fix is welcome but not required: a clinic can be found by its name and its street.',
  },
};

/** One address, with the tracker attached to it rather than to the form. */
export default function AddressCard({ value, onChange, onRemove, errors = {} }: Props) {
  const copy = KIND_COPY[value.kind];
  const id = `address-${value.kind}`;

  const { tracking, accuracy, message, start, stop } = useLiveFix((fix) =>
    onChange({ ...value, fix })
  );

  function set(field: 'line1' | 'city' | 'province' | 'postalCode') {
    return (event: { target: { value: string } }) =>
      onChange({ ...value, [field]: event.target.value });
  }

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-bold text-slate-900">{copy.title}</legend>
      <p className="text-xs leading-5 text-slate-500">{copy.hint}</p>

      <div className="mt-3 space-y-3">
        <Input
          id={`${id}-line1`}
          label="Street and number"
          value={value.line1}
          onChange={set('line1')}
          error={errors.line1}
          placeholder="12 Mabini Street"
          required
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            id={`${id}-city`}
            label="City or municipality"
            value={value.city}
            onChange={set('city')}
            error={errors.city}
            placeholder="Cebu City"
            required
          />
          <Input
            id={`${id}-province`}
            label="Province"
            value={value.province}
            onChange={set('province')}
            error={errors.province}
            placeholder="Cebu"
            required
          />
          <Input
            id={`${id}-postal`}
            label="Postal code"
            value={value.postalCode}
            onChange={set('postalCode')}
            error={errors.postalCode}
            placeholder="6000"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={tracking ? stop : start}
            className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-teal-900"
          >
            {tracking ? 'Stop' : value.fix ? 'Take it again' : 'Start the tracker'}
          </button>

          <p aria-live="polite" className="text-xs text-slate-600">
            {tracking
              ? accuracy === null
                ? 'Waiting for the first reading…'
                : `Accurate to about ${accuracy} m, still improving…`
              : value.fix
              ? `Fix kept: accurate to about ${Math.round(value.fix.accuracyMeters)} m.`
              : 'No fix taken yet.'}
          </p>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          The tracker stops on its own once the reading is good enough, and anything worse than{' '}
          {PROFESSIONAL_LOCATION_MAX_ACCURACY_M} m is refused — that describes a neighbourhood
          rather than an address.
        </p>

        {(message || errors.fix) && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600">
            {message || errors.fix}
          </p>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600"
        >
          Remove this address
        </button>
      )}
    </fieldset>
  );
}
