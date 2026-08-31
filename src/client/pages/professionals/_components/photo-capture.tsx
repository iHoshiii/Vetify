import { PROFESSIONAL_PHOTO_MAX_EDGE, PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import { base64ByteLength } from '@shared/schemas';
import { X } from 'lucide-react';
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
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">{label}</h3>
        {value && (
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Taken</span>
        )}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>

      {preview && (
        <div className="mt-2 overflow-hidden rounded-md bg-slate-900/5">
          <img
            src={preview}
            alt={`${label}, as taken`}
            className="max-h-32 w-full object-contain"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {value ? (
          <button
            type="button"
            onClick={retake}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Retake
          </button>
        ) : live ? (
          <button
            type="button"
            onClick={take}
            className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-teal-900"
          >
            Take photo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-md bg-teal-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-teal-900"
          >
            Open camera
          </button>
        )}

        {live && (
          <button
            type="button"
            onClick={stop}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 sm:p-8">
          <div className="relative flex max-h-full w-full max-w-5xl flex-col rounded-2xl bg-slate-950 p-3 shadow-2xl sm:p-5">
            <button
              type="button"
              onClick={stop}
              aria-label="Close camera"
              className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-2 text-slate-600 shadow-sm hover:text-slate-950"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <p className="mb-3 pr-12 text-sm font-bold text-white">{label}</p>
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={`${label} camera preview`}
              className="max-h-[78vh] min-h-0 w-full rounded-lg object-contain"
            />
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={take}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-400"
              >
                Take photo
              </button>
              <button
                type="button"
                onClick={stop}
                className="rounded-md border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
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
