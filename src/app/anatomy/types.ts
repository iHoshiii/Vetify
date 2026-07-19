export type AnatomySystem = {
  id: string;
  x: number;
  y: number;
  title: string;
  desc: string;
};

export type Animal = {
  id: string;
  name: string;
  icon: string;
};

export type BodySystem = {
  id: string;
  name: string;
  icon: string;
};

export type Hotspot = {
  id: string;
  x: number;
  y: number;
  title: string;
  desc: string;
};

// 1. Added 'readonly' here so it matches the 'as const' configuration in your data arrays
export type SpotDetails = readonly [
  AnatomySystem['id'],
  AnatomySystem['x'],
  AnatomySystem['y'],
  AnatomySystem['title'],
  AnatomySystem['desc']
];

export type AnimalId = (typeof ANIMALS)[number]['id']; // 'dog' | 'cat' | 'bird'
export type SystemId = (typeof BODY_SYSTEMS)[number]['id']; // 'skeletal' | 'muscular' | etc.

export const ANIMALS = [
  { id: 'dog', name: 'Dog', icon: '🐕' },
  { id: 'cat', name: 'Cat', icon: '🐈' },
  { id: 'bird', name: 'Bird', icon: '🦜' },
] as const; // <-- 'as const' turns string IDs into literal types

export const BODY_SYSTEMS = [
  { id: 'skeletal', name: 'Skeletal System', icon: '🦴' },
  { id: 'muscular', name: 'Muscular System', icon: '💪' },
  { id: 'digestive', name: 'Digestive System', icon: '🥩' },
  { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️' },
  { id: 'nervous', name: 'Nervous System', icon: '🧠' },
] as const;
