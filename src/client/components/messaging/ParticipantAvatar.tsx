type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md';
  online?: boolean;
};

// Tailwind classes per size; xs is the inline bubble avatar, sm the list, md the header.
const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
} as const;

export default function ParticipantAvatar({ name, avatarUrl, size = 'sm', online = false }: Props) {
  const dimensions = SIZES[size];
  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={`${name}'s profile`}
      className={`${dimensions} shrink-0 rounded-full border border-slate-200 object-cover`}
    />
  ) : (
    <span
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-100 font-black text-teal-800`}
      aria-label={`${name}'s profile`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      {online && (
        <span
          aria-label="Active now"
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
        />
      )}
    </span>
  );
}
