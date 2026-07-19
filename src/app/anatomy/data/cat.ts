import type { AnatomySystem, SpotDetails } from '../types';

// 2. A simple conversion helper function
const createSystem = (data: SpotDetails[]): AnatomySystem[] =>
  data.map(([id, x, y, title, desc]) => ({ id, x, y, title, desc }));

// 3. Clean, tabular structural layout
const cat: Record<string, AnatomySystem[]> = {
  skeletal: createSystem([
    ['skull', 28, 48, 'Skull', 'Features large eye sockets for enhanced night vision.'],
    ['spine', 55, 28, 'Flexible Spine', 'Highly flexible, allowing cats to land on their feet.'],
    [
      'clavicle',
      45,
      58,
      'Vestigial Clavicle',
      'Floating collarbone that allows squeezing through tight spaces.',
    ],
    ['pelvis', 67, 45, 'Pelvis', 'Connects the spine to the powerful hind legs.'],
    ['femur', 68, 51, 'Femur', 'Long hind leg bone enabling powerful leaps.'],
  ]),

  muscular: createSystem([
    ['masseter', 29, 39, 'Masseter Muscle', 'Strong jaw muscle for gripping and killing prey.'],
    ['trapezius', 44, 42, 'Trapezius', 'Stabilizes the shoulder blades during pouncing.'],
    ['gluteal', 73, 38, 'Gluteal Muscles', 'Power the explosive jumping ability of cats.'],
    ['gastrocnemius', 76, 62, 'Gastrocnemius', 'Calf muscle enabling silent, precise landings.'],
  ]),

  digestive: createSystem([
    ['esophagus', 33, 48, 'Esophagus', 'Short esophagus suited for an obligate carnivore diet.'],
    ['stomach', 51, 58, 'Stomach', 'Highly acidic stomach for digesting raw meat and bones.'],
    ['liver', 49, 57, 'Liver', 'Processes proteins and fats from a meat-heavy diet.'],
    [
      'intestines',
      58,
      58,
      'Intestines',
      'Shorter than dogs, reflecting a carnivorous digestive tract.',
    ],
  ]),

  cardiovascular: createSystem([
    ['heart', 38, 48, 'Heart', 'Pumps blood efficiently; prone to hypertrophic cardiomyopathy.'],
    ['aorta', 40, 43, 'Aorta', 'Main artery distributing oxygenated blood from the heart.'],
    ['jugular', 35, 35, 'Jugular Vein', 'Common site for blood draws in feline patients.'],
  ]),

  nervous: createSystem([
    [
      'brain',
      31,
      30,
      'Brain',
      'Highly developed cerebral cortex supporting complex sensory processing.',
    ],
    ['spinal_cord', 48, 40, 'Spinal Cord', "Transmits signals enabling the cat's agile reflexes."],
    [
      'optic_nerve',
      33,
      34,
      'Optic Nerve',
      'Large optic nerves support exceptional low-light vision.',
    ],
  ]),
};

export default cat;
