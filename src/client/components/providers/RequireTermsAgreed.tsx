import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useOwnApplication } from '@/hooks/useProfessionals';
import { hasAgreedToTerms } from '@/lib/terms-consent';

// Stands behind RequireAuth on the enquiry route, so nobody types their way past the
// two dialogs on /professionals. Sends them to the start of the flow, not to an error.
export function RequireTermsAgreed({ children }: { children: ReactNode }) {
  const query = useOwnApplication();

  // An application already on file was agreed to when it was sent, and the page it
  // opens is the status view, so re-reading the conditions would gate the wrong thing
  if (hasAgreedToTerms() || query.data) return <>{children}</>;

  // Held rather than redirected while the lookup is out, or an applicant with a
  // submitted enquiry sees the flow restart for a moment on every reload
  if (query.isLoading) return null;

  return <Navigate to="/professionals" replace />;
}
