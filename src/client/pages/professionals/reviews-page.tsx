import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfessionalReviews } from '@/hooks/useProfessionals';
import ReviewList from '@/components/review-list';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { useConsoleApplication } from './professional-layout';
import ReviewReplyForm from './_components/review-reply-form';

// The vet's own reviews, every rated visit, newest first. Reuses the public masked list so the vet sees the same names an owner does, and hangs a reply composer under any review they have not answered yet.
export default function ProfessionalReviewsPage() {
  useDocumentTitle('Reviews', 'Respond to the ratings pet owners left on your visits.');

  const application = useConsoleApplication();
  const [page, setPage] = useState(1);
  const query = useProfessionalReviews(application.id, { page });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
          <MessageSquare className="h-4 w-4 text-teal-800" />
          Reviews
        </h1>
        <p className="text-xs text-slate-500">
          Respond once to a rating. Your reply shows publicly under the review.
        </p>
      </div>

      <ReviewList
        page={query.data}
        onPageChange={setPage}
        isLoading={query.isPending}
        emptyLabel="No ratings yet."
        renderFooter={(review) =>
          review.reply ? null : (
            <ReviewReplyForm appointmentId={review.id} professionalId={application.id} />
          )
        }
      />
    </div>
  );
}
