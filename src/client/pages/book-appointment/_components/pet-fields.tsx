import RequiredMark from './required-mark';
import { FIELD, LABEL } from './styles';

export type PetValues = {
  petName: string;
  petSpecies: string;
  petBreed: string;
  petAge: string;
};

// The animal, as the vet reads it. Only the species is asked for: a name, breed and
// age help but a booking is about a species with a problem, not a filled-in form.
export default function PetFields({
  ids,
  values,
  onChange,
}: {
  ids: Record<keyof PetValues, string>;
  values: PetValues;
  onChange: (field: keyof PetValues, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={ids.petSpecies} className={LABEL}>
          Species
          <RequiredMark filled={Boolean(values.petSpecies.trim())} />
        </label>
        <input
          id={ids.petSpecies}
          value={values.petSpecies}
          onChange={(event) => onChange('petSpecies', event.target.value)}
          required
          maxLength={40}
          placeholder="Dog, cat, rabbit…"
          className={`${FIELD} mt-1`}
        />
      </div>
      <div>
        <label htmlFor={ids.petBreed} className={LABEL}>
          Breed (optional)
        </label>
        <input
          id={ids.petBreed}
          value={values.petBreed}
          onChange={(event) => onChange('petBreed', event.target.value)}
          maxLength={60}
          placeholder="Aspin, Persian…"
          className={`${FIELD} mt-1`}
        />
      </div>
      <div>
        <label htmlFor={ids.petName} className={LABEL}>
          Pet name (optional)
        </label>
        <input
          id={ids.petName}
          value={values.petName}
          onChange={(event) => onChange('petName', event.target.value)}
          maxLength={60}
          placeholder="Milo"
          className={`${FIELD} mt-1`}
        />
      </div>
      <div>
        <label htmlFor={ids.petAge} className={LABEL}>
          Age (optional)
        </label>
        <input
          id={ids.petAge}
          value={values.petAge}
          onChange={(event) => onChange('petAge', event.target.value)}
          maxLength={40}
          placeholder="2 years, 6 months…"
          className={`${FIELD} mt-1`}
        />
      </div>
    </div>
  );
}
