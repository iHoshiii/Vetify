const posts = [
  'Spot early signs that your pet needs a vet visit',
  'Build a calmer home routine for anxious pets',
  'What to prepare before a clinic appointment',
];

export default function BlogsPage() {
  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">Blogs</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Practical pet care notes.
        </h1>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-teal-900/10 bg-teal-900/10 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post} className="bg-white p-6">
              <h2 className="text-lg font-black tracking-tight">{post}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Guidance for everyday decisions, clinic planning, and healthier routines.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
