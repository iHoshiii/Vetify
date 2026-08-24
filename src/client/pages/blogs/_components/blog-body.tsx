import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

const COMPONENTS: Components = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-10 text-2xl font-black tracking-tight text-slate-950">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-8 text-lg font-black tracking-tight text-slate-950">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => <p className="mt-5">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mt-5 list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mt-5 list-decimal space-y-2 pl-6">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="pl-1">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-bold text-slate-950">{children}</strong>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-6 border-l-4 border-teal-800/30 pl-4 italic">{children}</blockquote>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-teal-900/5 px-1.5 py-0.5 text-[0.9em] font-semibold text-teal-900">
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-teal-800 underline hover:text-teal-900"
    >
      {children}
    </a>
  ),
};

/**
 * A post body as markdown.
 *
 * react-markdown escapes HTML unless it is given `rehype-raw`, and deliberately
 * is not given it here: bodies are written by professionals and admins rather
 * than by us, so raw HTML in one must never reach the DOM. The obvious
 * shortcut — `dangerouslySetInnerHTML` — would hand every author a stored XSS.
 */
export function BlogBody({ children }: { children: string }) {
  return (
    <div className="mt-8 text-[1.05rem] leading-8 text-slate-700">
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
