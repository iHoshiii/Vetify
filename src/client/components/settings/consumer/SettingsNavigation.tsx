import { Bell, Globe2, LockKeyhole, Shield, UserRound, WalletCards } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

export const CUSTOMER_SETTINGS = [
  { id: 'profile', label: 'Profile', description: 'Photo and display name', icon: UserRound },
  { id: 'security', label: 'Security', description: 'Password and sign-in', icon: LockKeyhole },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alerts and quiet hours',
    icon: Bell,
  },
  { id: 'privacy', label: 'Privacy & Safety', description: 'Blocked accounts', icon: Shield },
  { id: 'region', label: 'Region', description: 'Timezone and formatting', icon: Globe2 },
  { id: 'account', label: 'Account', description: 'Data and account access', icon: WalletCards },
] as const;

export type CustomerSettingsSection = (typeof CUSTOMER_SETTINGS)[number]['id'];

export default function SettingsNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.split('/').pop() || 'profile';
  return (
    <nav aria-label="Settings sections" className="lg:w-64 lg:shrink-0">
      <label className="block lg:hidden">
        <span className="sr-only">Settings section</span>
        <select
          value={active}
          onChange={(event) => navigate(`/settings/${event.target.value}`)}
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
        >
          {CUSTOMER_SETTINGS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <ul className="hidden space-y-1 lg:block">
        {CUSTOMER_SETTINGS.map(({ id, label, description, icon: Icon }) => (
          <li key={id}>
            <NavLink
              to={`/settings/${id}`}
              className={({ isActive }) =>
                `flex items-start gap-3 rounded-xl px-3 py-3 transition ${
                  isActive ? 'bg-teal-900 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                }`
              }
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <span className="block text-sm font-bold">{label}</span>
                <span className="block text-xs opacity-70">{description}</span>
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
