import { book, mount, state } from './books-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '@/services/api';

describe('Books private uploads', () => {
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
    vi.mocked(apiFetch).mockImplementation(async (_path, options) => {
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
});
