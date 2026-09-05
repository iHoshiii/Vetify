import { useId } from 'react';

import { guideShare, type Guide } from './capture-check';

type Props = {
  guide: Guide;
  // The frame's own width over its height, which is what the outline is sized against
  ratio: number;
  ready: boolean;
  hint: string;
  count: number;
  armed: boolean;
};

// Drawn in frame shares, the same ones the check reads, so the outline is what gets measured
export default function CaptureGuide({ guide, ratio, ready, hint, count, armed }: Props) {
  const maskId = useId();
  const share = guideShare(guide, ratio);
  const width = share.width * 100;
  const height = share.height * 100;
  const counting = ready && armed;

  const outline =
    guide === 'face' ? (
      <ellipse cx="50" cy="50" rx={width / 2} ry={height / 2} />
    ) : (
      <rect x={(100 - width) / 2} y={(100 - height) / 2} width={width} height={height} rx="3" />
    );

  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <g fill="black">{outline}</g>
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="#0a0c14"
          opacity="0.55"
          mask={`url(#${maskId})`}
        />
        <g
          fill="none"
          stroke={counting ? '#55B5C1' : '#ffffff'}
          strokeWidth={counting ? '3' : '2'}
          strokeDasharray={counting ? undefined : '4 3'}
          vectorEffect="non-scaling-stroke"
        >
          {outline}
        </g>
      </svg>

      {counting && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="text-7xl font-black text-white/80 [text-shadow:0_2px_12px_rgb(10_12_20_/_0.8)]">
            {count}
          </span>
        </div>
      )}

      <p
        role="status"
        className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white"
      >
        {hint}
      </p>
    </>
  );
}
