// ── Skeleton screen shown while Leaflet / Overpass loads ──────────────────────
export function MapSkeleton({ error }: { error?: boolean }) {
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl">
          ⚠️
        </div>
        <p className="text-sm font-semibold text-red-500">Could not load clinic data.</p>
        <p className="text-xs text-slate-400">Check your internet connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#f0f4f8] overflow-hidden">
      {/* shimmer keyframe via inline style tag */}
      <style>{`
        @keyframes vet-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .vet-shimmer {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 600px 100%;
          animation: vet-shimmer 1.6s infinite linear;
        }
      `}</style>

      {/* Fake grid lines mimicking a map */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Fake road lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="38%" x2="100%" y2="42%" stroke="#94a3b8" strokeWidth="6" />
        <line x1="0" y1="65%" x2="100%" y2="60%" stroke="#94a3b8" strokeWidth="3" />
        <line x1="30%" y1="0" x2="35%" y2="100%" stroke="#94a3b8" strokeWidth="5" />
        <line x1="68%" y1="0" x2="65%" y2="100%" stroke="#94a3b8" strokeWidth="3" />
        <line x1="0" y1="20%" x2="55%" y2="15%" stroke="#94a3b8" strokeWidth="2" />
        <line x1="45%" y1="75%" x2="100%" y2="80%" stroke="#94a3b8" strokeWidth="2" />
      </svg>

      {/* Fake shimmer blocks (like map tiles loading) */}
      <div
        className="vet-shimmer absolute"
        style={{ top: '10%', left: '5%', width: '28%', height: '18%', borderRadius: 6 }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '55%',
          left: '60%',
          width: '32%',
          height: '14%',
          borderRadius: 6,
          animationDelay: '0.2s',
        }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '30%',
          left: '40%',
          width: '20%',
          height: '10%',
          borderRadius: 6,
          animationDelay: '0.4s',
        }}
      />
      <div
        className="vet-shimmer absolute"
        style={{
          top: '70%',
          left: '10%',
          width: '24%',
          height: '12%',
          borderRadius: 6,
          animationDelay: '0.1s',
        }}
      />

      {/* Fake marker pins */}
      {[
        { top: '38%', left: '32%' },
        { top: '52%', left: '61%' },
        { top: '25%', left: '55%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%,-100%)' }}
        >
          <div
            className="vet-shimmer w-7 h-9 rounded-t-full rounded-b-sm"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
          <div
            className="vet-shimmer mt-1 h-3 rounded-full"
            style={{ width: 56, animationDelay: `${i * 0.15 + 0.1}s` }}
          />
        </div>
      ))}

      {/* Centre card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-blue-100 rounded-2xl px-6 py-5 shadow-xl flex flex-col items-center gap-3 max-w-[220px] text-center">
          {/* Animated paw */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
            <div className="relative w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="#2563eb" className="w-6 h-6">
                <ellipse cx="12" cy="15" rx="4" ry="3.2" />
                <ellipse cx="7" cy="11.5" rx="2.3" ry="1.8" />
                <ellipse cx="17" cy="11.5" rx="2.3" ry="1.8" />
                <ellipse cx="9.5" cy="8" rx="2" ry="1.6" />
                <ellipse cx="14.5" cy="8" rx="2" ry="1.6" />
              </svg>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800 leading-snug">Loading vet locations…</p>
            <p className="text-xs text-slate-400 mt-1">Fetching clinics</p>
          </div>

          {/* Dot progress */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ animation: `vet-shimmer 1.2s ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
