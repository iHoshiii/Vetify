import type { AnatomySystem } from './types';

const cat: Record<string, AnatomySystem[]> = {
  skeletal: [
    {
      id: 'skull',
      x: 30,
      y: 35,
      title: 'Skull',
      desc: 'Features large eye sockets for enhanced night vision.',
    },
    {
      id: 'spine',
      x: 55,
      y: 40,
      title: 'Flexible Spine',
      desc: 'Highly flexible, allowing cats to land on their feet.',
    },
    {
      id: 'clavicle',
      x: 35,
      y: 45,
      title: 'Vestigial Clavicle',
      desc: 'A small floating collarbone that allows cats to squeeze through tight spaces.',
    },
    {
      id: 'pelvis',
      x: 68,
      y: 42,
      title: 'Pelvis',
      desc: 'Connects the spine to the powerful hind legs.',
    },
    {
      id: 'femur',
      x: 70,
      y: 52,
      title: 'Femur',
      desc: 'Long hind leg bone enabling powerful leaps.',
    },
  ],
  muscular: [
    {
      id: 'masseter',
      x: 28,
      y: 33,
      title: 'Masseter Muscle',
      desc: 'Strong jaw muscle for gripping and killing prey.',
    },
    {
      id: 'trapezius',
      x: 40,
      y: 28,
      title: 'Trapezius',
      desc: 'Stabilizes the shoulder blades during pouncing.',
    },
    {
      id: 'gluteal',
      x: 68,
      y: 35,
      title: 'Gluteal Muscles',
      desc: 'Power the explosive jumping ability of cats.',
    },
    {
      id: 'gastrocnemius',
      x: 74,
      y: 65,
      title: 'Gastrocnemius',
      desc: 'Calf muscle enabling silent, precise landings.',
    },
  ],
  digestive: [
    {
      id: 'esophagus',
      x: 32,
      y: 36,
      title: 'Esophagus',
      desc: 'Short esophagus suited for an obligate carnivore diet.',
    },
    {
      id: 'stomach',
      x: 52,
      y: 50,
      title: 'Stomach',
      desc: 'Highly acidic stomach for digesting raw meat and bones.',
    },
    {
      id: 'liver',
      x: 50,
      y: 43,
      title: 'Liver',
      desc: 'Processes proteins and fats from a meat-heavy diet.',
    },
    {
      id: 'intestines',
      x: 63,
      y: 44,
      title: 'Small Intestines',
      desc: 'Shorter than dogs, reflecting a carnivorous digestive tract.',
    },
  ],
  cardiovascular: [
    {
      id: 'heart',
      x: 46,
      y: 48,
      title: 'Heart',
      desc: 'Pumps blood efficiently; cats are prone to hypertrophic cardiomyopathy.',
    },
    {
      id: 'aorta',
      x: 44,
      y: 43,
      title: 'Aorta',
      desc: 'Main artery distributing oxygenated blood from the heart.',
    },
    {
      id: 'jugular',
      x: 31,
      y: 32,
      title: 'Jugular Vein',
      desc: 'Common site for blood draws in feline patients.',
    },
  ],
  nervous: [
    {
      id: 'brain',
      x: 29,
      y: 22,
      title: 'Brain',
      desc: 'Highly developed cerebral cortex supporting complex sensory processing.',
    },
    {
      id: 'spinal_cord',
      x: 52,
      y: 33,
      title: 'Spinal Cord',
      desc: "Transmits signals enabling the cat's agile reflexes.",
    },
    {
      id: 'optic_nerve',
      x: 27,
      y: 28,
      title: 'Optic Nerve',
      desc: 'Large optic nerves support exceptional low-light vision.',
    },
  ],
};

export default cat;
