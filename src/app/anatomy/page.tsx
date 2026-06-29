'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/ScrollReveal';

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

export default function AnatomyPage() {
  const [selectedAnimal, setSelectedAnimal] = useState(ANIMALS[0].id);
  const [selectedSystem, setSelectedSystem] = useState(BODY_SYSTEMS[0].id);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.5));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30">
      {/* ══ HEADER ════════════════════════════════════════════════════ */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
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

      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* ══ SIDEBAR CONTROLS ════════════════════════════════════════ */}
        <aside className="w-full lg:w-80 flex-shrink-0 border-r border-white/10 bg-slate-900/30 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          {/* Animal Selection */}
          <ScrollReveal variant="fade">
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
          </ScrollReveal>

          {/* Body System Selection */}
          <ScrollReveal variant="fade" delay={100}>
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
          </ScrollReveal>

          {/* Info Card */}
          <ScrollReveal variant="fade" delay={200} className="mt-auto">
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
          </ScrollReveal>
        </aside>

        {/* ══ MAIN VIEWER AREA ════════════════════════════════════════ */}
        <div className="flex-1 relative flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20 overflow-hidden">
          {/* Mock Viewer Toolbar */}
          <div className="absolute top-6 right-6 z-10 flex gap-2">
            <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-1 backdrop-blur-md">
              <button
                onClick={handleZoomOut}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                  />
                </svg>
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button
                onClick={handleZoomIn}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Zoom In"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                  />
                </svg>
              </button>
            </div>
            <button
              className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 p-3 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
              title="Reset View"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Model Display Placeholder */}
          <div
            className="relative flex items-center justify-center transition-transform duration-500 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Glowing orb effect behind model */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10 text-center animate-pulse-slow">
              {/* This would be a WebGL/Three.js canvas in reality */}
              <div className="text-[150px] leading-none mb-8 opacity-90 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none pointer-events-none">
                {ANIMALS.find((a) => a.id === selectedAnimal)?.icon}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                <span className="text-sm font-semibold text-indigo-300">
                  {ANIMALS.find((a) => a.id === selectedAnimal)?.name} •{' '}
                  {BODY_SYSTEMS.find((s) => s.id === selectedSystem)?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions Overlay */}
          <div className="absolute bottom-8 text-center text-slate-500 text-sm max-w-md pointer-events-none">
            <p>Drag to rotate • Scroll to zoom • Click structures for detailed information</p>
          </div>
        </div>
      </div>
    </main>
  );
}
