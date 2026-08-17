import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/providers/AuthProvider';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Goes through the provider so the navbar drops back to "Log in" without a
  // reload. logout() clears local state even if the server call fails, so the
  // user is never stranded looking signed in.
  const handleLogout = async () => {
    setPending(true);
    try {
      await logout();
      onClose();
      navigate('/', { replace: true });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-sm scale-100 rounded-2xl bg-white p-6 shadow-2xl transition-transform">
        <h3 className="mb-2 text-xl font-bold text-slate-800">Log Out</h3>
        <p className="mb-6 text-sm text-slate-600">Are you sure you want to log out?</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={pending}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-red-700 hover:shadow-lg disabled:opacity-70"
          >
            {pending ? 'Logging out…' : 'Yes, Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
