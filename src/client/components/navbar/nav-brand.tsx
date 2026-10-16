import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/common/brand-logo';

/**
 * The wordmark. `to` exists for the admin console, whose brand goes to the
 * console rather than the marketing site — one copy of the mark either way, so
 * the two surfaces cannot drift apart on it.
 */
export function NavBrand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="group flex shrink-0 items-center gap-2">
      <BrandLogo className="h-8 w-8 rounded-lg shadow-sm transition-transform duration-300 group-hover:rotate-3 sm:h-9 sm:w-9 sm:rounded-xl" />
      <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Vetify</span>
    </Link>
  );
}
