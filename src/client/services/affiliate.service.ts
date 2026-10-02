import type { BookAffiliatePage } from '@shared/books';
import { apiFetch } from './api';

export function getBookAffiliate(page: number, signal?: AbortSignal) {
  return apiFetch<BookAffiliatePage>(`/books/affiliate?page=${page}`, { signal });
}
