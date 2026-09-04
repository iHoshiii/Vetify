import { describe, expect, it } from 'vitest';

import { composeName, nameErrors } from '../pages/professionals/_components/name-fields';

// The four boxes are the UI; this one line is what the schema, the reviewer and the
// licence check all see, so the joining is the part worth pinning down
describe('the name the four boxes send', () => {
  it('reads in the order a licence prints it', () => {
    const parts = { firstName: 'Marites', middleName: 'Santos', lastName: 'Reyes', suffix: 'Jr.' };

    expect(composeName(parts)).toBe('Marites Santos Reyes Jr.');
  });

  it('leaves out the boxes that were not filled in', () => {
    const parts = { firstName: 'Marites', middleName: '', lastName: 'Reyes', suffix: '' };

    expect(composeName(parts)).toBe('Marites Reyes');
  });

  it('trims each box, so spacing cannot come out doubled', () => {
    const parts = { firstName: '  Marites ', middleName: '   ', lastName: ' Reyes', suffix: '' };

    expect(composeName(parts)).toBe('Marites Reyes');
  });

  it('asks for the two parts nobody can be without', () => {
    const parts = { firstName: '', middleName: 'Santos', lastName: '  ', suffix: 'Jr.' };

    expect(nameErrors(parts)).toEqual({
      firstName: 'First name is required',
      lastName: 'Last name is required',
    });
  });

  it('is satisfied by a first and a last name alone', () => {
    const parts = { firstName: 'Marites', middleName: '', lastName: 'Reyes', suffix: '' };

    expect(nameErrors(parts)).toEqual({ firstName: undefined, lastName: undefined });
  });
});
