import { useApplyThroughInvite } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { InviteSummary } from '@/services/professionals.service';
import { professionalApplySchema, type ProfessionalApplyInput } from '@shared/schemas';
import { useState, type FormEvent } from 'react';

import type { AddressValue } from './address-fields';
import {
  addressPayload,
  firstErrors,
  readyToSubmit,
  reviewedAddresses,
  stillToDo,
  type Errors,
  type Photos,
} from './apply-payload';
import ConfirmApplyDialog from './confirm-apply-dialog';
import ConsentStep from './consent-step';
import type { Capture } from './photo-capture';
import PhotosStep from './photos-step';
import ReviewedDetails from './reviewed-details';
import ReviewedLocations from './reviewed-locations';

type Props = { token: string; invite: InviteSummary };

const NO_PHOTOS: Photos = { portrait: null, licenseFront: null, licenseBack: null };

// Stage two: the application itself, behind the emailed link.
//
// The three identity fields are shown and not editable. They came from the enquiry a
// reviewer read and approved, and letting them be changed here would mean the name on
// the application was never the name anybody agreed to invite.
//
// Everything else is filled in once and then frozen: the dashboard renders it read-only
// afterwards, because the licence has been checked against a register and the
// photographs against a face.
export default function InvitedApplyForm({ token, invite }: Props) {
  const [addresses] = useState<AddressValue[]>(() => reviewedAddresses(invite));
  const [photos, setPhotos] = useState<Photos>(NO_PHOTOS);
  const [consent, setConsent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');

  const apply = useApplyThroughInvite(token);

  function setPhoto(which: keyof Photos) {
    return (capture: Capture | null) => setPhotos((current) => ({ ...current, [which]: capture }));
  }

  function application() {
    return {
      // Sent rather than trusted from the token alone: the schema wants the name on
      // the application, and this is the one the reviewer saw.
      fullName: invite.name,
      licenseNumber: invite.licenseNumber,
      licenseAuthority: invite.licenseAuthority ?? 'Professional Regulation Commission',
      clinicName: invite.clinicName ?? undefined,
      businessPhone: invite.phone ?? undefined,
      addresses: addresses.map(addressPayload),
      portrait: photos.portrait ?? undefined,
      licenseFront: photos.licenseFront ?? undefined,
      licenseBack: photos.licenseBack ?? undefined,
      yearsExperience: invite.yearsExperience ?? 0,
      backgroundCheckConsent: consent,
    } as ProfessionalApplyInput;
  }

  // Submitting only opens the last check: the application goes in from the dialog
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setMessage('');

    if (!consent) {
      setErrors({ backgroundCheckConsent: 'Consent to a background check is required' });
      setMessage('Please confirm the background-check consent before submitting.');
      return;
    }

    const parsed = professionalApplySchema.safeParse(application());
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      setMessage('Please correct the highlighted fields.');
      return;
    }

    // Asked again every time, so a dialog that was backed out of does not stay ticked
    setCorrect(false);
    setConfirming(true);
  }

  function submitNow() {
    setConfirming(false);
    apply.mutate(application(), {
      onError: (err) => {
        setMessage(err.message);
        if (err instanceof ApiError && err.issues) setErrors(firstErrors(err.issues));
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-5">
      {message && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
        >
          {message}
        </div>
      )}

      <ReviewedDetails invite={invite} />
      <PhotosStep photos={photos} onChange={setPhoto} errors={errors} />
      <ReviewedLocations addresses={addresses} error={errors.addresses} />
      <ConsentStep
        consent={consent}
        onConsent={setConsent}
        error={errors.backgroundCheckConsent}
        pending={apply.isPending}
        ready={readyToSubmit(invite, addresses, photos, consent)}
        missing={stillToDo(photos, consent)}
      />

      <ConfirmApplyDialog
        open={confirming}
        correct={correct}
        onCorrect={setCorrect}
        pending={apply.isPending}
        onBack={() => setConfirming(false)}
        onSubmit={submitNow}
      />
    </form>
  );
}
