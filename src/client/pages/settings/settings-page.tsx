import { SettingRow } from '@/components/settings/consumer/controls';
import { SettingsModal } from '@/components/settings/consumer/SettingsModal';
import NotificationsForm from '@/components/settings/consumer/NotificationsForm';
import PrivacyForm from '@/components/settings/consumer/PrivacyForm';
import ProfileForm from '@/components/settings/consumer/ProfileForm';
import PasswordForm from '@/components/settings/consumer/PasswordForm';
import { usePreferences } from '@/hooks/usePreferences';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useState } from 'react';

// The consumer settings page. The floating tray links here rather than holding forms itself, since toggles and quiet-hour fields need more room than a 320px panel.
export default function SettingsPage() {
  useDocumentTitle('Settings', 'Your notifications and privacy, in one place.');

  const { data: prefs, isLoading, isError } = usePreferences();
  const [active, setActive] = useState<number | null>(null);

  const notif = prefs?.notifications;
  const notifSummary = !notif
    ? ''
    : notif.enabled
    ? `On · ${Object.values(notif.categories).filter(Boolean).length}/${
        Object.keys(notif.categories).length
      } alert types`
    : 'Off';

  const privacy = prefs?.privacy;
  const privacySummary = !privacy
    ? ''
    : `${privacy.analyticsOptOut ? 'Analytics off' : 'Analytics on'} · ${
        privacy.blockedUserIds.length
      } blocked`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-base font-black tracking-tight text-slate-900">Settings</h1>

        {isLoading && <p className="px-1 text-sm text-slate-500">Loading your settings…</p>}
        {isError && (
          <p className="px-1 text-sm font-semibold text-rose-700">
            Your notifications and privacy did not load. Refresh to try again.
          </p>
        )}

        <div className="-mx-6 border-t border-slate-100">
          {prefs && (
            <>
              <SettingRow
                label="Notifications"
                summary={notifSummary}
                onOpen={() => setActive(0)}
              />
              <SettingRow label="Privacy" summary={privacySummary} onOpen={() => setActive(1)} />
            </>
          )}
          <SettingRow label="Account" summary="" onOpen={() => setActive(2)} />
        </div>
      </div>

      {prefs && active === 0 && (
        <SettingsModal title="Notifications" onClose={() => setActive(null)}>
          <NotificationsForm notifications={prefs.notifications} />
        </SettingsModal>
      )}
      {prefs && active === 1 && (
        <SettingsModal title="Privacy" onClose={() => setActive(null)}>
          <PrivacyForm privacy={prefs.privacy} />
        </SettingsModal>
      )}
      {active === 2 && (
        <SettingsModal title="Account" onClose={() => setActive(null)}>
          <div className="space-y-6">
            <ProfileForm />
            <div className="border-t border-slate-100 pt-5">
              <PasswordForm />
            </div>
          </div>
        </SettingsModal>
      )}
    </div>
  );
}
