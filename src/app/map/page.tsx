'use client';

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950 flex flex-col">
      <section className="pt-20 pb-12 sm:pt-28 sm:pb-16 text-center px-5">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">Our Location</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Find us on the map
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Visit our main clinic for world-class veterinary care. We are conveniently located in the
          heart of the city with ample parking for you and your pets.
        </p>
      </section>

      <section className="flex-1 w-full px-5 pb-20 sm:pb-28 max-w-7xl mx-auto">
        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-teal-900/10 shadow-2xl shadow-teal-900/5 relative bg-white flex items-center justify-center group">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.061730045437!2d-122.40428588468205!3d37.7818469797587!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085808620248c81%3A0x86134b22c836dbf1!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1629830537021!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 z-10 transition-opacity duration-500"
          ></iframe>
          {/* Loading placeholder */}
          <div className="absolute inset-0 z-0 bg-slate-100 animate-pulse flex flex-col items-center justify-center text-slate-400">
            <svg
              className="w-12 h-12 mb-4 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="font-semibold tracking-wide uppercase text-sm">Loading Map...</span>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Address</h3>
            <p className="text-slate-600 leading-relaxed">
              123 Vetify Lane
              <br />
              San Francisco, CA 94103
              <br />
              United States
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Hours</h3>
            <p className="text-slate-600 leading-relaxed">
              Mon-Fri: 8:00 AM - 8:00 PM
              <br />
              Saturday: 9:00 AM - 5:00 PM
              <br />
              Sunday: Closed
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Contact</h3>
            <p className="text-slate-600 leading-relaxed">
              Phone: (555) 123-4567
              <br />
              Emergency: (555) 911-VETS
              <br />
              Email: clinic@vetify.com
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
