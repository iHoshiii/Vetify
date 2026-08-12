interface HamburgerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Hamburger({ isOpen, onToggle }: HamburgerProps) {
  return (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:text-teal-700 md:hidden"
      onClick={onToggle}
      aria-label="Toggle menu"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        {isOpen ? (
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
