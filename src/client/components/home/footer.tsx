export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-md shadow-teal-500/30">
                V
              </div>
              <span className="text-xl font-black">Vetify</span>
            </div>
            <p className="mt-4 leading-relaxed text-slate-400">
              Your trusted pet health companion, bringing AI-powered guidance, expert veterinarians,
              and essential pet care tools all in one place.
            </p>
            <div className="mt-6 flex gap-3">
              {['T', 'I', 'F'].map((letter) => (
                <a
                  key={letter}
                  href="#"
                  className="badge-spin flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-400 transition hover:bg-teal-700 hover:text-white"
                >
                  {letter}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-lg font-bold text-white">Quick Links</h3>
            <ul className="space-y-4">
              {[
                { label: 'Home', href: '/#home' },
                { label: 'Services', href: '/services' },
                { label: 'Find Vets', href: '/map' },
                { label: 'Book Appointment', href: '/book-appointment' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-lg font-bold text-white">Resources</h3>
            <ul className="space-y-4">
              {[
                { label: 'Blogs', href: '/blogs' },
                { label: 'FAQs', href: '/help' },
                { label: 'Anatomy Guide', href: '/chat?anatomy=true' },
                { label: 'Meal Planner', href: '/planner' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-lg font-bold text-white">Legal</h3>
            <ul className="space-y-4">
              {[
                { label: 'About Us', href: '/#about' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Contact Us', href: '/contact' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-block text-slate-400 transition-all duration-200 hover:translate-x-1 hover:text-teal-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Vetify. All rights reserved.
            </p>
            <span className="text-sm text-slate-400">Made with ❤️ for pets</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
