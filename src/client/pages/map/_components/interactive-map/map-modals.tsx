import { Suspense, lazy, useEffect } from 'react';

const VetMap = lazy(() => import('@/components/VetMap'));

interface MapModalProps {
  onClose: () => void;
}

export default function MapModal({ onClose }: MapModalProps) {
  // Handle Escape key and body scroll lock on mount
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md"
        style={{ animation: 'fadeIn 0.2s ease both' }}
        onClick={onClose}
      >
        <div
          className="relative w-full h-full"
          style={{ animation: 'scaleIn 0.25s ease both' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-[2100] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-xl text-slate-800 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Close
          </button>

          <Suspense fallback={null}>
            <VetMap zoom={6} center={[12.87, 121.77]} showOverlay />
          </Suspense>
        </div>
      </div>
    </>
  );
}
