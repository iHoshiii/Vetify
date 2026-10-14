import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionStatus() {
  const subscription = useSubscription();
  const value = subscription.data;
  const fresh = !subscription.isStale;
  const proIsValid = value?.plan === 'pro' && value.status === 'active';
  let label = 'Checking…';
  if (subscription.isError) label = 'Unavailable';
  else if (value && fresh && (value.plan === 'free' || proIsValid)) {
    label = proIsValid ? 'Pro' : 'Free';
  }
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
      <span className="text-sm font-black text-slate-900">Plan</span>
      <span aria-live="polite" className="text-sm font-bold text-emerald-700">
        {label}
      </span>
    </div>
  );
}
