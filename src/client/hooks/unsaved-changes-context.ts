import { createContext } from 'react';

export const UnsavedChangesContext = createContext<{
  setDirty: (dirty: boolean) => void;
  requestNavigation: (path: string) => void;
} | null>(null);
