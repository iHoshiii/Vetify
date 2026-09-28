import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useUpdateProfile } from '@/hooks/useAccount';
import AvatarPicker from './AvatarPicker';
import { SaveRow } from './controls';

const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

export default function ProfileForm() {
  const { user } = useAuth();
  const mutation = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({ name: name.trim(), avatarUrl });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <AvatarPicker name={name || user?.name || '?'} value={avatarUrl} onChange={setAvatarUrl} />
      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
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
