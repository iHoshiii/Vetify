import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// A hash target like /#about needs a plain anchor so the browser scrolls to the section, every other internal route uses Link for client-side nav
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
  if (to.startsWith('/#')) {
    return (
      <a href={to} className={className} onClick={onClick}>
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
