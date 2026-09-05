import type { Face } from './face-detector';

// A head held up to the lens fills this much of the frame
const LIVE = 0.35;
// Average step between neighbouring pixels inside the box, which is the print
const PRINT = 6;
// A card lit well enough to read has almost none of the box in shadow. A room has plenty,
// and that is what was getting through: four straight edges found in the clutter of it.
const SHADOW_SHARE = 0.12;

type Evidence = { edges: number; detail: number; dark: number };

// What is wrong with the frame for a licence shot, or null when nothing is. The face only
// decides the wording, and only once nothing card-shaped has been found: a laptop has one
// camera, so the applicant is in shot behind the card either way.
export default function cardFit(faces: Face[], seen: Evidence): string | null {
  if (seen.edges < 3) {
    return faces.some((face) => face.height >= LIVE)
      ? 'That is a face. Point the camera at the licence instead.'
      : 'Move the licence closer, all four edges inside the box.';
  }
  if (seen.edges < 4) return 'Show all four edges of the licence, with nothing over them.';
  if (seen.dark > SHADOW_SHARE) return 'The box is not all licence. Fill it in one even light.';
  if (seen.detail < PRINT) return 'Hold steady so the print comes out sharp.';
  return null;
}
