'use client';

import { useState } from 'react';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import View from './components/View';

import bird from './data/bird';
import cat from './data/cat';
import dog from './data/dog';

import type { AnatomySystem } from './types';
import { ANIMALS, BODY_SYSTEMS } from './types';

const HOTSPOTS: Record<string, Record<string, AnatomySystem[]>> = { dog, cat, bird };

export default function AnatomyPage() {
  const [selectedAnimal, setSelectedAnimal] = useState(ANIMALS[0].id);
  const [selectedSystem, setSelectedSystem] = useState(BODY_SYSTEMS[0].id);

  // Deriving the active data object maps directly inside the render stack
  // keeps us clear of asynchronous synchronizing errors.
  const dynamicHotspots = HOTSPOTS[selectedAnimal]?.[selectedSystem] || [];

  return (
    <main className="h-[calc(100vh-57px)] overflow-hidden flex flex-col bg-slate-50">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          selectedAnimal={selectedAnimal}
          setSelectedAnimal={setSelectedAnimal}
          selectedSystem={selectedSystem}
          setSelectedSystem={setSelectedSystem}
        />

        <View
          selectedAnimal={selectedAnimal}
          selectedSystem={selectedSystem}
          hotspots={dynamicHotspots}
        />
      </div>
    </main>
  );
}
