import { useRequestAppointment } from '@/hooks/useAppointments';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import BookingForm, { type BookingDetails } from './_components/booking-form';
import KindStep from './_components/kind-step';
import MyBookings from './_components/my-bookings';
import SlotPicker from './_components/slot-picker';
import VetCard from './_components/vet-card';
import VetFilters, { NO_FILTERS, type VetFilters as Filters } from './_components/vet-filters';

/** A numbered heading, so the flow reads as a sequence rather than a long form. */
function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-950">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-800 text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Booking a vet, in four steps down one page.
 *
 * One page rather than a wizard with routes: every step's answer changes what the next
 * one should show, and somebody who wants to swap the vet after seeing the times should
 * not have to go backwards through a history to do it. The steps below the current one
 * simply are not rendered yet.
 *
 * Only verified vets who are taking work are listed — `available: true` on the query,
 * and the directory read is already limited to verified listings. A vet who has closed
 * their books is absent rather than shown greyed out: this page exists to be booked
 * from, and an entry nobody can book is not a choice.
 *
 * The interesting failure is the 409. Somebody else took the slot between the grid
 * being drawn and the button being pressed, which is a race rather than a fault, so the
 * page says which slot went, drops the selection and lets the refreshed grid — the
 * mutation invalidates it — show what is left.
 */
export default function BookAppointmentPage() {
  useDocumentTitle('Book an appointment', 'Find a verified vet and ask for a time that suits.');

  // The profile page links back here with a vet already chosen, which is the one piece
  // of this flow worth being linkable.
  const [params] = useSearchParams();

  const [kind, setKind] = useState<AppointmentKind | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [vet, setVet] = useState<PublicProfessional | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  const wanted = params.get('professional');

  const list = useProfessionals({
    available: true,
    limit: 24,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.specialty ? { specialty: filters.specialty } : {}),
    ...(filters.minExperience ? { minExperience: Number(filters.minExperience) } : {}),
    ...(filters.maxRate ? { maxRate: Number(filters.maxRate) } : {}),
  });

  const request = useRequestAppointment();

  const vets = list.data?.items ?? [];
  // A vet named in the URL is chosen for them, so arriving from a profile skips a step
  // rather than making somebody find the same person again in a list.
  const chosen = vet ?? vets.find((item) => item.id === wanted) ?? null;

  function pick(next: PublicProfessional): void {
    setVet(next);
    // The old slot belonged to somebody else's diary.
    setSlot(null);
    setTaken(null);
    request.reset();
  }

  function submit(details: BookingDetails): void {
    if (!chosen || !kind || !slot) return;

    setTaken(null);
    request.mutate(
      {
        professionalId: chosen.id,
        kind,
        startsAt: slot,
        petName: details.petName,
        petSpecies: details.petSpecies,
        reason: details.reason,
        ...(details.phone ? { phone: details.phone } : {}),
      },
      {
        onSuccess: () => setSlot(null),
        onError: (error) => {
          if (error instanceof ApiError && error.reason === 'slot-taken') {
            setTaken(slot);
            setSlot(null);
          }
        },
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
          Book Appointment
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Find a vet, pick a time.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Every vet here has had their licence checked. Ask for a slot and they will confirm it or
          say why not — you will hear either way by email.
        </p>

        {request.isSuccess && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <p className="font-black text-emerald-900">
              Asked. That time is held for you while they answer.
            </p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {request.data.mail.client.delivered
                ? 'We have emailed you a copy.'
                : `We could not email you a copy: ${request.data.mail.client.deliveryError}`}
              {request.data.mail.professional.delivered
                ? ''
                : ' The vet was not reachable by email either, so it may be worth ringing them.'}
            </p>
          </div>
        )}

        {taken && (
          <div role="alert" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-black text-amber-900">Somebody just took that time.</p>
            <p className="mt-1 text-sm text-amber-900/80">
              The times below have been refreshed. Pick another and we will hold it for you.
            </p>
          </div>
        )}

        <Step number={1} title="What kind of appointment?">
          <KindStep value={kind} onPick={setKind} />
        </Step>

        {kind && (
          <Step number={2} title="Who would you like to see?">
            <VetFilters value={filters} onChange={setFilters} />

            {list.isPending && <p className="mt-4 text-sm text-slate-600">Finding vets…</p>}

            {list.isError && (
              <div
                role="alert"
                className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                <p>{messageOf(list.error)}</p>
                <button
                  type="button"
                  onClick={() => void list.refetch()}
                  className="mt-1 font-bold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!list.isPending && vets.length === 0 && (
              <p className="mt-4 text-sm text-slate-600">
                No vet taking bookings matches that. Try a wider search — or clear the rate and
                experience limits, which are the two that narrow it fastest.
              </p>
            )}

            <ul className={`mt-4 grid gap-3 ${list.isFetching ? 'opacity-60' : ''}`}>
              {vets.map((item) => (
                <VetCard key={item.id} vet={item} onPick={pick} picked={chosen?.id === item.id} />
              ))}
            </ul>
          </Step>
        )}

        {kind && chosen && (
          <Step number={3} title={`When suits you with ${chosen.name ?? 'them'}?`}>
            <SlotPicker professionalId={chosen.id} value={slot} onPick={setSlot} />
          </Step>
        )}

        {kind && chosen && slot && (
          <Step number={4} title="Tell them about the visit">
            <BookingForm
              isPending={request.isPending}
              // The 409 has its own banner above, so it is not repeated in the form.
              error={request.isError && !taken ? messageOf(request.error) : null}
              onSubmit={submit}
            />
          </Step>
        )}

        <MyBookings />
      </div>
    </main>
  );
}
