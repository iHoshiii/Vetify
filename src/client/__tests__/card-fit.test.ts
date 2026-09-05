import { describe, expect, it } from 'vitest';

import { guideShare, inspect } from '../pages/professionals/_components/capture-check';
import type { Face } from '../pages/professionals/_components/face-detector';

// The licence shot has to fire for a card held at a distance a camera can focus at, and
// never for a frame with only a person in it. Both halves are pinned here because the only
// thing the applicant is told is one line of hint.

const WIDE = 224;
const TALL = 168;

function frameOf(paint: (x: number, y: number) => number): ImageData {
  const data = new Uint8ClampedArray(WIDE * TALL * 4);
  for (let y = 0; y < TALL; y += 1) {
    for (let x = 0; x < WIDE; x += 1) {
      const at = (y * WIDE + x) * 4;
      data[at] = paint(x, y);
      data[at + 1] = data[at];
      data[at + 2] = data[at];
      data[at + 3] = 255;
    }
  }
  return { width: WIDE, height: TALL, data, colorSpace: 'srgb' } as ImageData;
}

const flat = (level: number) => frameOf(() => level);

// A busy surface with nothing straight in it, from a fixed sequence so the case cannot flake
function noisy(): ImageData {
  let seed = 7;
  return frameOf(() => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return 100 + (seed % 61);
  });
}

// A licence in the guide, its edges the given share of the box inside the drawn line
function cardFrame(printed: boolean, inset = 0, around = 60): ImageData {
  const share = guideShare('card', WIDE / TALL);
  const wide = WIDE * share.width;
  const tall = TALL * share.height;
  const left = (WIDE - wide) / 2 + wide * inset;
  const top = (TALL - tall) / 2 + tall * inset;
  return frameOf((x, y) => {
    const held = x >= left && x <= WIDE - left && y >= top && y <= TALL - top;
    if (!held) return around;
    return printed && x % 2 === 0 ? 165 : 190;
  });
}

// The room the first applicants pointed it at: a dark beam overhead, a window burning out
// one side of it, the applicant themselves in shadow, and clutter everywhere. Straight lines
// all over, so four edges can be found in it by luck, which is how it got taken as a licence.
function room(window: boolean): ImageData {
  return frameOf((x, y) => {
    if (y < TALL * 0.2) return 24;
    if (window && x > WIDE * 0.78) return 252;
    if (x > WIDE * 0.62) return 150;
    if (y > TALL * 0.5 && x > WIDE * 0.25 && x < WIDE * 0.62) return 34;
    return 96 + ((x * 7 + y * 13) % 40);
  });
}

// The applicant's own face, in shot because a laptop only has the one camera
const BEHIND: Face = {
  score: 0.9,
  centre: { x: 0.5, y: 0.5 },
  width: 0.348,
  height: 0.465,
  rightEye: { x: 0.422, y: 0.44 },
  leftEye: { x: 0.578, y: 0.44 },
  nose: { x: 0.5, y: 0.52 },
};

describe('inspect, card', () => {
  it('takes the shot when the whole card is in the box and the print is sharp', () => {
    expect(inspect({ pixels: cardFrame(true), faces: [] }, 'card')).toEqual({
      ready: true,
      hint: 'Hold still.',
    });
  });

  it('takes the shot with the card held a little inside the box', () => {
    expect(inspect({ pixels: cardFrame(true, 0.12), faces: [] }, 'card').ready).toBe(true);
  });

  it('takes the shot with the applicant in the frame behind the card', () => {
    expect(inspect({ pixels: cardFrame(true), faces: [BEHIND] }, 'card').ready).toBe(true);
  });

  it('allows the portrait printed on the card itself', () => {
    const portrait = { ...BEHIND, height: 0.12, centre: { x: 0.3, y: 0.5 } };
    expect(inspect({ pixels: cardFrame(true), faces: [portrait] }, 'card').ready).toBe(true);
  });

  it('waits while the card is too far from the lens to fill the box', () => {
    expect(inspect({ pixels: cardFrame(true, 0.4), faces: [] }, 'card')).toEqual({
      ready: false,
      hint: 'Move the licence closer, all four edges inside the box.',
    });
  });

  it('holds off on a busy surface with no card edge in it', () => {
    expect(inspect({ pixels: noisy(), faces: [] }, 'card').ready).toBe(false);
  });

  it('says so when the camera is pointed at a person instead', () => {
    expect(inspect({ pixels: flat(130), faces: [BEHIND] }, 'card').hint).toBe(
      'That is a face. Point the camera at the licence instead.'
    );
  });

  it('waits for the print to come out of the blur', () => {
    expect(inspect({ pixels: cardFrame(false), faces: [] }, 'card').hint).toBe(
      'Hold steady so the print comes out sharp.'
    );
  });

  it('holds off while the box holds more than the licence', () => {
    expect(inspect({ pixels: cardFrame(true, 0.12, 20), faces: [] }, 'card').hint).toBe(
      'The box is not all licence. Fill it in one even light.'
    );
  });

  it('refuses a room shot into the light, however much straight edge is in it', () => {
    expect(inspect({ pixels: room(true), faces: [BEHIND] }, 'card')).toEqual({
      ready: false,
      hint: 'Too bright. Turn away from the light.',
    });
  });

  it('refuses a dim room with the applicant in shadow in it', () => {
    expect(inspect({ pixels: room(false), faces: [BEHIND] }, 'card').ready).toBe(false);
  });

  it('asks for light before anything else', () => {
    expect(inspect({ pixels: flat(30), faces: [] }, 'card').hint).toBe(
      'Too dark. Find better light.'
    );
  });
});
