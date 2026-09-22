type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md';
};

// Tailwind classes per size; xs is the inline bubble avatar, sm the list, md the header.
const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
} as const;

export default function ParticipantAvatar({ name, avatarUrl, size = 'sm' }: Props) {
  const dimensions = SIZES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}'s profile`}
        className={`${dimensions} shrink-0 rounded-full border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-100 font-black text-teal-800`}
      aria-label={`${name}'s profile`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
