export default function BookAppointmentPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">
          Book Appointment
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Schedule a clinic visit.
        </h1>
        <form className="mt-10 grid gap-4 rounded-lg border border-slate-900/10 bg-white p-6 shadow-sm">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Pet owner's name
            <input className="h-11 rounded-lg border border-slate-900/15 px-3 font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Pet name
            <input className="h-11 rounded-lg border border-slate-900/15 px-3 font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Preferred date
            <input
              className="h-11 rounded-lg border border-slate-900/15 px-3 font-normal"
              type="date"
            />
          </label>
          <button
            className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            type="submit"
          >
            Request Appointment
          </button>
        </form>
      </section>
    </main>
  );
}
