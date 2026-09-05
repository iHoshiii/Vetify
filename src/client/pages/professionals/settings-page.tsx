import LogoutModal from '@/components/settings/LogoutModal';
import {
  AvailabilitySection,
  BookingReminderSection,
  MapVisibilitySection,
  RateExperienceSection,
} from '@/components/settings/sections/ProfessionalSettingsSection';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

// The rows the floating tray used to hold, on the page they belong to: a setting is part of the console, not a thing that hovers over it
export default function ProfessionalSettingsPage() {
  useDocumentTitle('Settings', 'Your rate, your week, and when the reminder lands.');

  const [expanded, setExpanded] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const row = (index: number) => ({
    isExpanded: expanded === index,
    onToggle: () => setExpanded(expanded === index ? null : index),
  });

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-base font-black tracking-tight text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500">
          What you can change yourself. Anything checked against your licence is a record here
          rather than a field.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <RateExperienceSection {...row(0)} />
        <AvailabilitySection {...row(1)} />
        <BookingReminderSection {...row(2)} />
        <MapVisibilitySection {...row(3)} />
      </div>

      <button
        type="button"
        onClick={() => setLoggingOut(true)}
        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
      >
        <LogOut size={16} />
        Log Out
      </button>

      <LogoutModal isOpen={loggingOut} onClose={() => setLoggingOut(false)} />
    </div>
  );
}
