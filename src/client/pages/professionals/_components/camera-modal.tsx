import { X } from 'lucide-react';
import { useState, type RefObject } from 'react';

import type { Guide } from './capture-check';
import CaptureGuide from './capture-guide';
import useAutoShot from './use-auto-shot';

type Props = {
  label: string;
  guide: Guide;
  video: RefObject<HTMLVideoElement>;
  onShoot: () => void;
  onClose: () => void;
};

const STANDING: Record<Guide, string> = {
  face: 'Put your whole head inside the oval, in even light, and look straight at the lens.',
  card: 'Fill the box with the licence, all four edges inside it, out of any glare.',
};

function standing(armed: boolean, stuck: boolean): string {
  if (!armed) return 'Automatic capture is off here. Press Take photo when it looks right.';
  if (stuck) return 'Still not right? Press Take photo to send it as it is.';
  return 'It counts down from three and takes the photo itself once that holds.';
}

// The stream decides the shape of the frame, because the outline is placed by share of it
export default function CameraModal({ label, guide, video, onShoot, onClose }: Props) {
  const [ratio, setRatio] = useState(3 / 4);
  const shot = useAutoShot({ video, guide, active: true, onShoot });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl bg-slate-950 p-4 shadow-2xl sm:max-h-[calc(100vh-4rem)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="absolute right-4 top-4 z-10 rounded-xl bg-white/90 p-2 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-950"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <p className="mb-3 pr-12 text-sm font-black tracking-tight text-white">{label}</p>

        <div
          className="relative mx-auto w-full shrink-0 overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: ratio, maxWidth: `calc(62vh * ${ratio})` }}
        >
          {/* object-cover with the wrapper on the stream's own ratio: no letterboxing to
              offset the outline from the pixels the check reads */}
          <video
            ref={video}
            playsInline
            muted
            aria-label={`${label} camera preview`}
            onLoadedMetadata={(event) => {
              const element = event.currentTarget;
              if (element.videoWidth) setRatio(element.videoWidth / element.videoHeight);
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <CaptureGuide guide={guide} ratio={ratio} {...shot} />
        </div>

        <p className="mt-3 text-center text-xs leading-5 text-white/70">
          {STANDING[guide]} {standing(shot.armed, shot.stuck)}
        </p>

        <div className="mt-3 flex justify-center gap-2">
          {/* Only the way through on a device the detector fails on, or if it keeps refusing */}
          {(!shot.armed || shot.stuck) && (
            <button
              type="button"
              onClick={onShoot}
              className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-400"
            >
              Take photo
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
