'use client';

import { useState } from 'react';

import Image from 'next/image';

import dog from './data/dog';
import cat from './data/cat';
import bird from './data/bird';
import IMAGE_CONFIG from './data/image-config';

const ANIMALS = [
  { id: 'dog', name: 'Dog', icon: '🐕' },
  { id: 'cat', name: 'Cat', icon: '🐈' },
  { id: 'bird', name: 'Bird', icon: '🦜' },
];

const BODY_SYSTEMS = [
  { id: 'skeletal', name: 'Skeletal System', icon: '🦴' },
  { id: 'muscular', name: 'Muscular System', icon: '💪' },
  { id: 'digestive', name: 'Digestive System', icon: '🥩' },
  { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️' },
  { id: 'nervous', name: 'Nervous System', icon: '🧠' },
];

const HOTSPOTS: Record<
  string,
  Record<string, { id: string; x: number; y: number; title: string; desc: string }[]>
> = { dog, cat, bird };

export default function AnatomyPage() {
  const [selectedAnimal, setSelectedAnimal] = useState(ANIMALS[0].id);
  const [selectedSystem, setSelectedSystem] = useState(BODY_SYSTEMS[0].id);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.5));

  return (
    <main className="h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-50 selection:bg-teal-500/30">
      {/* ══ HEADER ════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/20">
              <span className="text-xl">🦴</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Interactive Anatomy</h1>
              <p className="text-xs font-medium text-slate-400">Explore pet biology in 3D</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/chat"
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Ask AI Assistant
            </a>
            <div className="h-4 w-px bg-white/10" />
            <a
              href="/services"
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Back to Services
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto flex max-w-[1600px] flex-col lg:flex-row overflow-hidden">
        {/* ══ SIDEBAR CONTROLS ════════════════════════════════════════ */}
        <aside className="w-full lg:w-80 flex-shrink-0 border-r border-white/10 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar h-full">
          {/* Animal Selection */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Select Species
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {ANIMALS.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => setSelectedAnimal(animal.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all duration-300 ${
                      selectedAnimal === animal.id
                        ? 'bg-indigo-500/10 border-indigo-500/50 border text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                        : 'bg-white/5 border border-transparent hover:bg-white/10 text-slate-400'
                    }`}
                  >
                    <span className="text-2xl">{animal.icon}</span>
                    <span className="text-xs font-bold">{animal.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body System Selection */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100 fill-mode-both">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Body System
              </h2>
              <div className="flex flex-col gap-2">
                {BODY_SYSTEMS.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => setSelectedSystem(system.id)}
                    className={`flex items-center gap-4 rounded-xl p-3 transition-all duration-300 text-left ${
                      selectedSystem === system.id
                        ? 'bg-indigo-500/10 border-indigo-500/50 border shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selectedSystem === system.id
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-black/20 text-slate-400'
                      }`}
                    >
                      <span className="text-lg">{system.icon}</span>
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          selectedSystem === system.id ? 'text-indigo-400' : 'text-slate-200'
                        }`}
                      >
                        {system.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">View internal structures</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-auto animate-in fade-in slide-in-from-left-4 duration-500 delay-200 fill-mode-both">
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-teal-400 mb-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Did you know?
              </h3>
              <p className="text-xs leading-relaxed text-teal-100/70">
                Understanding your pet's anatomy helps identify abnormalities earlier. If you notice
                unusual swelling or discomfort, consult a professional immediately.
              </p>
            </div>
          </div>
        </aside>

        {/* ══ MAIN VIEWER AREA ════════════════════════════════════════ */}
        <div className="flex-1 relative flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
          <div
            className="relative flex items-center justify-center transition-transform duration-500 ease-out w-[800px] h-[500px] flex-shrink-0"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Glowing orb effect behind model */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

            {/* System Image */}
            <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none">
              {(() => {
                const animal = ANIMALS.find((a) => a.id === selectedAnimal);
                const imgCfg = IMAGE_CONFIG[selectedAnimal]?.[selectedSystem];
                return imgCfg ? (
                  <Image
                    key={`${selectedAnimal}-${selectedSystem}`}
                    src={imgCfg.src}
                    alt={`${selectedAnimal} ${selectedSystem}`}
                    width={imgCfg.width}
                    height={imgCfg.height}
                    className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] opacity-90 mix-blend-screen transition-transform duration-300"
                    style={{
                      width: imgCfg.width,
                      height: imgCfg.height,
                      transform: `scale(${imgCfg.scale})`,
                    }}
                    unoptimized
                  />
                ) : (
                  <div className="text-[180px] leading-none opacity-80 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">
                    {animal?.icon}
                  </div>
                );
              })()}
            </div>

            {/* Interactive Hotspots */}
            {HOTSPOTS[selectedAnimal]?.[selectedSystem]?.map((spot) => (
              <div
                key={spot.id}
                className={`absolute z-20 group ${hoveredSpot === spot.id ? 'z-50' : ''}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                onMouseEnter={() => setHoveredSpot(spot.id)}
                onMouseLeave={() => setHoveredSpot(null)}
                onClick={() => setHoveredSpot(hoveredSpot === spot.id ? null : spot.id)}
              >
                {/* Hotspot Dot */}
                <div className="relative flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center">
                  <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-teal-400 opacity-60 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-teal-500 shadow-[0_0_15px_rgba(45,212,191,0.9)] transition-transform duration-200 group-hover:scale-125 border-2 border-white/20"></span>
                </div>

                {/* Tooltip Bubble */}
                <div
                  className={`absolute left-1/2 bottom-full mb-3 w-64 -translate-x-1/2 pointer-events-none transition-all duration-300 origin-bottom ${
                    hoveredSpot === spot.id
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 translate-y-2'
                  }`}
                >
                  <div className="relative rounded-xl border border-white/10 bg-slate-800/95 p-4 shadow-2xl backdrop-blur-xl">
                    <h4 className="text-sm font-bold text-teal-400">{spot.title}</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{spot.desc}</p>

                    {/* Tooltip arrow/triangle */}
                    <div className="absolute left-1/2 top-full -mt-px h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-slate-800/95" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions Overlay */}
        </div>
      </div>
    </main>
  );
}
