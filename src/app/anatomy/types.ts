export type AnatomySystem = {
  id: string;
  x: number;
  y: number;
  title: string;
  desc: string;
};

export interface Animal {
  id: string;
  name: string;
  icon: string;
}

export interface BodySystem {
  id: string;
  name: string;
  icon: string;
}

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  title: string;
  desc: string;
}

export const ANIMALS: Animal[] = [
  { id: 'dog', name: 'Dog', icon: '🐕' },
  { id: 'cat', name: 'Cat', icon: '🐈' },
  { id: 'bird', name: 'Bird', icon: '🦜' },
];

export const BODY_SYSTEMS: BodySystem[] = [
  { id: 'skeletal', name: 'Skeletal System', icon: '🦴' },
  { id: 'muscular', name: 'Muscular System', icon: '💪' },
  { id: 'digestive', name: 'Digestive System', icon: '🥩' },
  { id: 'cardiovascular', name: 'Cardiovascular', icon: '❤️' },
  { id: 'nervous', name: 'Nervous System', icon: '🧠' },
];
