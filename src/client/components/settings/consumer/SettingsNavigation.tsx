import { NavLink, useLocation, useNavigate } from 'react-router-dom';

export const CUSTOMER_SETTINGS = [
  { id: 'profile', label: 'Profile', description: 'Photo and display name' },
  { id: 'security', label: 'Security', description: 'Password and sign-in' },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alerts and quiet hours',
  },
  { id: 'privacy', label: 'Privacy & Safety', description: 'Blocked accounts' },
  { id: 'region', label: 'Region', description: 'Timezone and formatting' },
  { id: 'account', label: 'Account', description: 'Data and account access' },
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
        {CUSTOMER_SETTINGS.map(({ id, label, description }) => (
          <li key={id}>
            <NavLink
              to={`/settings/${id}`}
              className={({ isActive }) =>
                `block border-l-2 px-4 py-2.5 transition ${
                  isActive
                    ? 'border-teal-800 bg-white text-slate-950'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`
              }
            >
              <span className="block text-sm font-bold">{label}</span>
              <span className="block text-xs opacity-70">{description}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
