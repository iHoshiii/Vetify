import { PROFESSIONAL_PHOTO_MAX_EDGE, PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import { base64ByteLength } from '@shared/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';

// One photograph, in the shape the application schema expects it
export type Capture = { data: string; mimeType: 'image/jpeg'; capturedAt: string };

// Tried in order until the encoding fits: a licence number has to stay readable, so the
// first pass is generous and the fallbacks only matter on a camera that hands back plenty.
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

// The frame scaled so its longest edge is at most the shared ceiling
function fittedSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= PROFESSIONAL_PHOTO_MAX_EDGE) return { width, height };
  const scale = PROFESSIONAL_PHOTO_MAX_EDGE / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Base64 JPEG without the data: prefix the schema refuses, or null when even the lowest
// quality is over the limit, which is a camera we cannot use rather than a refused upload.
function encode(canvas: HTMLCanvasElement): string | null {
  for (const quality of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', quality);
    const data = url.slice(url.indexOf(',') + 1);
    if (base64ByteLength(data) <= PROFESSIONAL_PHOTO_MAX_BYTES) return data;
  }
  return null;
}

type Options = { facing: 'user' | 'environment'; onCapture: (capture: Capture | null) => void };

export default function useCamera({ facing, onCapture }: Options) {
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

  // Nothing else unmounts the camera: a route change while the preview is open would
  // otherwise leave the device held until the tab closed.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
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
      // Denied, in use by something else, or no camera at all. One sentence for all three,
      // because the fix is the same: let this page use the camera.
      setMessage('We could not open the camera. Allow camera access and try again.');
      stop();
    }
  }, [facing, stop]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  const take = useCallback(() => {
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
    onCapture({ data, mimeType: 'image/jpeg', capturedAt: new Date().toISOString() });
    stop();
  }, [onCapture, stop]);

  const retake = useCallback(() => {
    setPreview(null);
    onCapture(null);
    void start();
  }, [onCapture, start]);

  return { videoRef, live, cameraOpen, message, preview, start, stop, take, retake };
}
