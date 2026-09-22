type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
};

export default function ParticipantAvatar({ name, avatarUrl, size = 'sm' }: Props) {
  const dimensions = size === 'md' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs';

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
