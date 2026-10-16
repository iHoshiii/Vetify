export type PlannerHighlight = {
  title: string;
  description: string;
  imageSrc: string | null;
};

export const plannerDownload: { url: string | null; qrImageSrc: string | null } = {
  url: null,
  qrImageSrc: null,
};

export const plannerHighlights: PlannerHighlight[] = [
  {
    title: 'Your pets, all together',
    description: 'Give each pet a profile and keep their details close at hand.',
    imageSrc: null,
  },
  {
    title: 'A plan for every day',
    description: 'Organize meals around your pet and your everyday routine.',
    imageSrc: null,
  },
  {
    title: 'Food and portions',
    description: 'Keep food choices, amounts and meal details in one place.',
    imageSrc: null,
  },
  {
    title: 'Little meals, logged',
    description: 'Record what your pet actually eats throughout the day.',
    imageSrc: null,
  },
  {
    title: 'Progress you can follow',
    description: 'Look back on feeding records and changes over time.',
    imageSrc: null,
  },
  {
    title: 'The details that matter',
    description: 'Keep nutrition observations alongside your pet’s routine.',
    imageSrc: null,
  },
];
