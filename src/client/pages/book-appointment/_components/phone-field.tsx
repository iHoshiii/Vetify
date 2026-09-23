import RequiredMark from './required-mark';
import { LABEL } from './styles';

// The 10-digit national part, drops a trunk 0 and any non-digit the user pastes.
function nationalOf(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0/, '').slice(0, 10);
}

// Stores the canonical +63XXXXXXXXXX in the parent; empty until 10 digits are in.
export default function PhoneField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const national = value.startsWith('+63') ? value.slice(3) : '';
  const filled = /^\+63\d{10}$/.test(value);

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Phone
        <RequiredMark filled={filled} />
      </label>
      <div className="mt-1 flex items-stretch rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-teal-700 focus-within:ring-offset-2">
        <span className="flex select-none items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-600">
          +63
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(event) => {
            const digits = nationalOf(event.target.value);
            onChange(digits ? `+63${digits}` : '');
          }}
          required
          placeholder="912 345 6789"
          className="w-full rounded-r-lg bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Given to this vet only, so they can reach you about this booking.
      </p>
    </div>
  );
}
