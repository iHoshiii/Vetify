import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessionalAffiliatePage from '@/pages/professionals/affiliate-page';
import { getBookAffiliate } from '@/services/affiliate.service';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'vet' } }),
}));
vi.mock('@/services/affiliate.service', () => ({ getBookAffiliate: vi.fn() }));
const summary = {
  earningsCentavos: 800,
  monthEarningsCentavos: 200,
  downloads: 4,
  rateCentavos: 200,
  daily: [{ date: '2026-10-01', earningsCentavos: 200, downloads: 1 }],
  topBooks: [{ id: 'book', title: 'Veterinary handbook', downloads: 4, earningsCentavos: 800 }],
  items: [{ id: 'book', title: 'Veterinary handbook', downloads: 4, earningsCentavos: 800 }],
  page: 1,
  pages: 1,
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ProfessionalAffiliatePage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBookAffiliate).mockResolvedValue(summary);
});
describe('Professional affiliate page', () => {
  it('shows peso earnings, paid downloads and each book breakdown', async () => {
    mount();
    expect(await screen.findByRole('row', { name: /Veterinary handbook/ })).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: 'Daily affiliate earnings for the last 30 days' })
    ).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Top books by paid downloads' })).toBeInTheDocument();
    expect(screen.getByText('₱2.00 / download')).toBeInTheDocument();
    expect(screen.getByText('This month').parentElement).toHaveTextContent('₱2.00');
    expect(screen.getByText('Total earnings').parentElement).toHaveTextContent('₱8.00');
    const row = screen.getByRole('row', { name: /Veterinary handbook/ });
    expect(within(row).getByText('4')).toBeInTheDocument();
    expect(within(row).getByText('₱8.00')).toBeInTheDocument();
  });
  it('shows zero earnings and an upload link when there are no books', async () => {
    vi.mocked(getBookAffiliate).mockResolvedValue({
      ...summary,
      earningsCentavos: 0,
      monthEarningsCentavos: 0,
      downloads: 0,
      items: [],
      daily: [{ date: '2026-10-01', earningsCentavos: 0, downloads: 0 }],
      topBooks: [],
      pages: 0,
    });
    mount();
    expect(await screen.findByText('No books yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upload book' })).toHaveAttribute(
      'href',
      '/professionals/dashboard/books'
    );
    expect(screen.getByText('Total earnings').parentElement).toHaveTextContent('₱0.00');
    expect(screen.getByText('No paid downloads yet')).toBeInTheDocument();
  });
  it('shows an error with a retry control', async () => {
    vi.mocked(getBookAffiliate).mockRejectedValueOnce(new Error('Unable to load earnings.'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load earnings.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Veterinary handbook/ })).toBeInTheDocument();
  });
  it('loads the selected page while leaving totals visible', async () => {
    vi.mocked(getBookAffiliate).mockImplementation(async (page) => ({
      ...summary,
      page,
      pages: 2,
      items: [
        { ...summary.items[0], title: page === 1 ? 'Veterinary handbook' : 'Veterinary surgery' },
      ],
    }));
    mount();
    await screen.findByRole('row', { name: /Veterinary handbook/ });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Veterinary surgery')).toBeInTheDocument();
    expect(screen.getByText('Total earnings').parentElement).toHaveTextContent('₱8.00');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
