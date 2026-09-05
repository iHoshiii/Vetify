import { CheckCircle2, Camera } from 'lucide-react';

import CameraModal from './camera-modal';
import type { Guide } from './capture-check';
import useCamera, { type Capture } from './use-camera';

export type { Capture };

type Props = {
  label: string;
  hint: string;
  // 'user' for the face, 'environment' for the card, which is the phone's rear camera
  facing: 'user' | 'environment';
  // Which outline the applicant lines up inside, and what the frame is checked against
  guide: Guide;
  value: Capture | null;
  onChange: (capture: Capture | null) => void;
  error?: string;
};

// There is no file input on purpose: the application asks for a photograph of the person
// applying and of the card in their hand, and a chooser would accept a picture of a picture.
export default function PhotoCapture({
  label,
  hint,
  facing,
  guide,
  value,
  onChange,
  error,
}: Props) {
  const camera = useCamera({ facing, onCapture: onChange });

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <h3 className="text-sm font-black tracking-tight text-slate-950">{label}</h3>
          {/* Required, so the star stays beside the title until a photograph has been taken */}
          {!value && (
            <span aria-hidden className="text-sm font-bold text-red-500">
              *
            </span>
          )}
        </div>
        {value && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-800">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Ready
          </span>
        )}
      </div>
      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{hint}</p>

      {camera.preview && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
          <img
            src={camera.preview}
            alt={`${label}, as taken`}
            className="h-36 w-full object-contain"
          />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {value ? (
          <button
            type="button"
            onClick={camera.retake}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-teal-700 hover:bg-teal-50 hover:text-teal-900"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Retake
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void camera.start()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-900"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Open camera
          </button>
        )}
      </div>

      {(camera.message || error) && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {camera.message || error}
        </p>
      )}

      {camera.cameraOpen && (
        <CameraModal
          label={label}
          guide={guide}
          video={camera.videoRef}
          onShoot={camera.take}
          onClose={camera.stop}
        />
      )}
    </div>
  );
}
