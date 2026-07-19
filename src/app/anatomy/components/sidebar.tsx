import type { AnimalId, SystemId } from '../types';
import { ANIMALS, BODY_SYSTEMS } from '../types';

interface SidebarProps {
  selectedAnimal: AnimalId;
  setSelectedAnimal: (id: AnimalId) => void;
  selectedSystem: SystemId;
  setSelectedSystem: (id: SystemId) => void;
}

export default function Sidebar({
  selectedAnimal,
  setSelectedAnimal,
  selectedSystem,
  setSelectedSystem,
}: SidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white px-5 py-5 flex flex-col gap-6 overflow-hidden">
      {/* Species Selection */}
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

      <div className="h-px bg-slate-100" />

      {/* Body System Selection */}
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
  );
}
