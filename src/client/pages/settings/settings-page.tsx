import { Navigate, useParams } from 'react-router-dom';

import AccountForm from '@/components/settings/consumer/AccountForm';
import ConnectMealPlanner from '@/components/settings/consumer/ConnectMealPlanner';
import NotificationsForm from '@/components/settings/consumer/NotificationsForm';
import PasswordForm from '@/components/settings/consumer/PasswordForm';
import PrivacyForm from '@/components/settings/consumer/PrivacyForm';
import ProfileForm from '@/components/settings/consumer/ProfileForm';
import RegionForm from '@/components/settings/consumer/RegionForm';
import SettingsNavigation, {
  CUSTOMER_SETTINGS,
  type CustomerSettingsSection,
} from '@/components/settings/consumer/SettingsNavigation';
import { SectionHeading } from '@/components/settings/consumer/controls';
import UnsavedSettingsProvider from '@/components/settings/consumer/UnsavedSettingsProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePreferences } from '@/hooks/usePreferences';

const COPY: Record<CustomerSettingsSection, { title: string; description: string }> = {
  profile: { title: 'Profile', description: 'Control how your account appears across Vetify.' },
  security: { title: 'Security', description: 'Protect your account and manage how you sign in.' },
  notifications: {
    title: 'Notifications',
    description: 'Choose which updates appear and when Vetify should stay quiet.',
  },
  privacy: {
    title: 'Privacy & Safety',
    description: 'Review blocked accounts and Vetify’s current data practices.',
  },
  region: {
    title: 'Region',
    description: 'Use the correct timezone for appointments and quiet hours.',
  },
  account: {
    title: 'Account',
    description: 'Download your account data, sign out, or deactivate access.',
  },
  'meal-planner': {
    title: 'Connect meal planner',
    description: 'Scan a personal QR to use your current Vetify account in the mobile app.',
  },
};

export default function SettingsPage() {
  useDocumentTitle('Settings', 'Manage your Vetify account and preferences.');
  const { section } = useParams<{ section?: string }>();
  const active = (section ?? 'profile') as CustomerSettingsSection;
  const valid = CUSTOMER_SETTINGS.some((item) => item.id === active);
  const preferences = usePreferences(active === 'notifications' || active === 'region');

  if (!section || !valid) return <Navigate to="/settings/profile" replace />;

  const content = () => {
    if (active === 'profile') return <ProfileForm />;
    if (active === 'security') return <PasswordForm />;
    if (active === 'privacy') return <PrivacyForm />;
    if (active === 'account') return <AccountForm />;
    if (active === 'meal-planner') return <ConnectMealPlanner />;
    if (preferences.isLoading)
      return (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        </div>
      );
    if (preferences.isError || !preferences.data)
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Your settings did not load.</p>
          <button
            type="button"
            onClick={() => void preferences.refetch()}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200"
          >
            Try again
          </button>
        </div>
      );
    if (active === 'notifications')
      return (
        <NotificationsForm
          notifications={preferences.data.notifications}
          timeZone={preferences.data.region.timeZone}
        />
      );
    return <RegionForm region={preferences.data.region} />;
  };

  return (
    <main className="bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 xl:min-h-[calc(100vh-4rem)] xl:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your customer account, preferences, and privacy.
          </p>
        </div>
        <div className="lg:flex lg:items-start lg:gap-8">
          <UnsavedSettingsProvider>
            <SettingsNavigation />
            <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-[32rem]">
              <SectionHeading title={COPY[active].title} description={COPY[active].description}>
                {content()}
              </SectionHeading>
            </div>
          </UnsavedSettingsProvider>
        </div>
      </div>
    </main>
  );
}
