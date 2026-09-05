import type { InviteSummary } from '@/services/professionals.service';
import { Link } from 'react-router-dom';

import ApplyStep from './apply-step';

// The three a reviewer read, in the order the enquiry asked for them
function rows(invite: InviteSummary) {
  return [
    { term: 'Name', value: invite.name },
    { term: 'License number', value: invite.licenseNumber },
    { term: 'Email', value: invite.email },
  ];
}

const NOTE = (
  <>
    A reviewer approved these three, so they are fixed here. The name has to match the one on your
    PRC licence. If any of it is wrong,{' '}
    {/* A new tab, because leaving this page loses the photographs already taken */}
    <Link
      to="/contact"
      target="_blank"
      rel="noreferrer"
      className="font-bold text-teal-800 underline"
    >
      contact us
    </Link>
    .
  </>
);

export default function ReviewedDetails({ invite }: { invite: InviteSummary }) {
  return (
    <ApplyStep step={1} title="From your enquiry" note={NOTE}>
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows(invite).map((row) => (
          <div key={row.term} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-xs font-black uppercase tracking-wider text-slate-500">
              {row.term}
            </dt>
            <dd className="mt-1 break-words text-sm font-bold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </ApplyStep>
  );
}
