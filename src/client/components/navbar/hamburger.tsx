interface HamburgerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Hamburger({ isOpen, onToggle }: HamburgerProps) {
  return (
    <button
      type="button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-vet-primary hover:text-vet-primary xl:hidden"
      onClick={onToggle}
      aria-label="Toggle menu"
      aria-expanded={isOpen}
      aria-controls="mobile-navigation"
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
