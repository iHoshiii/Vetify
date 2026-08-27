import { eligibility } from '../data/prof-data';

export default function EligibilitySection() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Who can apply
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Eligibility Requirements
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            To maintain the trust of pet owners, we verify every professional before they go live on
            the platform.
          </p>
          {/* Said here because the two stages surprise people otherwise: the button
              below is a short enquiry, and the real form arrives by email. */}
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
            It happens in two parts. You write in with a few lines about yourself and the licence
            you hold; if a reviewer takes it further, they email you a link to the full application.
            After that comes an interview, and then the decision.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eligibility.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-teal-900/10 bg-[#f6fbfb] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl">{item.icon}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
