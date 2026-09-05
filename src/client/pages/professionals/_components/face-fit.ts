import type { Face, Point } from './face-detector';

// How much of the oval's height the head should fill. Below this it is too far away for
// the reviewer to match against the licence, above it the chin and crown are cut off.
const FAR = 0.55;
const NEAR = 0.95;
// Drift of the head's centre from the oval's, as a share of the oval's own half-extent
const DRIFT = 0.32;
// tan(12 degrees). Past this the head is visibly on its side.
const TILT = 0.21;
// The nose off the midpoint between the eyes, in eye spans, which is what turning does
const TURN = 0.22;
// A confident detection is a face pointed at the lens. A doubtful one usually is not.
const SURE = 0.6;

type Share = { width: number; height: number };

function ovalHolds(point: Point, oval: Share): boolean {
  const dx = (point.x - 0.5) / (oval.width / 2);
  const dy = (point.y - 0.5) / (oval.height / 2);
  return dx * dx + dy * dy <= 1;
}

// The head straight on, in the middle, at the right distance. One complaint at a time, in
// the order someone would fix them, so the hint does not change on every frame.
function misfit(face: Face, oval: Share): string | null {
  const fill = face.height / oval.height;
  if (fill < FAR) return 'Move a little closer.';
  if (fill > NEAR) return 'Move back a little.';

  const offX = Math.abs(face.centre.x - 0.5) / (oval.width / 2);
  const offY = Math.abs(face.centre.y - 0.5) / (oval.height / 2);
  const held = [face.leftEye, face.rightEye, face.nose].every((point) => ovalHolds(point, oval));
  if (offX > DRIFT || offY > DRIFT || !held) return 'Centre your face inside the oval.';

  // Both gaps are put in widths of the face box first, so the frame's shape drops out and
  // the angle between the eyes is the real one rather than a stretched one.
  const eyeX = (face.leftEye.x - face.rightEye.x) / face.width;
  const eyeY = (face.leftEye.y - face.rightEye.y) / face.height;
  const span = Math.hypot(eyeX, eyeY);
  if (!span) return 'Look straight at the camera.';
  if (Math.abs(eyeY) > Math.abs(eyeX) * TILT) return 'Hold your head straight.';

  const middle = (face.leftEye.x + face.rightEye.x) / 2;
  const off = Math.abs(face.nose.x - middle) / face.width / span;
  if (off > TURN || face.score < SURE) return 'Look straight at the camera.';

  return null;
}

// What is wrong with the frame for the face shot, or null when nothing is
export default function faceFit(faces: Face[], oval: Share): string | null {
  if (!faces.length) return 'Look at the camera. We cannot see your face yet.';
  if (faces.length > 1) return 'Only the applicant in the frame, please.';
  return misfit(faces[0], oval);
}
