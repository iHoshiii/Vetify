import { useEffect, useRef } from 'react';

type VideoTileProps = {
  stream: MediaStream | null;
  // The local preview is muted so a room does not echo itself, and mirrored to feel like a mirror.
  muted?: boolean;
  mirror?: boolean;
  label: string;
  placeholder: string;
};

// One <video> bound to a MediaStream via a ref, since srcObject is not a settable attribute.
export default function VideoTile({ stream, muted, mirror, label, placeholder }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${mirror ? '-scale-x-100' : ''}`}
        />
      ) : (
        <p className="px-4 text-center text-sm text-slate-400">{placeholder}</p>
      )}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
        {label}
      </span>
    </div>
  );
}
