import { useProfessionals } from '@/hooks/useProfessionals';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

// Search hits the whole directory server-side, so a name on page 99 surfaces from page 1.
export function useAllVets(open: boolean) {
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounced so a keystroke is not a request, and a new search snaps back to the first page.
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(term.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [term]);

  // A fresh open starts clean rather than on whatever the last visit searched for.
  useEffect(() => {
    if (!open) return;
    setTerm('');
    setQ('');
    setPage(1);
  }, [open]);

  const query = useProfessionals({
    available: true,
    sort: 'name',
    q: q || undefined,
    page,
    limit: PAGE_SIZE,
  });

  return { term, setTerm, page, setPage, query };
}
