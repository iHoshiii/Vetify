import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS_ITEMS } from './nav-data';

interface ToolsDropdownProps {
  isAuthenticated: boolean;
}

export function ToolsDropdown({ isAuthenticated }: ToolsDropdownProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={toolsRef} className="relative">
      <button
        onClick={() => setToolsOpen((v) => !v)}
        className="group relative flex items-center gap-1 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-teal-700"
      >
        Tools
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            toolsOpen ? 'rotate-180' : ''
          }`}
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-teal-600 transition-transform duration-300 group-hover:scale-x-100" />
      </button>

      {/* Dropdown Panel */}
      <div
        className={`absolute left-0 top-full mt-2 w-52 origin-top-left rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-900/10 transition-all duration-200 ${
          toolsOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        {!isAuthenticated && (
          <Link
            to="/map"
            onClick={() => setToolsOpen(false)}
            className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-teal-50"
          >
            <span className="text-sm font-bold text-slate-800">📍 Find Vets</span>
            <span className="mt-0.5 text-xs text-slate-500">Locate nearby clinics</span>
          </Link>
        )}
        {TOOLS_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setToolsOpen(false)}
            className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-teal-50"
          >
            <span className="text-sm font-bold text-slate-800">{item.label}</span>
            <span className="mt-0.5 text-xs text-slate-500">{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
