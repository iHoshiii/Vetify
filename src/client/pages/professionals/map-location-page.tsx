import { useUpdateMapLocation } from '@/hooks/useProfessionals';
import type { ProfessionalAddressView } from '@/services/professionals.service';
import { AlertTriangle, CheckCircle2, ExternalLink, Globe2, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import PinPicker, { type Point } from './_components/pin-picker';
import { useConsoleApplication } from './professional-layout';

/**
 * Where a vet decides whether they are on the map, and exactly where.
 *
 * Two decisions per address, and they are separate on purpose: a vet may want their
 * clinic findable and their house not, and a single switch would make that impossible to
 * say. Both start off. Nothing about an address reaches the public map until somebody
 * here turns it on.
 *
 * A page rather than a row in the settings tray, which is about 22rem across and capped
 * at 70vh — enough for a rate and a schedule, not for a map you drag a pin around. The
 * tray links here instead, so there is one writer and not two that can disagree.
 */

const KIND_COPY: Record<ProfessionalAddressView['kind'], { title: string; blurb: string }> = {
  clinic: {
    title: 'Clinic',
    blurb: 'Where pet owners come to you. This is the one most vets want on the map.',
  },
  home: {
    title: 'Home',
    blurb:
      'Only worth publishing if you consult from here. Your street address is already on your listing either way — this decides whether a pin joins it.',
  },
};

/** The two fields the picker cares about, out of a fix or a stored pin. */
function point(source: { latitude: number; longitude: number } | null): Point | null {
  return source ? { latitude: source.latitude, longitude: source.longitude } : null;
}

function AddressMapCard({
  address,
  fallback,
}: {
  address: ProfessionalAddressView;
  /** A reading from another address, for a card with nothing of its own to open on. */
  fallback: Point | null;
}) {
  const copy = KIND_COPY[address.kind];
  const update = useUpdateMapLocation();

  /**
   * The marker starts where the vet left it, and failing that at the reading taken on
   * the day this address was verified — a device fix from the doorstep, so it is usually
   * right already and the vet confirms rather than hunts. That fix itself never leaves
   * the server for anybody else; what gets published is whatever is saved from here.
   */
  const [pin, setPin] = useState<Point | null>(point(address.mapPin) ?? point(address.fix));
  const [showOnMap, setShowOnMap] = useState(address.showOnMap);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    showOnMap !== address.showOnMap ||
    pin?.latitude !== point(address.mapPin)?.latitude ||
    pin?.longitude !== point(address.mapPin)?.longitude;

  function save() {
    setError(null);
    setSaved(false);

    update.mutate(
      // `pin` absent leaves the stored placement alone. It is only ever absent here for
      // an address with no pin and no fix, where there is nothing to send.
      { kind: address.kind, ...(pin ? { pin } : {}), showOnMap },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => setError(err.message || 'That did not save. Try again.'),
      }
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900">{copy.title} address</h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">
            {[address.line1, address.city, address.province, address.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.blurb}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
            address.showOnMap ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {address.showOnMap ? 'On the map' : 'Not on the map'}
        </span>
      </header>

      <PinPicker value={pin} onChange={setPin} fallback={fallback} />

      <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          type="checkbox"
          checked={showOnMap}
          disabled={!pin}
          onChange={() => setShowOnMap((on) => !on)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-800 focus:ring-teal-700 disabled:opacity-50"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-800">
            Show this on the public map
          </span>
          <span className="block text-xs leading-relaxed text-slate-500">
            {pin
              ? 'The pin appears on the public map and on your profile, and you turn up when a pet owner searches near here. Turn it off and the pin comes straight back off — the placement is kept, so you will not have to drag it again.'
              : 'Pin your location on the map first. A switch that silently does nothing is worse than one you cannot press yet.'}
          </span>
        </span>
      </label>

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Saved.
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={update.isPending || !dirty}
        className="w-full rounded-lg bg-teal-800 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-900 disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {update.isPending ? 'Saving…' : dirty ? 'Save this address' : 'Saved'}
      </button>
    </section>
  );
}

export default function ProfessionalMapLocationPage() {
  const application = useConsoleApplication();
  const addresses = application.addresses ?? [];

  /**
   * The first reading of any address, for a card that has neither a pin nor a fix of its
   * own: a vet's clinic and house are usually in the same town, so opening the map there
   * beats opening it on the whole country. It only steers the view — nothing is saved
   * until the vet places the marker themselves.
   */
  const anyFix = point(addresses.find((address) => address.fix)?.fix ?? null);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Globe2 className="h-5 w-5 text-teal-800" />
          Map &amp; Location
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          Drop a pin where pet owners should actually walk up to, then decide whether it goes on the
          map. Each address is its own decision, and both are off until you turn them on.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <Info className="mt-px h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Publishing puts a pin on the public map and on your profile — that is all it adds. Your
            address lines are already on your listing, and the location reading we took while
            verifying you stays private whatever you choose here.
          </span>
        </p>
        <Link
          to="/map"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 hover:underline"
        >
          See the public map
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </header>

      {addresses.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 shadow-xs">
          There are no addresses on your application, so there is nothing to pin yet.
        </p>
      ) : (
        addresses.map((address) => (
          <AddressMapCard key={address.kind} address={address} fallback={anyFix} />
        ))
      )}
    </div>
  );
}
