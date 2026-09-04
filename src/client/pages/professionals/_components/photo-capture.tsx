import { PROFESSIONAL_PHOTO_MAX_EDGE, PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import { base64ByteLength } from '@shared/schemas';
import { CheckCircle2, Camera, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** One photograph, in the shape the application schema expects it. */
export type Capture = {
  data: string;
  mimeType: 'image/jpeg';
  capturedAt: string;
};

/**
 * Qualities tried in order until the encoding fits.
 *
 * A licence number has to stay readable, so the first pass is generous and the
 * fallbacks only come into play on a camera that hands back something enormous.
 */
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

/** The frame scaled so its longest edge is at most the shared ceiling. */
function fittedSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= PROFESSIONAL_PHOTO_MAX_EDGE) return { width, height };

  const scale = PROFESSIONAL_PHOTO_MAX_EDGE / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * The frame as base64 JPEG, without the data: prefix the schema refuses.
 *
 * Returns null when even the lowest quality is over the limit, which is a camera
 * we cannot use rather than a photograph we should send and have refused.
 */
function encode(canvas: HTMLCanvasElement): string | null {
  for (const quality of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', quality);
    const data = url.slice(url.indexOf(',') + 1);
    if (base64ByteLength(data) <= PROFESSIONAL_PHOTO_MAX_BYTES) return data;
  }

  return null;
}

type Props = {
  label: string;
  hint: string;
  /** 'user' for the face, 'environment' for the card — the phone's rear camera. */
  facing: 'user' | 'environment';
  value: Capture | null;
  onChange: (capture: Capture | null) => void;
  error?: string;
};

/**
 * One photograph, taken here and now.
 *
 * There is no file input, and that is the whole point of the component: the
 * application asks for a photograph of the person applying and of the card in
 * their hand, and a chooser would accept a picture of a picture. The server can
 * only corroborate this with the freshness window, so the browser is where the
 * rule actually lives.
 *
 * The camera is stopped the moment a frame is taken and again on unmount. A
 * preview left running is a light left on, and on a phone it is also the battery.
 */
export default function PhotoCapture({ label, hint, facing, value, onChange, error }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
    setCameraOpen(false);
  }, []);

  // Nothing else unmounts the camera: a route change while the preview is open
  // would otherwise leave the device held until the tab closed.
  useEffect(() => stop, [stop]);

  async function start() {
    setMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('This browser cannot reach a camera. Open the link on your phone instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: PROFESSIONAL_PHOTO_MAX_EDGE } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
      setLive(true);
    } catch {
      // Denied, in use by something else, or no camera at all. One sentence for all
      // three, because the fix is the same: let this page use the camera.
      setMessage('We could not open the camera. Allow camera access and try again.');
      stop();
    }
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  function take() {
    const video = videoRef.current;
    if (!video) return;

    const size = fittedSize(video.videoWidth, video.videoHeight);
    if (!size.width || !size.height) {
      setMessage('The camera has not warmed up yet. Give it a second and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) {
      setMessage('This browser could not process the photo.');
      return;
    }

    context.drawImage(video, 0, 0, size.width, size.height);

    const data = encode(canvas);
    if (!data) {
      setMessage('That photo came out too large to send. Try again in better light.');
      return;
    }

    setPreview(canvas.toDataURL('image/jpeg', 0.5));
    onChange({ data, mimeType: 'image/jpeg', capturedAt: new Date().toISOString() });
    stop();
  }

  function retake() {
    setPreview(null);
    onChange(null);
    void start();
  }

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

      {preview && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
          <img src={preview} alt={`${label}, as taken`} className="h-36 w-full object-contain" />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {value ? (
          <button
            type="button"
            onClick={retake}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-teal-700 hover:bg-teal-50 hover:text-teal-900"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Retake
          </button>
        ) : live ? (
          <button
            type="button"
            onClick={take}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-900"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Take photo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-900"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Open camera
          </button>
        )}

        {live && (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>

      {(message || error) && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {message || error}
        </p>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8">
          <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-2xl bg-slate-950 p-4 shadow-2xl sm:max-h-[calc(100vh-4rem)] sm:p-6">
            <button
              type="button"
              onClick={stop}
              aria-label="Close camera"
              className="absolute right-4 top-4 z-10 rounded-xl bg-white/90 p-2 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-950"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <p className="mb-4 pr-12 text-sm font-black tracking-tight text-white">{label}</p>
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={`${label} camera preview`}
              className="min-h-0 w-full rounded-xl bg-black object-contain sm:max-h-[76vh]"
            />
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={take}
                className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-400"
              >
                Take photo
              </button>
              <button
                type="button"
                onClick={stop}
                className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
