import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import BooksPage from '@/pages/books/books-page';
import { apiFetch, apiFetchBlob } from '@/services/api';

const state = vi.hoisted(() => ({ role: 'user', remaining: 3 }));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'reader', role: state.role } }),
}));
vi.mock('@/services/api', () => ({ apiFetch: vi.fn(), apiFetchBlob: vi.fn() }));
const book = {
  id: 'book-id',
  title: 'Veterinary handbook',
  description: 'A guide to animal health.',
  topic: 'Clinical practice',
  uploadedBy: 'Dr Vet',
  size: 1024,
  createdAt: '2026-10-01T00:00:00Z',
};
function mount(manage = false) {
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
describe('Books page', () => {
  it('shows private checking results in My uploads and permits downloads only for approved documents', async () => {
    state.role = 'professional';
    vi.mocked(apiFetch).mockResolvedValue({
      items: [
        { ...book, id: 'pending', title: 'Pending article', status: 'pending', reason: null },
        {
          ...book,
          id: 'approved',
          title: 'Approved article',
          status: 'approved',
          reason: 'Veterinary content.',
        },
        {
          ...book,
          id: 'rejected',
          title: 'Unrelated article',
          status: 'rejected',
          reason: 'This document is unrelated to veterinary care.',
        },
        {
          ...book,
          id: 'uncertain',
          title: 'Uncertain scan',
          status: 'unverified',
          reason: 'The scan could not be read completely.',
        },
      ],
      pages: 1,
    });
    mount(true);
    expect(await screen.findByText('Pending article')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My uploads' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(apiFetch).toHaveBeenCalledWith('/books/mine?page=1');
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByText('Not approved')).toBeInTheDocument();
    expect(screen.getByText('Unable to verify')).toBeInTheDocument();
    expect(screen.getByText('This document is unrelated to veterinary care.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download Pending article' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download Unrelated article' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download Uncertain scan' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Approved article' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  });
  it('refreshes the private status after requesting another automatic check', async () => {
    state.role = 'professional';
    let status = 'unverified';
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (options?.method === 'POST') {
        status = 'pending';
        return {};
      }
      return { items: [{ ...book, status, reason: null }], pages: 1 };
    });
    mount(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/books/book-id/recheck', { method: 'POST' })
    );
    expect(await screen.findByText('Checking veterinary relevance…')).toBeInTheDocument();
    expect(await screen.findByText('Checking')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });
  it('submits a PDF and switches to private uploads while automatic checking runs', async () => {
    state.role = 'professional';
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (options?.method === 'POST') return { ...book, status: 'pending', reason: null };
      return {
        items: path.startsWith('/books/mine') ? [{ ...book, status: 'pending', reason: null }] : [],
        pages: 1,
      };
    });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Upload book' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: book.title } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: book.description } });
    await userEvent.upload(
      screen.getByLabelText(/PDF.*Max 10 MB/),
      new File(['%PDF-1.4\n%%EOF'], 'article.pdf', { type: 'application/pdf' })
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Upload book' }).closest('form')!);
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('veterinaryOnly=true'),
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect(await screen.findByText('Uploaded. Checking veterinary relevance…')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My uploads' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(await screen.findByText('Checking')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('veterinaryOnly=true'),
      expect.objectContaining({ method: 'POST', body: expect.any(Blob) })
    );
  });
  it('shows a concise library and hides uploads from users and admins', async () => {
    const first = mount();
    expect(await screen.findByText('Veterinary handbook')).toBeInTheDocument();
    expect(screen.queryByText('3 downloads per book / month')).not.toBeInTheDocument();
    expect(screen.queryByText(/3 of 3 downloads remaining/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload book' })).not.toBeInTheDocument();
    first.unmount();
    state.role = 'admin';
    mount();
    expect(screen.queryByRole('button', { name: 'Upload book' })).not.toBeInTheDocument();
  });
  it('keeps the professional upload form collapsed until requested', () => {
    state.role = 'professional';
    mount();
    expect(screen.getByRole('button', { name: 'Upload book' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload book' }));
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeRequired();
  });
  it('keeps downloads enabled after the three commission slots are used and removes limit text', async () => {
    state.remaining = 0;
    mount();
    await screen.findByText('Veterinary handbook');
    expect(screen.queryByText(/Resets|downloads left|Limit reached/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Veterinary handbook' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download Veterinary surgery' })).toBeEnabled();
    expect(apiFetchBlob).not.toHaveBeenCalled();
  });
  it('allows another download of the same book after the first three without blocking its button', async () => {
    state.remaining = 0;
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:book');
        static revokeObjectURL = vi.fn();
      }
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(apiFetchBlob).mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    mount();
    await screen.findByText('Veterinary handbook');
    const button = screen.getByRole('button', { name: 'Download Veterinary handbook' });
    fireEvent.click(button);
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(button).toBeEnabled());
    expect(apiFetchBlob).toHaveBeenCalledTimes(2);
  });
  it('surfaces a download error and lets the user retry', async () => {
    vi.mocked(apiFetchBlob).mockImplementation(async () => {
      throw new Error('Download failed. Please try again.');
    });
    mount();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download Veterinary handbook' })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download Veterinary handbook' }));
    expect(await screen.findByText('Download failed. Please try again.')).toBeInTheDocument();
    expect(apiFetchBlob).toHaveBeenCalledWith('/books/book-id/download', { method: 'POST' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download Veterinary handbook' })).toBeEnabled()
    );
    expect(screen.getByRole('button', { name: 'Download Veterinary surgery' })).toBeEnabled();
  });
});
