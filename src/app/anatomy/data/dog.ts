import type { AnatomySystem, SpotDetails } from '../types';

const createSystem = (data: readonly SpotDetails[]): AnatomySystem[] =>
  data.map(([id, x, y, title, desc]) => ({ id, x, y, title, desc }));

const dog: Record<string, AnatomySystem[]> = {
  skeletal: createSystem([
    ['skull', 25, 23, 'Skull (Cranium)', 'Protects the brain and supports facial structures.'],
    ['jaw', 25, 32, 'Mandible (Jaw)', 'Crucial for chewing and holding prey.'],
    ['cervical', 32, 34, 'Cervical Vertebrae', 'The neck bones connecting the skull to the spine.'],
    [
      'spine',
      50,
      37,
      'Thoracic & Lumbar Spine',
      'Provides structural support and houses the spinal cord.',
    ],
    ['ribs', 45, 45, 'Rib Cage', 'Protects vital internal organs like the heart and lungs.'],
    ['pelvis', 69, 42, 'Pelvis', 'Connects the spine to the hind legs.'],
    [
      'femur',
      70,
      50,
      'Femur',
      'The long bone of the hind leg, essential for movement and support.',
    ],
    ['tibia', 75, 70, 'Tibia/Fibula', 'The lower hind leg bones.'],
    ['humerus', 35, 57, 'Humerus', 'The upper front leg bone.'],
    ['radius', 40, 67, 'Radius/Ulna', 'The lower front leg bones.'],
  ] as const),

  muscular: createSystem([
    ['masseter', 25, 23, 'Masseter Muscle', 'Primary muscle used for chewing and closing the jaw.'],
    [
      'brachiocephalicus',
      33,
      28,
      'Neck Muscles',
      'Moves the head and neck, extends the front leg.',
    ],
    ['latissimus', 45, 30, 'Latissimus Dorsi', 'Retracts the forelimb and flexes the shoulder.'],
    ['pectorals', 32, 55, 'Pectoral Muscles', 'Chest muscles used for adduction of the forelimbs.'],
    ['gluteal', 70, 33, 'Gluteal Muscles', 'Powerful muscles for running, jumping, and stability.'],
    ['hamstring', 73, 50, 'Hamstring', 'Located on the back of the thigh, crucial for propulsion.'],
    ['quadriceps', 67, 54, 'Quadriceps', 'Front of the thigh, extends the knee joint.'],
  ] as const),

  digestive: createSystem([
    ['esophagus', 30, 35, 'Esophagus', 'Transports food from the mouth to the stomach.'],
    ['stomach', 55, 50, 'Stomach', 'Where primary food breakdown occurs.'],
    ['liver', 53, 42, 'Liver', 'Filters toxins, produces bile, and aids in digestion.'],
    ['intestines', 65, 42, 'Small/Large Intestines', 'Absorbs nutrients and water from food.'],
    ['colon', 73, 42, 'Colon', 'Final segment of the digestive tract.'],
  ] as const),

  cardiovascular: createSystem([
    ['heart', 47, 50, 'Heart', 'Pumps oxygen-rich blood throughout the body.'],
    ['aorta', 45, 45, 'Aorta', 'The main artery carrying blood away from the heart.'],
    [
      'jugular',
      32,
      33,
      'Jugular Vein',
      'Major blood vessel in the neck returning blood to the heart.',
    ],
    ['femoral_artery', 65, 55, 'Femoral Artery', 'Supplies blood to the hind limbs.'],
  ] as const),

  nervous: createSystem([
    ['brain', 31, 10, 'Brain', 'The central control system for all bodily functions.'],
    [
      'spinal_cord',
      50,
      32,
      'Spinal Cord',
      'The main pathway for information connecting the brain and peripheral nerves.',
    ],
    ['sciatic', 58, 35, 'Sciatic Nerve', 'Major nerve serving the hind limbs.'],
  ] as const),
};

export default dog;
