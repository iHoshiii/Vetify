import { useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { AccountLinkMethod, AccountLoginMethods } from '@shared/account-auth';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import AddPasswordForm from './AddPasswordForm';
import LinkMethodCodeForm from './LinkMethodCodeForm';
import { LOGIN_METHOD_NAMES } from './account-auth-feedback';

type Props = {
  method: AccountLinkMethod;
  methods: AccountLoginMethods;
  email: string;
  passwordReady: boolean;
  onClose: () => void;
  onVerified: () => void;
  onProofExpired: () => void;
};

export default function LinkMethodDialog({
  method,
  methods,
  email,
  passwordReady,
  onClose,
  onVerified,
  onProofExpired,
}: Props) {
  const titleId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  useBodyScrollLock();
  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-teal-700 bg-white p-5 shadow-xl outline-none sm:p-7"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold text-slate-900">
            Link {LOGIN_METHOD_NAMES[method]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close linking popup"
            className="shrink-0 rounded-lg p-2 text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {method === 'local' && passwordReady ? (
          <div className="space-y-4">
            <AddPasswordForm
              methods={{ ...methods, passwordReady: true }}
              onProofExpired={onProofExpired}
            />
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-slate-600"
            >
              Cancel linking
            </button>
          </div>
        ) : (
          <LinkMethodCodeForm
            method={method}
            email={email}
            onClose={onClose}
            onVerified={onVerified}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
