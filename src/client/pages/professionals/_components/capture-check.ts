import cardEdges from './card-edges';
import cardFit from './card-fit';
import type { Face } from './face-detector';
import faceFit from './face-fit';
import { boxFor, readInside, toLuma } from './frame-reading';

export type Guide = 'face' | 'card';

// What the outline should look like on screen: a head, and an ID-1 card
const ASPECT: Record<Guide, number> = { face: 0.74, card: 1.585 };
// The most of the frame each one may take, as a share of it
const ROOM: Record<Guide, { width: number; height: number }> = {
  face: { width: 0.62, height: 0.62 },
  card: { width: 0.82, height: 0.78 },
};

// Light the camera can work with
const TOO_DARK = 60;
const TOO_BRIGHT = 208;
// Glare over a face is a bad photograph, glare over a licence is an unreadable one
const BLOWN_SHARE: Record<Guide, number> = { face: 0.15, card: 0.03 };

// The largest outline of the right shape that fits the room allowed, in shares of a frame
// this wide against its height. A 4:3 laptop and a portrait phone hand back different
// shares for the same oval, which is the point: on screen it is a head either way.
export function guideShare(guide: Guide, ratio: number): { width: number; height: number } {
  const aspect = ASPECT[guide];
  const room = ROOM[guide];
  const height = Math.min(room.height, (room.width * ratio) / aspect);
  return { width: (height * aspect) / ratio, height };
}

export type Frame = { pixels: ImageData; faces: Face[] };
export type Check = { ready: boolean; hint: string };

// Lighting first, because nothing else can be trusted in the dark, then the fit. One
// complaint is returned at a time so the applicant is told the single thing to change.
export function inspect(frame: Frame, guide: Guide): Check {
  const luma = toLuma(frame.pixels);
  const share = guideShare(guide, luma.width / luma.height);
  const box = boxFor(share, luma);
  const reading = readInside(luma, box, guide === 'face');

  if (reading.light < TOO_DARK) return { ready: false, hint: 'Too dark. Find better light.' };
  if (reading.light > TOO_BRIGHT || reading.blown > BLOWN_SHARE[guide]) {
    return { ready: false, hint: 'Too bright. Turn away from the light.' };
  }

  const fit =
    guide === 'face'
      ? faceFit(frame.faces, share)
      : cardFit(frame.faces, { edges: cardEdges(luma, box), ...reading });

  return fit ? { ready: false, hint: fit } : { ready: true, hint: 'Hold still.' };
}
