export default function ContactForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add your submission logic (e.g., Supabase or API call) here
  };

  return (
    <div className="rounded-3xl border border-teal-900/10 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/40">
      <h2 className="text-2xl font-bold text-slate-950 mb-6">Send us a message</h2>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">First Name</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Last Name</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
          <textarea
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            placeholder="How can we help you?"
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:-translate-y-0.5 mt-2"
        >
          Send Message
        </button>
      </form>
    </div>
  );
}
