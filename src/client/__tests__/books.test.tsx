import { mount, state } from './books-fixtures';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { apiFetchBlob } from '@/services/api';

describe('Books page', () => {
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
