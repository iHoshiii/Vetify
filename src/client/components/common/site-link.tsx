import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { externalAppOrigin } from '@/lib/external-app';

// Hash targets and configured Books links use native browser navigation.
export function SiteLink({
  to,
  className,
  onClick,
  children,
}: {
  to: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const booksOrigin =
    to === '/books'
      ? externalAppOrigin(import.meta.env.VITE_BOOKS_ORIGIN, import.meta.env.DEV)
      : null;
  if (booksOrigin || to.startsWith('/#')) {
    return (
      <a href={booksOrigin ? `${booksOrigin}/` : to} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
