'use client';

interface SectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SupportSection({ isExpanded, onToggle }: SectionProps) {
  const items = [
    { label: 'Help Center', desc: 'Links to FAQs, user guides, or support.' },
    { label: 'Terms & Conditions', desc: 'Read our terms of service and usage rules.' },
    { label: 'Privacy Policy', desc: 'Learn how we handle your personal data.' },
    { label: 'App Info', desc: 'Display the current software version number.' },
  ];

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-sm font-bold text-slate-700">ℹ️ Support & About</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[500px]' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-2 pb-2">
          {items.map((item, idx) => (
            <button
              key={idx}
              className="flex flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-800">{item.label}</span>
              <span className="text-xs text-slate-500">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
