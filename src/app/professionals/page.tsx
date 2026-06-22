/* ─── Professionals — Eligibility & Conditions ──────────────── */

const eligibility = [
  {
    icon: '🎓',
    title: 'Valid Veterinary License',
    body: 'You must hold a current, valid license to practice veterinary medicine issued by a recognized regulatory body in your country or region.',
  },
  {
    icon: '📋',
    title: 'Proof of Credentials',
    body: 'Applicants are required to submit a copy of their license, diploma, and any relevant specialist certifications for verification.',
  },
  {
    icon: '🏥',
    title: 'Active Practice',
    body: 'You must be actively practicing veterinary medicine, either in a clinic, hospital, or as an independent practitioner.',
  },
  {
    icon: '💬',
    title: 'Communication Skills',
    body: 'Professionals must be able to communicate clearly in English and the primary language of the pet owners they serve.',
  },
  {
    icon: '📱',
    title: 'Technology Access',
    body: 'A reliable internet connection and a device capable of video consultation is required to deliver services through the platform.',
  },
  {
    icon: '✅',
    title: 'Background Check',
    body: 'All applicants must consent to and pass a professional background verification before being listed on the Vetify platform.',
  },
];

const conditions = [
  {
    num: '01',
    title: 'Code of Conduct',
    body: "All professionals must adhere to Vetify's code of conduct, which requires respectful, evidence-based, and ethical communication with pet owners at all times.",
  },
  {
    num: '02',
    title: 'Response Time',
    body: 'Professionals are expected to respond to consultation requests within 24 hours. Consistent non-response may result in suspension of your profile.',
  },
  {
    num: '03',
    title: 'Scope of Advice',
    body: 'Guidance provided through Vetify is advisory in nature. Professionals must clearly communicate when an in-person visit is necessary and avoid making definitive diagnoses without proper examination.',
  },
  {
    num: '04',
    title: 'Privacy & Confidentiality',
    body: 'All information shared by pet owners during consultations is confidential. Professionals must not share, store, or use this data outside the Vetify platform.',
  },
  {
    num: '05',
    title: 'Platform Fees',
    body: "Vetify retains a service fee from each paid consultation. The current fee structure will be provided during onboarding and is subject to change with 30 days' notice.",
  },
  {
    num: '06',
    title: 'Termination',
    body: "Vetify reserves the right to suspend or permanently remove any professional who violates the platform's terms, receives consistent negative feedback, or engages in misconduct.",
  },
];

export default function ProfessionalsPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] text-slate-950">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 px-5 py-20 sm:px-8 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-teal-400">
            For veterinary professionals
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Join Vetify as a
            <br className="hidden sm:block" /> Trusted Professional
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Partner with Vetify to connect with pet owners who need expert guidance — on your
            schedule, on your terms.
          </p>
          <a
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-sm font-bold text-white shadow-lg shadow-teal-600/30 transition-all hover:bg-teal-700 hover:-translate-y-0.5"
          >
            Apply to join
          </a>
        </div>
      </section>

      {/* ── ELIGIBILITY ──────────────────────────────────────── */}
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
              To maintain the trust of pet owners, we verify every professional before they go live
              on the platform.
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

      {/* ── CONDITIONS ───────────────────────────────────────── */}
      <section className="bg-[#f6fbfb] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
              Platform rules
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Terms &amp; Conditions
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
              By joining as a professional, you agree to abide by the following platform conditions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {conditions.map((item) => (
              <div
                key={item.num}
                className="rounded-2xl border border-teal-900/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-black text-white shadow">
                  {item.num}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Ready to make a difference?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
            Join a growing network of veterinary professionals helping pet owners make confident,
            informed decisions every day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-8 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
            >
              Apply to join
            </a>
            <a
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white px-8 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-900/30 hover:shadow-md"
            >
              Back to home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
