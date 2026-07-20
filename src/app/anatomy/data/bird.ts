import type { AnatomySystem, SpotDetails } from '../types';

const createSystem = (data: readonly SpotDetails[]): AnatomySystem[] =>
  data.map(([id, x, y, title, desc]) => ({ id, x, y, title, desc }));

const bird: Record<string, AnatomySystem[]> = {
  skeletal: createSystem([
    [
      'skull',
      40,
      12,
      'Skull',
      'Lightweight skull with a large braincase and fused bones for flight efficiency.',
    ],
    ['beak', 30, 17, 'Beak (Rostrum)', 'Keratinous beak adapted for cracking seeds and foraging.'],
    [
      'keel',
      40,
      53,
      'Keel (Sternum)',
      'Large breastbone providing attachment for powerful flight muscles.',
    ],
    [
      'furcula',
      39,
      47,
      'Furcula (Wishbone)',
      'Fused clavicles that act as a spring during the wing stroke.',
    ],
    ['humerus', 48, 36, 'Humerus', 'Upper wing bone; hollow to reduce weight for flight.'],
    ['spine', 50, 41.5, 'Vertebral Column', 'Many vertebrae are fused for rigidity during flight.'],
    ['pelvis', 62, 45, 'Synsacrum', 'Fused pelvic vertebrae providing a rigid frame for landing.'],
  ] as const),

  muscular: createSystem([
    [
      'pectoralis',
      30,
      55,
      'Pectoralis Major',
      'The largest muscle; powers the downstroke of the wings.',
    ],
    [
      'supracoracoideus',
      36,
      65,
      'Supracoracoideus',
      'Lifts the wing on the upstroke via a pulley-like tendon.',
    ],
    [
      'neck_muscles',
      33,
      30,
      'Neck Muscles',
      'Highly mobile neck muscles compensate for fixed eye sockets.',
    ],
    [
      'leg_muscles',
      45,
      70,
      'Leg Muscles',
      "Positioned close to the body's center of gravity for balance.",
    ],
  ] as const),

  digestive: createSystem([
    ['beak_mouth', 25, 18, 'Beak / Mouth', 'No teeth; food is swallowed whole or in pieces.'],
    ['crop', 37, 58, 'Crop', 'Expandable pouch that stores and softens food before digestion.'],
    [
      'proventriculus',
      46,
      55,
      'Proventriculus',
      'Glandular stomach that secretes digestive enzymes.',
    ],
    [
      'gizzard',
      53,
      62,
      'Gizzard (Ventriculus)',
      'Muscular stomach that grinds food, replacing the function of teeth.',
    ],
    [
      'intestines',
      60,
      75,
      'Intestines',
      'Relatively short intestines suited to a high-energy diet.',
    ],
  ] as const),

  cardiovascular: createSystem([
    [
      'heart',
      40,
      43,
      'Heart',
      'Four-chambered heart with a very high resting rate to support flight.',
    ],
    ['aorta', 40, 38, 'Aorta', 'Right aortic arch (unique to birds) distributes oxygenated blood.'],
    [
      'air_sacs',
      38,
      41,
      'Air Sacs',
      'Nine air sacs create a unidirectional airflow for highly efficient respiration.',
    ],
  ] as const),

  nervous: createSystem([
    [
      'brain',
      35,
      24,
      'Brain',
      'Enlarged optic lobes and cerebellum support visual acuity and flight coordination.',
    ],
    [
      'optic_nerve',
      31,
      23,
      'Optic Nerve',
      'Large optic nerves connected to eyes that can make up 15% of head mass.',
    ],
    [
      'spinal_cord',
      42,
      51,
      'Spinal Cord',
      'Coordinates wing and leg movements during flight and perching.',
    ],
  ] as const),
};

export default bird;
