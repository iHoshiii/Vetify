import Image from 'next/image';
import { useState } from 'react';
import IMAGE_CONFIG from '../data/image-config';
import { ANIMALS, type AnatomySystem } from '../types';

type ViewerProps = {
  selectedAnimal: string;
  selectedSystem: string;
  hotspots: AnatomySystem[];
};

export default function View({ selectedAnimal, selectedSystem, hotspots }: ViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.5));

  const animal = ANIMALS.find((a) => a.id === selectedAnimal);
  const imgCfg = IMAGE_CONFIG[selectedAnimal]?.[selectedSystem];

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[80px] pointer-events-none" />

      <div
        className="relative flex items-center justify-center transition-transform duration-500 ease-out w-[800px] h-[500px] flex-shrink-0"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {/* System Asset Frame */}
        <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none">
          {imgCfg ? (
            <Image
              key={`${selectedAnimal}-${selectedSystem}`}
              src={imgCfg.src}
              alt={`${selectedAnimal} ${selectedSystem}`}
              width={imgCfg.width}
              height={imgCfg.height}
              className="object-contain drop-shadow-md transition-transform duration-300"
              style={{
                width: imgCfg.width,
                height: imgCfg.height,
                transform: `scale(${imgCfg.scale})`,
              }}
              unoptimized
            />
          ) : (
            <div className="text-[160px] leading-none select-none drop-shadow-sm">
              {animal?.icon}
            </div>
          )}
        </div>

        {/* Dynamic Mapping Nodes */}
        {hotspots.map((spot) => (
          <div
            key={spot.id}
            className={`absolute z-20 group ${hoveredSpot === spot.id ? 'z-50' : ''}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            onMouseEnter={() => setHoveredSpot(spot.id)}
            onMouseLeave={() => setHoveredSpot(null)}
            onClick={() => setHoveredSpot(hoveredSpot === spot.id ? null : spot.id)}
          >
            <div className="relative flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center">
              <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-teal-400 opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(13,148,136,0.6)] border-2 border-white transition-transform duration-200 group-hover:scale-125" />
            </div>

            {/* Tooltip Popup */}
            <div
              className={`absolute left-1/2 bottom-full mb-3 w-56 -translate-x-1/2 pointer-events-none transition-all duration-200 origin-bottom ${
                hoveredSpot === spot.id
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-95 translate-y-1'
              }`}
            >
              <div className="relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg">
                <h4 className="text-xs font-bold text-teal-700">{spot.title}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{spot.desc}</p>
                <div className="absolute left-1/2 top-full -mt-px h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scale Interface Handles */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-teal-400 hover:text-teal-600 transition-colors text-lg font-light"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-teal-400 hover:text-teal-600 transition-colors text-lg font-light"
        >
          −
        </button>
      </div>
    </div>
  );
}
