import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useUpdateProfile } from '@/hooks/useAccount';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import AvatarPicker from './AvatarPicker';
import { FIELD, SaveRow } from './controls';

export default function ProfileForm() {
  const { user } = useAuth();
  const mutation = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const originalName = user?.name ?? '';
  const originalAvatar = user?.avatarUrl ?? null;
  const dirty = name.trim() !== originalName || avatarUrl !== originalAvatar;
  useUnsavedGuard(dirty);

  useEffect(() => {
    setName(originalName);
    setAvatarUrl(originalAvatar);
  }, [originalName, originalAvatar]);

  const reset = () => {
    setName(originalName);
    setAvatarUrl(originalAvatar);
    mutation.reset();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ name: name.trim(), avatarUrl });
      }}
      className="space-y-5"
    >
      <AvatarPicker name={name || user?.name || '?'} value={avatarUrl} onChange={setAvatarUrl} />
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">Display name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          required
          className={FIELD}
        />
      </label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
          Email address
        </span>
        <span className="mt-1 block break-all text-sm font-semibold text-slate-800">
          {user?.email}
        </span>
        <span
          className={`mt-1 block text-xs font-bold ${
            user?.emailVerified ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {user?.emailVerified ? 'Verified' : 'Verification pending'}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Contact support if you need to change the email used to sign in.
      </p>
      <SaveRow
        pending={mutation.isPending}
        error={mutation.error?.message ?? null}
        saved={mutation.isSuccess && !dirty}
        dirty={dirty}
        label="Save profile"
        onReset={reset}
      />
    </form>
  );
}
