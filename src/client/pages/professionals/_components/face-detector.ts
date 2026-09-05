import type { Detection, FaceDetector } from '@mediapipe/tasks-vision';

// Both served off this origin: the runtime is copied into public/ by
// scripts/copy-mediapipe.mjs and the model is committed, so opening the camera does not
// call out to a CDN with the applicant's address on it.
const WASM_PATH = '/mediapipe/wasm';
const MODEL_PATH = '/mediapipe/blaze_face_short_range.tflite';

// BlazeFace returns its six keypoints in a fixed order. Three of them are enough to say
// which way a head is turned, so the ears and the mouth are left where they are.
const RIGHT_EYE = 0;
const LEFT_EYE = 1;
const NOSE = 2;

export type Point = { x: number; y: number };

// One face in shares of the frame it was found in, which is how the guides are measured
export type Face = {
  score: number;
  centre: Point;
  width: number;
  height: number;
  rightEye: Point;
  leftEye: Point;
  nose: Point;
};

export type Detector = FaceDetector;

let loading: Promise<Detector | null> | null = null;
let lastAt = 0;

// Null rather than a throw for every way this can fail — an old browser, a blocked
// fetch, no WebGL — because the caller's answer to all of them is the same: no automatic
// capture, use the shutter button.
export function loadFaceDetector(): Promise<Detector | null> {
  loading ??= (async () => {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
      return await vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: 'VIDEO',
        // Lower than the default. The card step refuses a frame with any face in it, and
        // a half-turned head it did not quite believe in is exactly the frame to refuse.
        minDetectionConfidence: 0.4,
      });
    } catch {
      return null;
    }
  })();

  return loading;
}

function toFace(detection: Detection, width: number, height: number): Face | null {
  const box = detection.boundingBox;
  const marks = detection.keypoints;
  if (!box || marks.length <= NOSE) return null;

  return {
    score: detection.categories[0]?.score ?? 0,
    centre: {
      x: (box.originX + box.width / 2) / width,
      y: (box.originY + box.height / 2) / height,
    },
    width: box.width / width,
    height: box.height / height,
    rightEye: marks[RIGHT_EYE],
    leftEye: marks[LEFT_EYE],
    nose: marks[NOSE],
  };
}

// Every face in the frame, largest first, so a bystander behind the applicant cannot be
// mistaken for the applicant.
export function findFaces(detector: Detector, frame: HTMLCanvasElement): Face[] {
  // The graph refuses a timestamp it has already seen, and two samples can land inside
  // the same millisecond on a fast machine.
  const at = Math.max(performance.now(), lastAt + 1);
  lastAt = at;

  try {
    const result = detector.detectForVideo(frame, at);
    return result.detections
      .flatMap((detection) => toFace(detection, frame.width, frame.height) ?? [])
      .sort((a, b) => b.height - a.height);
  } catch {
    return [];
  }
}
