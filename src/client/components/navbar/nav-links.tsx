import { SiteLink } from '@/components/common/site-link';
import { NAV_ITEMS } from './nav-data';
import { ToolsDropdown } from './tool-dropdown';

interface NavLinksProps {
  isAuthenticated: boolean;
}

export function NavLinks({ isAuthenticated }: NavLinksProps) {
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <SiteLink
          key={item.href}
          to={item.href}
          className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-vet-primary"
        >
          {item.label}
        </SiteLink>
      ))}
      <ToolsDropdown isAuthenticated={isAuthenticated} />
    </nav>
  );
}
