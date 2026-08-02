'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const VetMap = dynamic(() => import('@/components/VetMap'), { ssr: false });

interface MapPreviewProps {
  onExpand: () => void;
}

export default function MapPreview({ onExpand }: MapPreviewProps) {
  const [previewReady, setPreviewReady] = useState(false);

  return (
    <>
      <div
        onClick={onExpand}
        style={{ aspectRatio: '1 / 1' }}
        className="relative w-full cursor-pointer rounded-[2.5rem] overflow-hidden border border-blue-900/10 bg-white shadow-2xl shadow-blue-900/8 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.2)] hover:-translate-y-2 hover:border-blue-400/40 group"
      >
        {/* Decorative gradient frame */}
        <div className="absolute inset-0 z-30 rounded-[2.5rem] ring-1 ring-inset ring-white/20 pointer-events-none" />

        {/* Floating UI Elements */}
        <div
          className={`transition-opacity duration-700 ${
            previewReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Fake Floating UI Card 1 */}
          <div className="absolute top-8 left-8 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white flex items-center gap-3 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shadow-inner">
              🐕
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Happy Paws Clinic</p>
              <p className="text-[10px] font-semibold text-blue-600">
                ⭐️ 4.9 <span className="text-slate-400 font-normal">(120 reviews)</span>
              </p>
            </div>
          </div>

          {/* Fake Floating UI Card 2 */}
          <div className="absolute bottom-16 right-8 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white flex items-center gap-3 transition-transform duration-500 delay-75 group-hover:-translate-y-2 group-hover:scale-105">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xl shadow-inner">
              🏥
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">City Pet Hospital</p>
              <p className="text-[10px] font-semibold text-teal-600">
                Open now <span className="text-slate-400 font-normal">• 1.2 km away</span>
              </p>
            </div>
          </div>

          {/* Center "Click to Explore" Badge */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <div className="bg-blue-600/95 text-white px-5 py-3 rounded-full font-bold text-sm shadow-xl backdrop-blur-sm border border-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              Click to Explore Map
            </div>
          </div>
        </div>

        {/* Map Background */}
        <div
          className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-75"
          style={{ isolation: 'isolate', opacity: 0.6 }}
        >
          <VetMap
            zoom={15}
            center={[14.64, 121.05]}
            showOverlay={false}
            interactive={false}
            fetchData={false}
            onReady={() => setPreviewReady(true)}
          />
        </div>
      </div>

      {/* Caption below map */}
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-xs text-slate-400 font-medium">🐾 Vet clinics · Philippines</p>
        <button
          onClick={onExpand}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline underline-offset-4 transition-colors"
        >
          Open full map →
        </button>
      </div>
    </>
  );
}
