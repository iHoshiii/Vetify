'use client';

import Image from 'next/image';
import { useState } from 'react';
import bird from './data/bird';
import cat from './data/cat';
import dog from './data/dog';
import IMAGE_CONFIG from './data/image-config';
import type { AnatomySystem } from './types';
import { ANIMALS, BODY_SYSTEMS } from './types';

const HOTSPOTS: Record<string, Record<string, AnatomySystem[]>> = { dog, cat, bird };

export default function AnatomyPage() {
  const [selectedAnimal, setSelectedAnimal] = useState(ANIMALS[0].id);
  const [selectedSystem, setSelectedSystem] = useState(BODY_SYSTEMS[0].id);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.5));

  return (
    <main className="h-[calc(100vh-57px)] overflow-hidden flex flex-col bg-slate-50">
      {/* ══ HEADER ══════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm">
              <span className="text-sm">🦴</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                Interactive Anatomy
              </h1>
              <p className="text-[11px] text-slate-400">Explore pet biology</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/chat"
              className="text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors"
            >
              Ask AI Assistant
            </a>
            <div className="h-4 w-px bg-slate-200" />
            <a
              href="/services"
              className="text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors"
            >
              Back to Services
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ══ SIDEBAR ═════════════════════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white px-5 py-5 flex flex-col gap-6 overflow-hidden">
          {/* Species */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Species
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ANIMALS.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimal(animal.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border transition-all duration-200 ${
                    selectedAnimal === animal.id
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:bg-teal-50/50'
                  }`}
                >
                  <span className="text-2xl">{animal.icon}</span>
                  <span className="text-xs font-semibold">{animal.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Body Systems */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Body System
            </p>
            <div className="flex flex-col gap-1.5">
              {BODY_SYSTEMS.map((system) => (
                <button
                  key={system.id}
                  onClick={() => setSelectedSystem(system.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all duration-200 text-left ${
                    selectedSystem === system.id
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base transition-colors ${
                      selectedSystem === system.id ? 'bg-teal-100' : 'bg-slate-100'
                    }`}
                  >
                    {system.icon}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        selectedSystem === system.id ? 'text-teal-700' : 'text-slate-700'
                      }`}
                    >
                      {system.name}
                    </div>
                    <div className="text-[11px] text-slate-400">View structures</div>
                  </div>
                  {selectedSystem === system.id && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ VIEWER ══════════════════════════════════════════════════ */}
        <div className="flex-1 relative flex flex-col items-center justify-center bg-slate-50 overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* Soft glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[80px] pointer-events-none" />

          <div
            className="relative flex items-center justify-center transition-transform duration-500 ease-out w-[800px] h-[500px] flex-shrink-0"
            style={{ transform: `scale(${zoomLevel})` }}
          >
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
                );
              })()}
            </div>

            {/* Hotspots */}
            {HOTSPOTS[selectedAnimal]?.[selectedSystem]?.map((spot) => (
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

                {/* Tooltip */}
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

          {/* Zoom controls */}
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
      </div>
    </main>
  );
}
