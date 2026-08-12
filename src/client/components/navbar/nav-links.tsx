import { NAV_ITEMS } from './nav-data';
import { ToolsDropdown } from './tool-dropdown';

interface NavLinksProps {
  isAuthenticated: boolean;
}

export function NavLinks({ isAuthenticated }: NavLinksProps) {
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="group relative px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-teal-700"
        >
          {item.label}
          <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-teal-600 transition-transform duration-300 group-hover:scale-x-100" />
        </a>
      ))}
      <ToolsDropdown isAuthenticated={isAuthenticated} />
    </nav>
  );
}
