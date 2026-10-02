import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getBookAffiliate } from '@/services/affiliate.service';
import AffiliateCharts from './_components/affiliate-charts';

const pesos = (centavos: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(centavos / 100);
const BUTTON =
  'rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-50 disabled:opacity-40';
export default function ProfessionalAffiliatePage() {
  useDocumentTitle('Affiliate');
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['affiliate', user?.id, page],
    queryFn: ({ signal }) => getBookAffiliate(page, signal),
    refetchInterval: 30000,
  });
  const data = query.data;
  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Wallet size={20} className="text-teal-800" />
          Affiliate
        </h1>
        {data && (
          <span
            title="Downloads of your own books do not earn commissions."
            className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800"
          >
            {pesos(data.rateCentavos)} / download
          </span>
        )}
      </header>
      {query.isPending && (
        <p role="status" className="text-sm text-slate-500">
          Loading earnings…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="text-sm text-rose-700">
          <p>{query.error.message}</p>
          <button className={`${BUTTON} mt-3`} onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total earnings', value: pesos(data.earningsCentavos) },
              { label: 'This month', value: pesos(data.monthEarningsCentavos) },
              { label: 'Paid downloads', value: data.downloads.toLocaleString('en-PH') },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-teal-900">{stat.value}</p>
              </div>
            ))}
          </div>
          <AffiliateCharts daily={data.daily} topBooks={data.topBooks} />
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-12 text-sm text-slate-500">
              <BookOpen size={28} className="text-teal-700/50" />
              <p>No books yet</p>
              <Link to="/professionals/dashboard/books" className={BUTTON}>
                Upload book
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="pb-3 font-medium">
                      Book
                    </th>
                    <th scope="col" className="px-4 pb-3 text-right font-medium">
                      Paid downloads
                    </th>
                    <th scope="col" className="pb-3 text-right font-medium">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((book) => (
                    <tr key={book.id}>
                      <th scope="row" className="py-4 pr-3 font-medium text-slate-800">
                        {book.title}
                      </th>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-500">
                        {book.downloads.toLocaleString('en-PH')}
                      </td>
                      <td className="whitespace-nowrap py-4 text-right font-semibold tabular-nums text-teal-900">
                        {pesos(book.earningsCentavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.pages > 1 && (
            <nav
              aria-label="Affiliate books pagination"
              className="flex items-center justify-center gap-4"
            >
              <button
                className={BUTTON}
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                {page} / {data.pages}
              </span>
              <button
                className={BUTTON}
                disabled={page >= data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
