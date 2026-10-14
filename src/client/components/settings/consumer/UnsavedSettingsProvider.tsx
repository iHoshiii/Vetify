import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UnsavedChangesContext } from '@/hooks/unsaved-changes-context';
import DiscardChangesDialog from './DiscardChangesDialog';

export default function UnsavedSettingsProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  function requestNavigation(path: string) {
    if (path === location.pathname) return;
    if (dirty) setDestination(path);
    else navigate(path);
  }

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, requestNavigation }}>
      {children}
      {destination && (
        <DiscardChangesDialog
          onStay={() => setDestination(null)}
          onLeave={() => {
            setDestination(null);
            setDirty(false);
            navigate(destination);
          }}
        />
      )}
    </UnsavedChangesContext.Provider>
  );
}
