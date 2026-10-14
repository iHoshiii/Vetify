import { useContext, useEffect } from 'react';
import { UnsavedChangesContext } from './unsaved-changes-context';

// Ask the browser to confirm before a reload or tab close drops edits that are not saved yet.
export function useUnsavedGuard(dirty: boolean) {
  const setDirty = useContext(UnsavedChangesContext)?.setDirty;
  useEffect(() => {
    setDirty?.(dirty);
    return () => setDirty?.(false);
  }, [dirty, setDirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
