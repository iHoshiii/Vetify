import type { Pet, PetInput } from '@shared/pets';
import { localToday, petAge } from '@shared/pet-age';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Cat, PawPrint, Plus, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getPets, savePet } from '@/services/pets.service';

import { PetForm } from './pet-form';

function ageLabel(pet: Pet, today: string): string {
  const age = petAge(pet, today);
  const years = age.years ? `${age.years} ${age.years === 1 ? 'year' : 'years'}` : '';
  const months =
    age.months || !age.years ? `${age.months} ${age.months === 1 ? 'month' : 'months'}` : '';
  return `${years}${years && months ? ', ' : ''}${months}`;
}

function petAppearance(pet: Pet) {
  const species = pet.species === 'other' ? pet.otherSpecies.trim().toLowerCase() : pet.species;
  if (species === 'dog') {
    return {
      Icon: null,
      species: 'Dog',
      avatar: 'bg-[#e7f5ef] text-[#176c60]',
      accent: 'from-[#247e70] to-[#78b8a8]',
    };
  }
  if (species === 'cat') {
    return {
      Icon: Cat,
      species: 'Cat',
      avatar: 'bg-[#fff0e5] text-[#b96b42]',
      accent: 'from-[#d88a57] to-[#f2bf94]',
    };
  }
  return {
    Icon: PawPrint,
    species: pet.otherSpecies || 'Other',
    avatar: 'bg-[#efeafd] text-[#7659ac]',
    accent: 'from-[#8b73ba] to-[#c1abe1]',
  };
}

export default function PlannerPage() {
  useDocumentTitle('Meal planner', 'Manage your pets before planning their meals.');
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const queryClient = useQueryClient();
  const pets = useQuery({ queryKey: ['pets'], queryFn: getPets });
  const [formOpen, setFormOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (input: PetInput) => savePet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pets'] });
      setFormOpen(false);
    },
  });

  function openForm() {
    mutation.reset();
    setFormOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-[#dbeae4] bg-gradient-to-br from-[#eaf7f1] via-white to-[#f8fbf8] px-6 py-7 shadow-sm sm:px-8 sm:py-9">
          <PawPrint
            size={148}
            strokeWidth={1.1}
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-10 rotate-[-18deg] text-teal-800/[0.07]"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#163b35] sm:text-4xl">
                Meal planner
              </h1>
              {pets.data && !formOpen && (
                <p className="mt-2 text-sm font-medium text-[#54716a]">
                  {pets.data.length} {pets.data.length === 1 ? 'pet' : 'pets'}
                </p>
              )}
            </div>
            {!formOpen && Boolean(pets.data?.length) && (
              <button
                type="button"
                onClick={() => openForm()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176f62] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-[#11594f] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                Add Pet
              </button>
            )}
          </div>
        </header>

        {pets.isLoading && <p className="text-sm text-slate-600">Loading your pets...</p>}
        {pets.isError && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-800">
            Your pets could not be loaded.{' '}
            <button
              type="button"
              onClick={() => void pets.refetch()}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}
        {pets.data &&
          !formOpen &&
          (pets.data.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {pets.data.map((pet) => {
                const { Icon, species, avatar, accent } = petAppearance(pet);
                return (
                  <article
                    key={pet.id}
                    className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e2eae6] bg-white p-5 shadow-[0_8px_28px_rgba(23,65,55,0.06)] transition-shadow hover:shadow-[0_14px_36px_rgba(23,65,55,0.11)] sm:p-6"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${avatar}`}
                      >
                        {Icon ? (
                          <Icon size={34} strokeWidth={1.7} aria-hidden="true" />
                        ) : (
                          <span aria-hidden="true" className="text-[34px] leading-none">
                            🐕
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="break-words text-xl font-extrabold leading-tight text-[#183b35]">
                          {pet.name}
                        </h2>
                        <p className="mt-1 break-words text-sm font-medium text-[#647b74]">
                          {species}
                          {pet.breed ? ` · ${pet.breed}` : ''}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[#edf1ee] pt-5">
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#718881]">
                          <CalendarDays size={14} aria-hidden="true" /> Age
                        </dt>
                        <dd className="mt-1.5 break-words text-sm font-bold text-[#203c37]">
                          {ageLabel(pet, today)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#718881]">
                          <Scale size={14} aria-hidden="true" /> Weight
                        </dt>
                        <dd className="mt-1.5 text-sm font-bold text-[#203c37]">
                          {pet.weightKg} kg
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-[#e2eae6] bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f5ef] text-[#176c60]">
                <PawPrint size={34} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#183b35]">No pets added yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Start with your pet&apos;s basic details.
              </p>
              <button
                type="button"
                onClick={() => openForm()}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176f62] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-900/15 transition hover:bg-[#11594f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                Add Pet
              </button>
            </div>
          ))}

        {formOpen && (
          <PetForm
            pending={mutation.isPending}
            serverError={mutation.error?.message}
            onSave={(input) => mutation.mutate(input)}
            onCancel={() => setFormOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
