import { describe, expect, it } from 'vitest';

import { guideShare, inspect } from '../pages/professionals/_components/capture-check';
import type { Face } from '../pages/professionals/_components/face-detector';

// The applicant never sees why a frame was refused beyond one line of hint, and a
// threshold that drifts either takes an unusable photograph or refuses a good one for
// ever. Both are silent, so the numbers are pinned here instead.

const WIDE = 224;
const TALL = 168;

// Every byte set to the one level, so red, green and blue all read it and the luma is it
function flat(level: number): ImageData {
  const data = new Uint8ClampedArray(WIDE * TALL * 4).fill(level);
  return { width: WIDE, height: TALL, data, colorSpace: 'srgb' } as ImageData;
}

// Squarely inside the oval at arm's length, looking at the lens
const GOOD: Face = {
  score: 0.9,
  centre: { x: 0.5, y: 0.5 },
  width: 0.348,
  height: 0.465,
  rightEye: { x: 0.422, y: 0.44 },
  leftEye: { x: 0.578, y: 0.44 },
  nose: { x: 0.5, y: 0.52 },
};

const faceOf = (patch: Partial<Face> = {}): Face => ({ ...GOOD, ...patch });

describe('guideShare', () => {
  it('draws a head-shaped oval whichever way round the camera is', () => {
    const wide = guideShare('face', 4 / 3);
    const tall = guideShare('face', 3 / 4);
    expect((wide.width * 4) / (wide.height * 3)).toBeCloseTo(0.74, 2);
    expect((tall.width * 3) / (tall.height * 4)).toBeCloseTo(0.74, 2);
  });

  it('keeps the card box to card shape and inside the frame', () => {
    for (const ratio of [4 / 3, 3 / 4, 16 / 9]) {
      const box = guideShare('card', ratio);
      expect((box.width * ratio) / box.height).toBeCloseTo(1.585, 2);
      expect(box.width).toBeLessThanOrEqual(0.82);
      expect(box.height).toBeLessThanOrEqual(0.78);
    }
  });
});

describe('inspect, face', () => {
  it('takes the shot when the head is in the oval and looking at the lens', () => {
    expect(inspect({ pixels: flat(130), faces: [faceOf()] }, 'face')).toEqual({
      ready: true,
      hint: 'Hold still.',
    });
  });

  const REFUSED: Array<[string, Face[], string]> = [
    ['nobody in the frame', [], 'Look at the camera. We cannot see your face yet.'],
    ['a second person behind', [faceOf(), faceOf()], 'Only the applicant in the frame, please.'],
    ['standing too far back', [faceOf({ height: 0.3 })], 'Move a little closer.'],
    ['held too close', [faceOf({ height: 0.62 })], 'Move back a little.'],
    [
      'off to one side',
      [faceOf({ centre: { x: 0.62, y: 0.5 } })],
      'Centre your face inside the oval.',
    ],
    ['head on its side', [faceOf({ leftEye: { x: 0.578, y: 0.49 } })], 'Hold your head straight.'],
    ['turned away', [faceOf({ nose: { x: 0.545, y: 0.52 } })], 'Look straight at the camera.'],
    ['a doubtful detection', [faceOf({ score: 0.4 })], 'Look straight at the camera.'],
  ];

  for (const [name, faces, hint] of REFUSED) {
    it(`waits with ${name}`, () => {
      expect(inspect({ pixels: flat(130), faces }, 'face')).toEqual({ ready: false, hint });
    });
  }

  it('asks for light before anything else', () => {
    expect(inspect({ pixels: flat(30), faces: [] }, 'face').hint).toBe(
      'Too dark. Find better light.'
    );
    expect(inspect({ pixels: flat(250), faces: [] }, 'face').hint).toBe(
      'Too bright. Turn away from the light.'
    );
  });
});
