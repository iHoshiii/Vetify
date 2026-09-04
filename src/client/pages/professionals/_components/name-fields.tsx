import Input from '@/components/ui/Input';

export type NameParts = { firstName: string; middleName: string; lastName: string; suffix: string };

export const EMPTY_NAME: NameParts = { firstName: '', middleName: '', lastName: '', suffix: '' };

// What the PRC prints after a surname. None is the default because most cards carry nothing
const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

const SELECT =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

// The register holds one name, so the parts are joined back into one before they are sent
export function composeName(parts: NameParts): string {
  return [parts.firstName, parts.middleName, parts.lastName, parts.suffix]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

// Only the two parts nobody can be without: a middle name is optional and a suffix is a choice
export function nameErrors(parts: NameParts): { firstName?: string; lastName?: string } {
  return {
    firstName: parts.firstName.trim() ? undefined : 'First name is required',
    lastName: parts.lastName.trim() ? undefined : 'Last name is required',
  };
}

type Props = {
  values: NameParts;
  errors: { firstName?: string; lastName?: string; name?: string };
  onChange: (field: keyof NameParts) => (event: { target: { value: string } }) => void;
};

export default function NameFields({ values, errors, onChange }: Props) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          value={values.firstName}
          onChange={onChange('firstName')}
          error={errors.firstName}
          placeholder="Marites"
          required
        />
        <Input
          label="Middle name (optional)"
          value={values.middleName}
          onChange={onChange('middleName')}
          placeholder="Santos"
        />
        <Input
          label="Last name"
          value={values.lastName}
          onChange={onChange('lastName')}
          error={errors.lastName}
          placeholder="Reyes"
          required
        />
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="suffix" className="text-sm font-medium text-slate-700">
            Suffix
          </label>
          <select
            id="suffix"
            value={values.suffix}
            onChange={onChange('suffix')}
            className={SELECT}
          >
            <option value="">None</option>
            {SUFFIXES.map((suffix) => (
              <option key={suffix} value={suffix}>
                {suffix}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* The composed name is what the schema checks, so its message belongs under the row */}
      {errors.name && <p className="text-xs font-medium text-red-500">{errors.name}</p>}
    </div>
  );
}
