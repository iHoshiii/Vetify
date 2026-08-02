export default function InfoCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1">
      {/* Address Card */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 transition-transform duration-300 group-hover:scale-110">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            Address
          </p>
          <p className="text-sm font-semibold text-slate-800">123 Vetify Lane, Bayombong</p>
          <p className="text-xs text-slate-500">Nueva Vizcaya 3700, Philippines</p>
        </div>
      </div>

      {/* Hours Card */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 transition-transform duration-300 group-hover:scale-110">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Hours</p>
          <p className="text-sm font-semibold text-slate-800">Mon–Fri: 8:00 AM – 8:00 PM</p>
          <p className="text-xs text-slate-500">Saturday: 9:00 AM – 5:00 PM · Sunday: Closed</p>
        </div>
      </div>

      {/* Contact Card */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 transition-transform duration-300 group-hover:scale-110">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
            Contact
          </p>
          <p className="text-sm font-semibold text-slate-800">(555) 123-4567</p>
          <p className="text-xs text-slate-500">clinic@vetify.com</p>
        </div>
      </div>
    </div>
  );
}
