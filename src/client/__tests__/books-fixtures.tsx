import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, vi } from 'vitest';
import BooksPage from '@/pages/books/books-page';
import { apiFetch } from '@/services/api';

const state = vi.hoisted(() => ({ role: 'user', remaining: 3 }));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'reader', role: state.role } }),
}));
vi.mock('@/services/api', () => ({ apiFetch: vi.fn(), apiFetchBlob: vi.fn() }));
export const book = {
  id: 'book-id',
  title: 'Veterinary handbook',
  description: 'A guide to animal health.',
  topic: 'Clinical practice',
  uploadedBy: 'Dr Vet',
  size: 1024,
  createdAt: '2026-10-01T00:00:00Z',
};
export function mount(manage = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BooksPage manage={manage} />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'user';
  state.remaining = 3;
  vi.mocked(apiFetch).mockImplementation(async () => ({
    items: [
      {
        ...book,
        allowance: {
          used: 3 - state.remaining,
          remaining: state.remaining,
          resetsAt: '2026-10-31T16:00:00Z',
        },
      },
      {
        ...book,
        id: 'second-book',
        title: 'Veterinary surgery',
        allowance: { used: 0, remaining: 3, resetsAt: '2026-10-31T16:00:00Z' },
      },
    ],
    pages: 1,
  }));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
export { state };
