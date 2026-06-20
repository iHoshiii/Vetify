const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Map', href: '/map' },
  { label: 'Services', href: '/services' },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 sm:px-8">
        <a href="/" className="shrink-0 text-xl font-black tracking-tight text-slate-950">
          Vetify
        </a>
        <nav className="flex flex-1 items-center justify-end gap-3 text-sm font-semibold text-slate-700 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-5 mr-2">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-slate-950" href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <a
            href="/book-appointment"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 text-center text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
          >
            Book Appointment
          </a>
        </nav>
      </div>
    </header>
  );
}
