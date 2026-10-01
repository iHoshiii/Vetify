import {
  isShihTzu,
  petInputSchema,
  SHIH_TZU_TYPICAL_ADULT_MAX_KG,
  SHIH_TZU_WEIGHT_ENTRY_MAX_KG,
  SHIH_TZU_WEIGHT_ERROR,
  type Pet,
  type PetInput,
} from '@shared/pets';
import { ageFromBirthMonth, estimatedBirthMonthFromAge, localToday, petAge } from '@shared/pet-age';
import { useState, type FormEvent } from 'react';

import { FIELD } from '@/components/settings/consumer/controls';

type FormValues = Omit<
  PetInput,
  | 'species'
  | 'otherSpecies'
  | 'weightKg'
  | 'allergies'
  | 'healthConditions'
  | 'ageYears'
  | 'ageMonths'
  | 'birthMonth'
> & {
  species: string;
  birthMonth: string;
  birthMonthEstimated: boolean;
  ageValue: string;
  ageUnit: 'years' | 'months';
  ageRemainderMonths: number;
  weightKg: string;
  allergies: string;
  healthConditions: string;
};

const emptyForm: FormValues = {
  name: '',
  species: '',
  breed: '',
  birthMonth: '',
  birthMonthEstimated: false,
  ageValue: '',
  ageUnit: 'years',
  ageRemainderMonths: 0,
  sex: 'unknown',
  neuterStatus: 'prefer_not_to_say',
  weightKg: '',
  allergies: '',
  healthConditions: '',
  foodPreferences: '',
  currentFood: '',
  activityLevel: 'unknown',
  bodyConditionScore: null,
  feedingGoal: 'unsure',
  pregnantOrNursing: 'unknown',
};

function startingValues(pet?: Pet): FormValues {
  if (!pet) return { ...emptyForm };
  const age = petAge(pet, localToday());
  const ageUnit = age.years === 0 ? 'months' : 'years';
  const birthMonthEstimated = !pet.birthMonth;
  return {
    ...pet,
    species: pet.species === 'other' ? pet.otherSpecies : pet.species === 'dog' ? 'Dog' : 'Cat',
    birthMonth: pet.birthMonth ?? estimatedBirthMonthFromAge(age.years, age.months, localToday()),
    birthMonthEstimated,
    ageValue: String(ageUnit === 'months' ? age.years * 12 + age.months : age.years),
    ageUnit,
    ageRemainderMonths: ageUnit === 'years' ? age.months : 0,
    weightKg: String(pet.weightKg),
    allergies: pet.allergies.join(', '),
    healthConditions: pet.healthConditions.join(', '),
  };
}

const toList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

const capitalizeFirstLetter = (value: string) =>
  value.replace(/\p{L}/u, (letter) => letter.toUpperCase());

const capitalizeListEntries = (value: string) =>
  value.replace(
    /(^|[,\n])(\s*)(\p{L})/gu,
    (_, separator, spaces, letter: string) => `${separator}${spaces}${letter.toUpperCase()}`
  );

function birthMonthForAge(value: string, unit: FormValues['ageUnit']): string {
  if (!value.trim()) return '';
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > (unit === 'years' ? 200 : 2411)) return '';
  return estimatedBirthMonthFromAge(
    unit === 'years' ? age : 0,
    unit === 'months' ? age : 0,
    localToday()
  );
}

function RequiredMarker({ show }: { show: boolean }) {
  return show ? (
    <span aria-hidden="true" className="text-red-600">
      {' '}
      *
    </span>
  ) : null;
}

function OptionalMarker() {
  return <span className="ml-1 text-xs font-normal text-slate-500">(Optional)</span>;
}

const provided = (value: string) => value.trim() || 'Not provided';

const optionLabel = (value: string) => capitalizeFirstLetter(value.replaceAll('_', ' '));

function birthMonthLabel(value: string, estimated: boolean): string {
  if (!value) return 'Not provided';
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return estimated ? `${label} (estimated)` : label;
}

function ageLabel(form: FormValues): string {
  if (form.ageValue === '') return 'Not provided';
  const age = Number(form.ageValue);
  if (form.ageUnit === 'months') return `${age} ${age === 1 ? 'month' : 'months'}`;
  const years = `${age} ${age === 1 ? 'year' : 'years'}`;
  return form.ageRemainderMonths
    ? `${years}, ${form.ageRemainderMonths} ${form.ageRemainderMonths === 1 ? 'month' : 'months'}`
    : years;
}

const steps = [
  'Pet information',
  'Age and care',
  'Food and feeding',
  'Health and activity',
  'Confirm or edit',
] as const;
const reviewStep = steps.length - 1;

const fieldStep: Record<string, number> = {
  name: 0,
  species: 0,
  otherSpecies: 0,
  breed: 0,
  sex: 0,
  ageYears: 1,
  ageMonths: 1,
  birthMonth: 1,
  neuterStatus: 1,
  pregnantOrNursing: 1,
  weightKg: 2,
  currentFood: 2,
  feedingGoal: 2,
  allergies: 2,
  healthConditions: 3,
  bodyConditionScore: 3,
  activityLevel: 3,
  foodPreferences: 3,
};

export function PetForm({
  pet,
  pending,
  serverError,
  onSave,
  onCancel,
}: {
  pet?: Pet;
  pending: boolean;
  serverError?: string;
  onSave: (input: PetInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormValues>(() => startingValues(pet));
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const shihTzu = isShihTzu(form.species, form.breed);
  const weightAboveTypicalShihTzu =
    shihTzu && Number(form.weightKg) > SHIH_TZU_TYPICAL_ADULT_MAX_KG;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const reviewSections: { title: string; fields: [string, string][] }[] = [
    {
      title: 'Pet information',
      fields: [
        ['Pet name', provided(form.name)],
        ['Species', provided(form.species)],
        ['Breed', provided(form.breed)],
        ['Sex', optionLabel(form.sex)],
      ],
    },
    {
      title: 'Age and care',
      fields: [
        ['Age', ageLabel(form)],
        ['Birth month and year', birthMonthLabel(form.birthMonth, form.birthMonthEstimated)],
        ['Spayed or neutered?', optionLabel(form.neuterStatus)],
        ['Pregnant or nursing?', optionLabel(form.pregnantOrNursing)],
      ],
    },
    {
      title: 'Food and feeding',
      fields: [
        ['Current weight', form.weightKg ? `${form.weightKg} kg` : 'Not provided'],
        ['Current food', provided(form.currentFood)],
        [
          'Feeding goal',
          {
            unsure: 'Unsure',
            maintain: 'Maintain weight',
            gain: 'Gain weight',
            lose: 'Lose weight',
          }[form.feedingGoal],
        ],
        ['Allergies or food reactions', provided(toList(form.allergies).join(', '))],
      ],
    },
    {
      title: 'Health and activity',
      fields: [
        ['Health conditions', provided(toList(form.healthConditions).join(', '))],
        [
          'Body condition score',
          form.bodyConditionScore ? `${form.bodyConditionScore} of 10` : 'Not sure',
        ],
        ['Activity level', optionLabel(form.activityLevel)],
        ['Food preferences', provided(form.foodPreferences)],
      ],
    },
  ];

  function next(formElement: HTMLFormElement | null) {
    if (step === 0 && !form.name.trim()) {
      setError('Enter your pet’s name.');
      return;
    }
    if (step === 0 && (!form.species.trim() || form.species.trim().toLowerCase() === 'other')) {
      setError('Enter the species name, such as dog, cat, or rabbit.');
      return;
    }
    if (step === 1 && form.ageValue === '') {
      setError('Enter an age or choose a birth month.');
      return;
    }
    if (step === 2 && (!Number.isFinite(Number(form.weightKg)) || Number(form.weightKg) <= 0)) {
      setError('Enter a current weight greater than zero.');
      return;
    }
    if (step === 2 && shihTzu && Number(form.weightKg) > SHIH_TZU_WEIGHT_ENTRY_MAX_KG) {
      setError(SHIH_TZU_WEIGHT_ERROR);
      return;
    }
    if (!formElement?.reportValidity()) return;
    setError('');
    setStep(returnToReview ? reviewStep : Math.min(step + 1, reviewStep));
    setReturnToReview(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== reviewStep) {
      next(event.currentTarget);
      return;
    }
    const species = form.species.trim();
    const normalizedSpecies = species.toLowerCase();
    if (normalizedSpecies === 'other') {
      setError('Enter the species name, such as rabbit or bird.');
      return;
    }
    const age = Number(form.ageValue);
    const ageMonths = form.ageUnit === 'months' ? age % 12 : form.ageRemainderMonths;
    const ageYears = form.ageUnit === 'months' ? Math.floor(age / 12) : age;
    const parsed = petInputSchema.safeParse({
      ...form,
      species:
        normalizedSpecies === 'dog' || normalizedSpecies === 'cat' ? normalizedSpecies : 'other',
      otherSpecies: normalizedSpecies === 'dog' || normalizedSpecies === 'cat' ? '' : species,
      birthMonth: form.birthMonthEstimated ? null : form.birthMonth || null,
      ageYears: form.ageValue === '' ? Number.NaN : ageYears,
      ageMonths: form.ageValue === '' ? Number.NaN : ageMonths,
      weightKg: Number(form.weightKg),
      allergies: toList(form.allergies),
      healthConditions: toList(form.healthConditions),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue?.message ?? 'Check the pet details.');
      setStep(fieldStep[String(issue?.path[0])] ?? step);
      setReturnToReview(true);
      return;
    }
    setError('');
    onSave(parsed.data);
  }

  return (
    <form
      onSubmit={submit}
      className="pet-form rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{pet ? 'Edit pet' : 'Add Pet'}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          Cancel
        </button>
      </div>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
          Step {step + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{steps[step]}</h3>
        <ol aria-label="Pet form progress" className="mt-4 grid grid-cols-5 gap-2">
          {steps.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? 'step' : undefined}
              className={`h-1.5 rounded-full ${index <= step ? 'bg-teal-700' : 'bg-slate-200'}`}
            >
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ol>
      </div>
      {step === 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Pet name
            <RequiredMarker show={!form.name.trim()} />
            <input
              className={`${FIELD} mt-1.5`}
              value={form.name}
              onChange={(event) => set('name', capitalizeFirstLetter(event.target.value))}
              placeholder="e.g. Milo"
              maxLength={60}
              required
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Species
            <RequiredMarker show={!form.species.trim()} />
            <input
              className={`${FIELD} mt-1.5`}
              value={form.species}
              onChange={(event) => set('species', capitalizeFirstLetter(event.target.value))}
              placeholder="e.g. Dog, Cat, or Rabbit"
              maxLength={60}
              required
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Breed
            <OptionalMarker />
            <input
              className={`${FIELD} mt-1.5`}
              value={form.breed}
              onChange={(event) => set('breed', capitalizeFirstLetter(event.target.value))}
              placeholder="e.g. Shih Tzu"
              maxLength={80}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Sex
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.sex}
              onChange={(event) => set('sex', event.target.value as FormValues['sex'])}
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="min-w-0 text-sm font-bold text-slate-700">
            <label htmlFor="pet-age">
              Age
              <RequiredMarker show={form.ageValue === ''} />
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="min-w-0 flex-1">
                <input
                  id="pet-age"
                  className={FIELD}
                  type="number"
                  min="0"
                  max={form.ageUnit === 'years' ? 200 : 2411}
                  step="1"
                  value={form.ageValue}
                  onChange={(event) => {
                    const ageValue = event.target.value;
                    const birthMonth = birthMonthForAge(ageValue, form.ageUnit);
                    setForm((previous) => ({
                      ...previous,
                      ageValue,
                      ageRemainderMonths: 0,
                      birthMonth,
                      birthMonthEstimated: Boolean(birthMonth),
                    }));
                  }}
                  placeholder="e.g. 2"
                  required
                />
              </div>
              <div className="w-28 shrink-0">
                <select
                  aria-label="Age unit"
                  className={`${FIELD} pr-8`}
                  value={form.ageUnit}
                  onChange={(event) => {
                    const ageUnit = event.target.value as FormValues['ageUnit'];
                    setForm((previous) => {
                      const value = Number(previous.ageValue);
                      if (previous.ageValue === '' || !Number.isInteger(value) || value < 0) {
                        return { ...previous, ageUnit };
                      }
                      const totalMonths =
                        previous.ageUnit === 'years'
                          ? value * 12 + previous.ageRemainderMonths
                          : value;
                      return {
                        ...previous,
                        ageUnit,
                        ageValue: String(
                          ageUnit === 'years' ? Math.floor(totalMonths / 12) : totalMonths
                        ),
                        ageRemainderMonths: ageUnit === 'years' ? totalMonths % 12 : 0,
                      };
                    });
                  }}
                >
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>
          <label className="block text-sm font-bold text-slate-700">
            Birth month and year
            <OptionalMarker />
            {form.birthMonthEstimated && (
              <span className="ml-2 text-xs font-normal text-amber-700">Estimated</span>
            )}
            <input
              className={`${FIELD} mt-1.5 pr-10`}
              type="month"
              min="1800-01"
              max={localToday().slice(0, 7)}
              value={form.birthMonth}
              onChange={(event) => {
                const birthMonth = event.target.value;
                const age = birthMonth ? ageFromBirthMonth(birthMonth, localToday()) : null;
                setForm((previous) => ({
                  ...previous,
                  birthMonth,
                  birthMonthEstimated: false,
                  ageValue: age
                    ? String(previous.ageUnit === 'years' ? age.years : age.years * 12 + age.months)
                    : previous.ageValue,
                  ageRemainderMonths:
                    age && previous.ageUnit === 'years' ? age.months : previous.ageRemainderMonths,
                }));
              }}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Spayed or neutered?
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.neuterStatus}
              onChange={(event) =>
                set('neuterStatus', event.target.value as FormValues['neuterStatus'])
              }
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Pregnant or nursing?
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.pregnantOrNursing}
              onChange={(event) =>
                set('pregnantOrNursing', event.target.value as FormValues['pregnantOrNursing'])
              }
            >
              <option value="unknown">Unknown</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Current weight (kg)
            <RequiredMarker show={form.weightKg === ''} />
            <input
              className={`${FIELD} mt-1.5`}
              type="number"
              min="0.01"
              max={shihTzu ? SHIH_TZU_WEIGHT_ENTRY_MAX_KG : 500}
              step="any"
              value={form.weightKg}
              onChange={(event) => set('weightKg', event.target.value)}
              placeholder="e.g. 6.2"
              required
            />
            {weightAboveTypicalShihTzu && (
              <span className="mt-1.5 block text-xs font-medium text-amber-700">
                Adult Shih Tzu breed standard: 4.5–8 kg. Please double-check this weight.
              </span>
            )}
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Current food
            <OptionalMarker />
            <input
              className={`${FIELD} mt-1.5 h-16`}
              value={form.currentFood}
              onChange={(event) => set('currentFood', capitalizeFirstLetter(event.target.value))}
              placeholder="e.g. Brand and recipe"
              maxLength={120}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Feeding goal
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.feedingGoal}
              onChange={(event) =>
                set('feedingGoal', event.target.value as FormValues['feedingGoal'])
              }
            >
              <option value="unsure">Unsure</option>
              <option value="maintain">Maintain weight</option>
              <option value="gain">Gain weight</option>
              <option value="lose">Lose weight</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Allergies or food reactions
            <OptionalMarker />
            <textarea
              className={`${FIELD} mt-1.5`}
              rows={2}
              placeholder="e.g. Beef, chicken (separate with commas)"
              value={form.allergies}
              onChange={(event) => set('allergies', capitalizeListEntries(event.target.value))}
            />
          </label>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Health conditions
            <OptionalMarker />
            <textarea
              className={`${FIELD} mt-1.5`}
              rows={2}
              placeholder="e.g. Arthritis, diabetes (separate with commas)"
              value={form.healthConditions}
              onChange={(event) =>
                set('healthConditions', capitalizeListEntries(event.target.value))
              }
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Body condition score
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.bodyConditionScore ?? ''}
              onChange={(event) =>
                set('bodyConditionScore', event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Not sure</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} of 10
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Activity level
            <OptionalMarker />
            <select
              className={`${FIELD} mt-1.5 pr-10`}
              value={form.activityLevel}
              onChange={(event) =>
                set('activityLevel', event.target.value as FormValues['activityLevel'])
              }
            >
              <option value="unknown">Unknown</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Food preferences
            <OptionalMarker />
            <textarea
              className={`${FIELD} mt-1.5 h-16`}
              rows={2}
              value={form.foodPreferences}
              onChange={(event) =>
                set('foodPreferences', capitalizeFirstLetter(event.target.value))
              }
              placeholder="e.g. Wet food or preferred flavors"
              maxLength={500}
            />
          </label>
        </div>
      )}
      {step === reviewStep && (
        <div>
          <p className="mb-4 text-sm text-slate-600">Check these details before saving your pet.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {reviewSections.map((section, index) => (
              <section key={section.title} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-slate-900">{section.title}</h4>
                  <button
                    type="button"
                    aria-label={`Edit ${section.title}`}
                    onClick={() => {
                      setError('');
                      setReturnToReview(true);
                      setStep(index);
                    }}
                    className="text-sm font-bold text-teal-700 hover:text-teal-900"
                  >
                    Edit
                  </button>
                </div>
                <dl className="mt-3 space-y-3">
                  {section.fields.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      )}
      {(error || serverError) && (
        <p role="alert" className="mt-5 text-sm font-semibold text-rose-700">
          {error || serverError}
        </p>
      )}
      <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        {step > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError('');
              setReturnToReview(false);
              setStep((current) => current - 1);
            }}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Back
          </button>
        )}
        {step < reviewStep ? (
          <button
            key="next"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              next(event.currentTarget.form);
            }}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            {returnToReview ? 'Return to review' : 'Next'}
          </button>
        ) : (
          <button
            key="confirm"
            type="submit"
            disabled={pending}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Confirm and save'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
