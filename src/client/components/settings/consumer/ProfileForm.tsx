import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useUpdateProfile } from '@/hooks/useAccount';
import { SaveRow } from './controls';

const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

export default function ProfileForm() {
  const { user } = useAuth();
  const mutation = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({ name: name.trim(), avatarUrl: avatarUrl.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">Profile picture URL</span>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className={FIELD}
        />
      </label>
      <SaveRow
        pending={mutation.isPending}
        error={mutation.error?.message ?? null}
        saved={mutation.isSuccess}
        label="Save profile"
      />
    </form>
  );
}
