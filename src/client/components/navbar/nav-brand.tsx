import { Link } from 'react-router-dom';

export function NavBrand() {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-md shadow-teal-500/30 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
        V
      </div>
      <span className="text-xl font-black tracking-tight text-slate-900">Vetify</span>
    </Link>
  );
}
