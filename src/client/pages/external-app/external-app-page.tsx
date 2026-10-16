import { externalAppOrigin } from '@/lib/external-app';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = { feature: 'books' | 'anatomy' | 'blogs'; destination?: string };

export default function ExternalAppPage({ feature, destination = '/' }: Props) {
  const apps = {
    books: { title: 'Vetify Books', origin: import.meta.env.VITE_BOOKS_ORIGIN },
    anatomy: { title: 'Vetify Anatomy', origin: import.meta.env.VITE_ANATOMY_ORIGIN },
    blogs: { title: 'Vetify Blogs', origin: import.meta.env.VITE_BLOGS_ORIGIN },
  };
  const { title, origin: configured } = apps[feature];
  const origin = externalAppOrigin(configured, import.meta.env.DEV);
  return (
    <main className="mx-auto flex max-w-xl flex-col px-6 py-8 text-center sm:py-10 xl:min-h-[60vh] xl:justify-center xl:py-16">
      <h1 className="text-3xl font-black text-slate-950">{title}</h1>
      <p className="mt-4 text-slate-600">
        {origin
          ? `${title} opens in its own application.`
          : `${title} is not available yet. Please try again later.`}
      </p>
      {origin && (
        <a
          href={`${origin}${destination}`}
          className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
        >
          Open {title}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      )}
      <Link to="/" className="mt-6 text-sm text-teal-800 underline">
        Back to Vetify
      </Link>
    </main>
  );
}
