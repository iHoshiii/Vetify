import { useAuth } from '@/components/providers/AuthProvider';
import { useOwnApplication } from '@/hooks/useProfessionals';
import { ShieldCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROW =
  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50';

const NOTE = 'rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600';

// The other consoles this account can open, from the tray it already signs into.
//
// The professional entry follows the application rather than the role, because the role
// only arrives on verification and somebody waiting on a reviewer still has a page to
// open. A refusal takes the entry away entirely: there is nothing behind it to do. A
// suspension leaves a line saying so, since that one is meant to be lifted.
//
// A link and nothing more - /admin is gated by RequireRole and every endpoint behind it
// re-reads the stored role, so forging the flag in devtools buys 403s.
export default function ConsoleLinks({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useAuth();
  const { data: application } = useOwnApplication();
  const status = application?.status;
  // The role keeps a verified vet's link drawn while the application is still in flight
  const filed = user?.role === 'professional' || status === 'pending' || status === 'interview';

  return (
    <>
      {status === 'suspended' ? (
        <p className={NOTE}>
          Your professional listing is suspended, so the console is closed. Write to us if you want
          it looked at again.
        </p>
      ) : (
        filed && (
          <Link to="/professionals/dashboard" onClick={onNavigate} className={ROW}>
            <Stethoscope size={16} />
            Professional console
          </Link>
        )
      )}
      {user?.role === 'admin' && (
        <Link to="/admin" onClick={onNavigate} className={ROW}>
          <ShieldCheck size={16} />
          Admin console
        </Link>
      )}
    </>
  );
}
