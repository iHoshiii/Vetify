'use client';

import { useState } from 'react';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import View from './components/View';

import bird from './data/bird';
import cat from './data/cat';
import dog from './data/dog';

// 1. Import AnimalId and SystemId alongside your other setups
import type { AnatomySystem, AnimalId, SystemId } from './types';
import { ANIMALS, BODY_SYSTEMS } from './types';

// 2. Type your config map cleanly using the strict IDs
const HOTSPOTS: Record<AnimalId, Record<SystemId, AnatomySystem[]>> = { dog, cat, bird };

export default function AnatomyPage() {
  // 3. Explicitly tell useState to accept any valid ID from the union, not just the first one
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalId>(ANIMALS[0].id);
  const [selectedSystem, setSelectedSystem] = useState<SystemId>(BODY_SYSTEMS[0].id);

  // Deriving the active data object maps directly inside the render stack
  // keeps us clear of asynchronous synchronizing errors.
  const dynamicHotspots = HOTSPOTS[selectedAnimal][selectedSystem];

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
