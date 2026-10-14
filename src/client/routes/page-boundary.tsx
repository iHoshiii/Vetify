import { Suspense, type ReactNode } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';

export function PageBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-64 items-center justify-center px-6 py-16 text-muted-foreground"
        >
          Loading page...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function PageOutlet() {
  const context = useOutletContext();
  return (
    <PageBoundary>
      <Outlet context={context} />
    </PageBoundary>
  );
}
