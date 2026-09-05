// Pixel work shared by both guides. Nothing here knows what a face or a card is: it
// hands back numbers, and capture-check decides what they mean.

export type Luma = { data: Float32Array; width: number; height: number };
export type Box = { left: number; top: number; right: number; bottom: number };
export type Reading = { light: number; blown: number; dark: number; detail: number };

// Brightness only. Colour tells us nothing here and a third of the reads cost the same.
export function toLuma(pixels: ImageData): Luma {
  const data = new Float32Array(pixels.width * pixels.height);
  for (let at = 0; at < data.length; at += 1) {
    const rgba = at * 4;
    data[at] =
      (pixels.data[rgba] * 299 + pixels.data[rgba + 1] * 587 + pixels.data[rgba + 2] * 114) / 1000;
  }
  return { data, width: pixels.width, height: pixels.height };
}

// The guide as pixels of this frame, from its share of it
export function boxFor(share: { width: number; height: number }, luma: Luma): Box {
  const halfWidth = (luma.width * share.width) / 2;
  const halfHeight = (luma.height * share.height) / 2;
  return {
    left: Math.round(luma.width / 2 - halfWidth),
    right: Math.round(luma.width / 2 + halfWidth),
    top: Math.round(luma.height / 2 - halfHeight),
    bottom: Math.round(luma.height / 2 + halfHeight),
  };
}

function inside(box: Box, x: number, y: number, oval: boolean): boolean {
  if (!oval) return true;
  const dx = (2 * x - (box.left + box.right)) / (box.right - box.left);
  const dy = (2 * y - (box.top + box.bottom)) / (box.bottom - box.top);
  return dx * dx + dy * dy <= 1;
}

// A pixel this low holds nothing readable
const IN_SHADOW = 48;

// Light, glare, shadow and detail inside the guide. The room around it is not what gets filed,
// so a bright window behind the applicant cannot fail an otherwise good frame.
export function readInside(luma: Luma, box: Box, oval: boolean): Reading {
  let total = 0;
  let blown = 0;
  let dark = 0;
  let steps = 0;
  let edges = 0;
  let counted = 0;

  for (let y = Math.max(box.top, 0); y < Math.min(box.bottom, luma.height); y += 1) {
    let previous = -1;
    for (let x = Math.max(box.left, 0); x < Math.min(box.right, luma.width); x += 1) {
      if (!inside(box, x, y, oval)) {
        previous = -1;
        continue;
      }
      const value = luma.data[y * luma.width + x];
      total += value;
      counted += 1;
      if (value > 245) blown += 1;
      if (value < IN_SHADOW) dark += 1;
      if (previous >= 0) {
        edges += Math.abs(value - previous);
        steps += 1;
      }
      previous = value;
    }
  }

  if (!counted) return { light: 0, blown: 1, dark: 1, detail: 0 };
  return {
    light: total / counted,
    blown: blown / counted,
    dark: dark / counted,
    detail: steps ? edges / steps : 0,
  };
}

// One pixel, with the frame's own edge standing in for anything past it
export function at(luma: Luma, x: number, y: number): number {
  const cx = Math.min(Math.max(x, 0), luma.width - 1);
  const cy = Math.min(Math.max(y, 0), luma.height - 1);
  return luma.data[cy * luma.width + cx];
}
