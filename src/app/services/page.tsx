const services = [
  'Symptom triage',
  'Nearby vet locator',
  'Nutrition planning',
  'Appointment support',
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">Services</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Care tools for the next step.
        </h1>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-teal-900/10 bg-teal-900/10 sm:grid-cols-2">
          {services.map((service) => (
            <article key={service} className="bg-white p-6">
              <h2 className="text-lg font-black tracking-tight">{service}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Simple support for pet owners moving from concern to action.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
