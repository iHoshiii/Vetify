import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { updateSearchMetadata } from './metadata';

export function SearchMetadata() {
  const { pathname } = useLocation();
  useEffect(() => updateSearchMetadata(pathname), [pathname]);
  return null;
}
