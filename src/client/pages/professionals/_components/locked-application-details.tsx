import type { OwnProfessional, ProfessionalAddressView } from '@/services/professionals.service';
import type { ProfessionalPhotoKind } from '@shared/limits';
import { useCapture } from '@/hooks/useProfessionals';
import { ShieldCheck, Lock, Mail, ExternalLink, HelpCircle } from 'lucide-react';

const PHOTO_LABELS: Record<ProfessionalPhotoKind, string> = {
  portrait: 'Submitted Photograph',
  licenseFront: 'License Card (Front)',
  licenseBack: 'License Card (Back)',
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{value}</dd>
    </div>
  );
}

function AddressLine({ address }: { address: ProfessionalAddressView }) {
  const parts = [address.line1, address.city, address.province, address.postalCode].filter(Boolean);

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {address.kind === 'home' ? 'Home Address' : 'Clinic Address'}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">
        {parts.join(', ')}
        {address.fix && (
          <span className="mt-0.5 block text-xs text-slate-500 font-normal">
            Located ~{Math.round(address.fix.accuracyMeters)}m
          </span>
        )}
      </dd>
    </div>
  );
}

function Photo({ kind, id }: { kind: ProfessionalPhotoKind; id: string }) {
  const { url, isPending } = useCapture(id);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <p className="px-2 py-1 text-xs font-semibold text-slate-600 mb-1">{PHOTO_LABELS[kind]}</p>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-200 flex items-center justify-center">
        {isPending ? (
          <div className="text-xs text-slate-400 font-medium">Loading...</div>
        ) : url ? (
          <img src={url} alt={PHOTO_LABELS[kind]} className="h-full w-full object-cover" />
        ) : (
          <div className="text-xs text-slate-400">Unavailable</div>
        )}
      </div>
    </div>
  );
}

export function LockedApplicationDetails({ application }: { application: OwnProfessional }) {
  const captures = Object.entries(application.captures) as Array<[ProfessionalPhotoKind, string]>;

  return (
    <div className="space-y-6">
      {/* Admin Contact Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-700 shrink-0" />
          <h3 className="font-bold text-sm text-amber-900">
            Original Application Records are Immutable
          </h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          For identity verification and regulatory reasons, credentials, legal license details, full
          name, and verified clinic addresses cannot be modified directly from the console.
        </p>
        <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-amber-900 flex items-center gap-1">
            <HelpCircle className="w-4 h-4 text-amber-700" /> Need to update your license or
            address?
          </span>
          <a
            href="mailto:support.vetify@gmail.com?subject=Application%20Update%20Request"
            className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold px-3 py-1.5 rounded-md transition-colors text-xs"
          >
            <Mail className="w-3.5 h-3.5" /> Email Support (support.vetify@gmail.com)
          </a>
        </div>
      </div>

      {/* Primary Application Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Verified License & Credentials</h3>
            <p className="text-xs text-slate-500">
              Official records on file with issuing authority
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Record
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Detail label="Full Name on License" value={application.fullName} />
          <Detail label="License Authority / Board" value={application.licenseAuthority} />
          <Detail label="License Number" value={application.licenseNumber} />
          <Detail
            label="Primary Practice / Clinic"
            value={application.clinicName || 'Independent Practice'}
          />
          <Detail label="Business Phone" value={application.businessPhone || 'Not provided'} />
          <Detail
            label="Specialties"
            value={application.specialties.join(', ') || 'General Practice'}
          />
        </div>

        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registered Addresses
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {application.addresses.map((addr, idx) => (
              <AddressLine key={idx} address={addr} />
            ))}
          </div>
        </div>

        {application.credentialUrls.length > 0 && (
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verified Credentials
            </h4>
            <div className="flex flex-wrap gap-2">
              {application.credentialUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Document #{idx + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submitted Identity Captures */}
      {captures.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Submitted Photos</h3>
            <p className="text-xs text-slate-500">
              Verification photographs filed during onboarding
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {captures.map(([kind, id]) => (
              <Photo key={kind} kind={kind} id={id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
