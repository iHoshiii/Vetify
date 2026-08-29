import { describe, expect, it } from 'vitest';

import { screenInquiry } from '../professional-screen';

/** A licence number of the shape the PRC actually issues. */
const REAL_LICENCE = 'PRC 1893472';

/** A motivation from somebody who plainly is a vet, for the licence cases to lean on. */
const REAL_MOTIVATION = 'Fifteen years of small animal practice and nowhere to write it down.';

function screen(licenseNumber: string, motivation = REAL_MOTIVATION) {
  return screenInquiry({ licenseNumber, motivation });
}

describe('screenInquiry, on the licence number', () => {
  // The schema's floor is three characters, which all of these clear. Everything here
  // is something a person types when the form insists on a number they do not have.
  const refused = [
    ['an outright none', 'NONE'],
    ['the lowercase version of it', 'none'],
    ['a slashed abbreviation', 'n/a'],
    ['a promise to follow', 'pending'],
    ['a row of dashes', '--'],
    ['a licence with no number in it', 'VET-1'],
    ['one digit held down', '0000000'],
    ['a run up the keyboard', '1234567'],
    ['a run back down it', '7654321'],
  ] as const;

  it.each(refused)('refuses %s', (_label, licence) => {
    expect(screen(licence)?.rule).toBe('no-licence');
  });

  it('quotes back what was typed, which is the reviewer’s first question', () => {
    expect(screen('NONE')?.detail).toContain('"NONE"');
  });

  it('lets a real registration number through', () => {
    expect(screen(REAL_LICENCE)).toBeNull();
  });

  it('reads the licence before the motivation, so the first fault is the one reported', () => {
    expect(screen('NONE', 'I am a veterinary student.')?.rule).toBe('no-licence');
  });
});

describe('screenInquiry, on the motivation', () => {
  const refused = [
    ['not being licensed', 'I am not yet licensed, but I have worked in clinics for years.'],
    ['being unlicensed', 'I am unlicensed at the moment and would like the exposure.'],
    ['holding no licence', 'I do not have a PRC licence but I have practised informally.'],
    ['still being a student', 'I am a veterinary student at UP Los Baños and want the exposure.'],
    ['still being at school', 'Currently in vet school and looking for somewhere to start.'],
    ['aspiring to it', 'An aspiring veterinarian hoping to learn from people who do this.'],
    ['wanting to become one', 'I want to become a vet and this seems like a good place to start.'],
    ['not having sat the exam', 'I have not taken the licensure exam yet, it is in October.'],
    ['not having passed it', 'I failed the board exam last year but I know the work well.'],
    ['being about to sit it', 'I am going to take the PRC exam next year and want a head start.'],
    ['assisting a vet', 'I am a vet assistant at a busy clinic in Cebu and know the work.'],
    ['being a technician', 'I work as a veterinary technician and handle most of the intake.'],
    ['grooming', 'I am a groomer with ten years of experience and a loyal client list.'],
    ['breeding', 'I am a breeder and I want to reach more people looking for puppies.'],
  ] as const;

  it.each(refused)('refuses somebody who says they are %s', (_label, motivation) => {
    expect(screen(REAL_LICENCE, motivation)?.rule).toBe('not-licensed');
  });

  it('names the rule on the record without naming it to the applicant', () => {
    const refusal = screen(REAL_LICENCE, 'I am a groomer with a loyal client list.');
    expect(refusal?.detail).toBe('the enquiry describes a role that is not a licensed vet');
  });
});

/**
 * The half that matters most.
 *
 * A false positive here costs a licensed vet their application, and there is a human
 * behind every enquiry the screen lets through — so each of these is a phrase that
 * shares vocabulary with a rule above and must still get past it.
 */
describe('screenInquiry lets a real vet through', () => {
  const passed = [
    ['a terse motivation with none of the vocabulary', REAL_MOTIVATION],
    [
      'studying, in the sense a practising vet means it',
      'I have been studying new treatments for feline diabetes since my residency.',
    ],
    [
      'an assistant who belongs to them rather than being them',
      'My assistant handles the bookings, so I have room for more patients.',
    ],
    [
      'groomers and breeders as people they work with',
      'I work alongside groomers and breeders in Cebu and refer clients between us.',
    ],
    [
      'unlicensed practice as something they report',
      'I report anyone practising without a licence, and I would like to be listed properly.',
    ],
    [
      'saying plainly that they are licensed',
      'I am a licensed veterinarian running a clinic in Mandaue since 2011.',
    ],
    [
      'teaching students rather than being one',
      'I supervise veterinary students on rotation and would like more small animal work.',
    ],
    [
      'an exam they set rather than sat',
      'I sit on the board that writes the licensure exam and have practised for 20 years.',
    ],
  ] as const;

  it.each(passed)('passes %s', (_label, motivation) => {
    expect(screen(REAL_LICENCE, motivation)).toBeNull();
  });
});
