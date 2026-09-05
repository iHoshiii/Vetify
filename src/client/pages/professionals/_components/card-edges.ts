import { at, type Box, type Luma } from './frame-reading';

// The card's edge may sit this far inside the guide, or a little outside it
const INWARD = 0.26;
const OUTWARD = 0.06;
// A card in a hand is never square to the frame, so each side is judged in pieces and each
// piece finds the edge at its own distance from the guide.
const PIECES = 6;
// Brightness step across the edge. Low, because a card can be close in tone to what is
// behind it, and the agreement between the pieces is what says it is really an edge.
const MIN_STEP = 8;
// How many of the pieces have to agree, and how far the edge may run off square across them
const COVER = 0.66;
const SLANT = 0.2;

type Side = 'left' | 'right' | 'top' | 'bottom';
type Run = { vertical: boolean; edge: number; inward: number; across: number; span: number };
type Found = { step: number; offset: number };

function runOf(box: Box, side: Side): Run {
  const vertical = side === 'left' || side === 'right';
  const edges: Record<Side, number> = {
    left: box.left,
    right: box.right,
    top: box.top,
    bottom: box.bottom,
  };
  return {
    vertical,
    edge: edges[side],
    inward: side === 'left' || side === 'top' ? 1 : -1,
    across: vertical ? box.right - box.left : box.bottom - box.top,
    span: vertical ? box.bottom - box.top : box.right - box.left,
  };
}

// Brightness inside the guide less brightness outside it, across one line of one piece of
// one side. Signed, so an edge keeps all of its contrast down the piece and noise cancels.
function pieceStep(luma: Luma, run: Run, box: Box, offset: number, piece: number): number {
  const line = run.edge + offset * run.inward;
  const start = (run.vertical ? box.top : box.left) + run.span * 0.1;
  const length = run.span * 0.8;
  const from = Math.round(start + (length * piece) / PIECES);
  const to = Math.round(start + (length * (piece + 1)) / PIECES);
  let total = 0;
  let counted = 0;

  for (let along = from; along < to; along += 2) {
    const x = run.vertical ? line : along;
    const y = run.vertical ? along : line;
    total += run.vertical
      ? at(luma, x + run.inward, y) - at(luma, x - run.inward, y)
      : at(luma, x, y + run.inward) - at(luma, x, y - run.inward);
    counted += 1;
  }

  return counted ? total / counted : 0;
}

// The best line this piece of the side could be sitting on
function bestOf(luma: Luma, run: Run, box: Box, piece: number): Found {
  let best: Found = { step: 0, offset: 0 };

  for (let offset = -Math.round(run.across * OUTWARD); offset <= run.across * INWARD; offset += 1) {
    const step = pieceStep(luma, run, box, offset, piece);
    if (Math.abs(step) > Math.abs(best.step)) best = { step, offset };
  }

  return best;
}

// 1 if this side has the card lighter on the inside, -1 if darker, 0 if it holds no edge at
// all. A side counts when most of its pieces found the same kind of step at close to the same
// distance, which a straight edge does at any small angle and a busy surface does not.
function sideSign(luma: Luma, box: Box, side: Side): number {
  const run = runOf(box, side);
  const found: Found[] = [];
  for (let piece = 0; piece < PIECES; piece += 1) found.push(bestOf(luma, run, box, piece));

  const strong = found.filter((one) => Math.abs(one.step) >= MIN_STEP);
  for (const sign of [1, -1]) {
    const agreed = strong.filter((one) => Math.sign(one.step) === sign).map((one) => one.offset);
    if (agreed.length < PIECES * COVER) continue;
    if (Math.max(...agreed) - Math.min(...agreed) <= run.span * SLANT) return sign;
  }

  return 0;
}

// How many of the four sides of the guide hold an edge of one single object. The signs have to
// agree: a card is lighter than its surround the whole way round, or darker the whole way
// round, where a room lands each side of the guide on something unrelated to the last.
export default function cardEdges(luma: Luma, box: Box): number {
  const sides: Side[] = ['left', 'right', 'top', 'bottom'];
  const signs = sides.map((side) => sideSign(luma, box, side));
  const lighter = signs.filter((sign) => sign > 0).length;
  const darker = signs.filter((sign) => sign < 0).length;
  return Math.max(lighter, darker);
}
