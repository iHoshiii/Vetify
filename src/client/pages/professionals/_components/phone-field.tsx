type Props = {
  value: string;
  error?: string;
  onChange: (event: { target: { value: string } }) => void;
};

// The +63 is fixed, so the box holds the national number and the payload adds the code back
export default function PhoneField({ value, error, onChange }: Props) {
  const frame = error
    ? 'border-red-500 focus-within:ring-red-500'
    : 'border-slate-200 focus-within:ring-blue-600';

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor="phone" className="text-sm font-medium text-slate-700">
        Business contact number (optional)
      </label>
      <div
        className={`flex h-10 w-full items-center rounded-lg border bg-white pl-3 transition-shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-white ${frame}`}
      >
        <span className="select-none text-sm font-semibold text-slate-500">+63</span>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          value={value}
          // A number pasted with the country code, or typed with the trunk zero, is the same number
          onChange={(event) =>
            onChange({
              target: {
                value: event.target.value
                  .replace(/^\+63\s*/, '')
                  .replace(/[^\d\s()-]/g, '')
                  .replace(/^0+/, ''),
              },
            })
          }
          placeholder="32 555 0101"
          className="h-full w-full rounded-r-lg bg-transparent px-2 text-sm placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
