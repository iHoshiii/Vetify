export default function Header() {
  return (
    <div className="flex-shrink-0 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm">
            <span className="text-sm">🦴</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">Interactive Anatomy</h1>
            <p className="text-[11px] text-slate-400">Explore pet biology</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/chat"
            className="text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors"
          >
            Ask AI Assistant
          </a>
          <div className="h-4 w-px bg-slate-200" />
          <a
            href="/services"
            className="text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors"
          >
            Back to Services
          </a>
        </div>
      </div>
    </div>
  );
}
