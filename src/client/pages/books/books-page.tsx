import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Download, Plus, RotateCw, X } from 'lucide-react';
import {
  BOOK_MAX_BYTES,
  BOOK_TOPICS,
  type BookSummary,
  type BookUploadSummary,
  type BookStatus,
} from '@shared/books';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiFetch, apiFetchBlob } from '@/services/api';

const BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-bold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50';
const INPUT = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm';
const STATUS: Record<BookStatus, { label: string; style: string }> = {
  pending: { label: 'Checking', style: 'bg-amber-50 text-amber-800' },
  checking: { label: 'Checking', style: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Approved', style: 'bg-teal-50 text-teal-800' },
  rejected: { label: 'Not approved', style: 'bg-rose-50 text-rose-800' },
  unverified: { label: 'Unable to verify', style: 'bg-slate-100 text-slate-700' },
};
export default function BooksPage({ manage = false }: { manage?: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView] = useState<'library' | 'uploads'>(
    manage && user?.role === 'professional' ? 'uploads' : 'library'
  );
  const books = useQuery({
    queryKey: ['books', user?.id, view, page],
    queryFn: () =>
      apiFetch<{ items: (BookSummary | BookUploadSummary)[]; pages: number }>(
        `/books${view === 'uploads' ? '/mine' : ''}?page=${page}`
      ),
    refetchInterval: (query) =>
      view === 'uploads' &&
      query.state.data?.items.some(
        (book) => 'status' in book && (book.status === 'pending' || book.status === 'checking')
      )
        ? 10000
        : 60000,
  });
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const fileInput = form.elements.namedItem('pdf');
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > BOOK_MAX_BYTES ||
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      setMessage('Choose a PDF document of up to 10 MB.');
      return;
    }
    const query = new URLSearchParams({
      title: String(values.get('title')),
      description: String(values.get('description')),
      topic: String(values.get('topic')),
      veterinaryOnly: 'true',
    });
    setUploading(true);
    setMessage('');
    try {
      await apiFetch(`/books?${query}`, {
        method: 'POST',
        body: new Blob([file], { type: 'application/pdf' }),
      });
      form.reset();
      setShowUpload(false);
      setPage(1);
      setView('uploads');
      await client.invalidateQueries({ queryKey: ['books'] });
      setMessage('Uploaded. Checking veterinary relevance…');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }
  async function recheck(book: BookSummary) {
    setBusy(book.id);
    setMessage('');
    try {
      await apiFetch(`/books/${book.id}/recheck`, { method: 'POST' });
      await client.invalidateQueries({ queryKey: ['books', user?.id] });
      setMessage('Checking veterinary relevance…');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start another check.');
    } finally {
      setBusy(null);
    }
  }
  async function download(book: BookSummary) {
    setBusy(book.id);
    setMessage('');
    try {
      const blob = await apiFetchBlob(`/books/${book.id}/download`, { method: 'POST' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${
        book.title.replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'veterinary-book'
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setBusy(null);
      await client.invalidateQueries({ queryKey: ['books', user?.id] });
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-slate-900 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-teal-900 p-3 text-teal-100">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Veterinary Books</h1>
          </div>
        </div>
        {user?.role === 'professional' && (
          <button
            type="button"
            className={BUTTON}
            aria-expanded={showUpload}
            aria-controls="book-upload"
            onClick={() => setShowUpload((value) => !value)}
          >
            {showUpload ? <X size={16} /> : <Plus size={16} />}
            {showUpload ? 'Close' : 'Upload book'}
          </button>
        )}
      </header>
      {user?.role === 'professional' && (
        <div
          role="tablist"
          aria-label="Book views"
          className="mb-6 inline-flex max-w-full gap-1 rounded-xl bg-teal-900/5 p-1"
        >
          {(['library', 'uploads'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={view === tab}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                view === tab
                  ? 'bg-white text-teal-900 shadow-sm'
                  : 'text-slate-500 hover:text-teal-900'
              }`}
              onClick={() => {
                setView(tab);
                setPage(1);
                setMessage('');
              }}
            >
              {tab === 'library' ? 'Library' : 'My uploads'}
            </button>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
          {message}
        </p>
      )}
      {user?.role === 'professional' && showUpload && (
        <form
          id="book-upload"
          onSubmit={upload}
          className="mb-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold">New resource</h2>
          <label className="block">
            Title
            <input name="title" required minLength={3} maxLength={150} className={INPUT} />
          </label>
          <label className="block">
            Description
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={1000}
              className={INPUT}
            />
          </label>
          <label className="block">
            Topic
            <select name="topic" className={INPUT}>
              {BOOK_TOPICS.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>
          <label className="block">
            PDF · Max 10 MB
            <input
              name="pdf"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="mt-2 block w-full text-sm"
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-1" />
            This is a veterinary resource I have permission to share.
          </label>
          <button disabled={uploading} className={BUTTON}>
            {uploading ? 'Uploading…' : 'Upload book'}
          </button>
        </form>
      )}
      {books.isLoading && <p role="status">Loading books…</p>}
      {books.isError && (
        <div role="alert">
          <p>{books.error.message}</p>
          <button className={BUTTON} onClick={() => void books.refetch()}>
            Try again
          </button>
        </div>
      )}
      {books.data?.items.length === 0 && (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-teal-900/15 bg-white/40">
          <BookOpen className="mb-4 h-10 w-10 text-teal-800/40" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-500">
            {view === 'uploads' ? 'No uploads yet' : 'No books yet'}
          </p>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {books.data?.items.map((book) => {
          const own = view === 'uploads';
          const status = 'status' in book ? book.status : 'pending';
          return (
            <article
              key={book.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-sm"
            >
              <div
                aria-hidden="true"
                className="flex h-36 items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100"
              >
                <div className="flex h-24 w-16 -rotate-6 items-center justify-center rounded-r-lg border-l-4 border-teal-600 bg-teal-900 text-teal-100 shadow-lg">
                  <BookOpen size={28} strokeWidth={1.5} />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  {book.topic}
                </p>
                <h2 className="mt-2 break-words text-lg font-bold">{book.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{book.uploadedBy}</p>
                {own && (
                  <div className="mt-3" aria-live="polite">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[status].style}`}
                    >
                      {(status === 'pending' || status === 'checking') && (
                        <RotateCw size={12} className="animate-spin" aria-hidden="true" />
                      )}
                      {STATUS[status].label}
                    </span>
                    {'reason' in book && book.reason && status !== 'approved' && (
                      <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">
                        {book.reason}
                      </p>
                    )}
                  </div>
                )}
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-teal-800">Details</summary>
                  <p className="mt-2 break-words leading-relaxed">{book.description}</p>
                  <p className="mt-2">PDF · {(book.size / (1024 * 1024)).toFixed(1)} MB</p>
                </details>
                {(!own || status === 'approved') && (
                  <div className="mt-auto pt-5">
                    <button
                      className={`${BUTTON} w-full`}
                      aria-label={`Download ${book.title}`}
                      disabled={busy !== null}
                      onClick={() => void download(book)}
                    >
                      <Download size={16} />
                      {busy === book.id ? 'Downloading…' : 'Download'}
                    </button>
                  </div>
                )}
                {own && status === 'unverified' && (
                  <button
                    type="button"
                    className={`${BUTTON} mt-5 w-full`}
                    disabled={busy !== null}
                    onClick={() => void recheck(book)}
                  >
                    <RotateCw size={16} />
                    {busy === book.id ? 'Starting…' : 'Check again'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {books.data && books.data.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            className={BUTTON}
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {books.data.pages}
          </span>
          <button
            className={BUTTON}
            disabled={page >= books.data.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
