import { useEffect, useRef, useState, type RefObject } from 'react';

import { inspect, type Guide } from './capture-check';
import { findFaces, loadFaceDetector, type Detector } from './face-detector';

// Five reads a second, so the countdown is honest about what the camera can still see
const EVERY = 200;
const COUNTDOWN_MS = 3000;
const SECONDS = COUNTDOWN_MS / 1000;
// Wide enough for the detector to find a face in, small enough to read this often
const SAMPLE_WIDTH = 224;
// Long enough to have honestly tried, short enough not to trap anyone the checks refuse.
// Shorter for the licence, because what it asks for is stricter and a desk lamp cannot always
// give it: better the shutter comes back than the applicant sits there waving a card about.
const STUCK_MS: Record<Guide, number> = { face: 30000, card: 12000 };
const WAITING = 'Getting the camera ready.';
const MANUAL = 'Line it up and press Take photo.';

type Options = {
  video: RefObject<HTMLVideoElement>;
  guide: Guide;
  active: boolean;
  onShoot: () => void;
};

export default function useAutoShot({ video, guide, active, onShoot }: Options) {
  const [hint, setHint] = useState(WAITING);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(SECONDS);
  const [armed, setArmed] = useState(false);
  const [stuck, setStuck] = useState(false);
  const shoot = useRef(onShoot);

  // Held in a ref so a fresh onShoot on every render cannot restart the sampling
  useEffect(() => {
    shoot.current = onShoot;
  }, [onShoot]);

  useEffect(() => {
    setReady(false);
    setCount(SECONDS);
    setHint(WAITING);
    setArmed(false);
    setStuck(false);
    if (!active) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    // No 2d context means no reading of the frame, so the shutter button is the way through
    if (!context) {
      setHint(MANUAL);
      return;
    }

    let live = true;
    const opened = performance.now();
    let detector: Detector | null = null;
    let since = 0;
    let fired = false;

    // Nothing fires without the detector: the licence shot has to know a face when it sees
    // one, and the face shot has nothing to measure without it.
    void loadFaceDetector().then((found) => {
      if (!live) return;
      detector = found;
      setArmed(Boolean(found));
      if (!found) setHint(MANUAL);
    });

    const timer = setInterval(() => {
      const element = video.current;
      if (!element?.videoWidth || !detector) return;

      // Nothing has fired in half a minute, so the shutter button comes back as the way out
      if (!fired && performance.now() - opened > STUCK_MS[guide]) setStuck(true);

      canvas.width = SAMPLE_WIDTH;
      canvas.height = Math.max(
        1,
        Math.round((SAMPLE_WIDTH * element.videoHeight) / element.videoWidth)
      );
      context.drawImage(element, 0, 0, canvas.width, canvas.height);

      // One frame answers both questions, so the hint cannot describe a face that the
      // pixels it was weighed against no longer hold.
      const faces = findFaces(detector, canvas);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const verdict = inspect({ pixels, faces }, guide);
      setHint(verdict.hint);
      setReady(verdict.ready);

      // The clock starts on the first frame that passes and is dropped by the first that
      // does not, so a head that moves away mid-count has to hold still again.
      if (!verdict.ready) {
        since = 0;
        setCount(SECONDS);
        return;
      }
      if (!since) since = performance.now();
      const elapsed = performance.now() - since;
      setCount(Math.max(1, Math.ceil((COUNTDOWN_MS - elapsed) / 1000)));
      if (elapsed >= COUNTDOWN_MS && !fired) {
        fired = true;
        shoot.current();
      }
    }, EVERY);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [active, guide, video]);

  return { hint, ready, count, armed, stuck };
}
