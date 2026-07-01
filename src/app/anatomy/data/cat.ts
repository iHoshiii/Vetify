import type { AnatomySystem } from './types';

const cat: Record<string, AnatomySystem[]> = {
  skeletal: [
    {
      id: 'skull',
      x: 28,
      y: 48,
      title: 'Skull',
      desc: 'Features large eye sockets for enhanced night vision.',
    },
    {
      id: 'spine',
      x: 55,
      y: 28,
      title: 'Flexible Spine',
      desc: 'Highly flexible, allowing cats to land on their feet.',
    },
    {
      id: 'clavicle',
      x: 45,
      y: 58,
      title: 'Vestigial Clavicle',
      desc: 'A small floating collarbone that allows cats to squeeze through tight spaces.',
    },
    {
      id: 'pelvis',
      x: 67,
      y: 45,
      title: 'Pelvis',
      desc: 'Connects the spine to the powerful hind legs.',
    },
    {
      id: 'femur',
      x: 68,
      y: 51,
      title: 'Femur',
      desc: 'Long hind leg bone enabling powerful leaps.',
    },
  ],
  muscular: [
    {
      id: 'masseter',
      x: 29,
      y: 39,
      title: 'Masseter Muscle',
      desc: 'Strong jaw muscle for gripping and killing prey.',
    },
    {
      id: 'trapezius',
      x: 44,
      y: 42,
      title: 'Trapezius',
      desc: 'Stabilizes the shoulder blades during pouncing.',
    },
    {
      id: 'gluteal',
      x: 73,
      y: 38,
      title: 'Gluteal Muscles',
      desc: 'Power the explosive jumping ability of cats.',
    },
    {
      id: 'gastrocnemius',
      x: 76,
      y: 62,
      title: 'Gastrocnemius',
      desc: 'Calf muscle enabling silent, precise landings.',
    },
  ],
  digestive: [
    {
      id: 'esophagus',
      x: 33,
      y: 48,
      title: 'Esophagus',
      desc: 'Short esophagus suited for an obligate carnivore diet.',
    },
    {
      id: 'stomach',
      x: 51,
      y: 58,
      title: 'Stomach',
      desc: 'Highly acidic stomach for digesting raw meat and bones.',
    },
    {
      id: 'liver',
      x: 49,
      y: 57,
      title: 'Liver',
      desc: 'Processes proteins and fats from a meat-heavy diet.',
    },
    {
      id: 'intestines',
      x: 58,
      y: 58,
      title: 'Intestines',
      desc: 'Shorter than dogs, reflecting a carnivorous digestive tract.',
    },
  ],
  cardiovascular: [
    {
      id: 'heart',
      x: 38,
      y: 48,
      title: 'Heart',
      desc: 'Pumps blood efficiently; cats are prone to hypertrophic cardiomyopathy.',
    },
    {
      id: 'aorta',
      x: 40,
      y: 43,
      title: 'Aorta',
      desc: 'Main artery distributing oxygenated blood from the heart.',
    },
    {
      id: 'jugular',
      x: 35,
      y: 35,
      title: 'Jugular Vein',
      desc: 'Common site for blood draws in feline patients.',
    },
  ],
  nervous: [
    {
      id: 'brain',
      x: 31,
      y: 30,
      title: 'Brain',
      desc: 'Highly developed cerebral cortex supporting complex sensory processing.',
    },
    {
      id: 'spinal_cord',
      x: 48,
      y: 40,
      title: 'Spinal Cord',
      desc: "Transmits signals enabling the cat's agile reflexes.",
    },
    {
      id: 'optic_nerve',
      x: 33,
      y: 34,
      title: 'Optic Nerve',
      desc: 'Large optic nerves support exceptional low-light vision.',
    },
  ],
};

export default cat;
