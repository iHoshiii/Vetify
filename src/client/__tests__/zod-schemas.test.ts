import { describe, expect, it } from 'vitest';

import {
  BLOG_PAGE_SIZE,
  BLOG_PAGE_SIZE_MAX,
  PROFESSIONAL_MAX_SPECIALTIES,
  PROFESSIONAL_PAGE_SIZE,
  PROFESSIONAL_PAGE_SIZE_MAX,
} from '@shared/limits';
import {
  blogCreateSchema,
  blogListQuerySchema,
  blogUpdateSchema,
  chatRequestSchema,
  loginSchema,
  professionalApplySchema,
  professionalListQuerySchema,
  professionalRejectSchema,
  signupSchema,
} from '@shared/schemas';

describe('Zod schemas', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({
      email: 'owner@example.com',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid signup payload with helpful issues', () => {
    const result = signupSchema.safeParse({
      name: 'A',
      email: 'not-an-email',
      password: '123',
      confirmPassword: '456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain(
        'Name must be at least 2 characters'
      );
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Please enter a valid email address'
      );
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters long'
      );
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwords do not match'
      );
    }
  });

  it('validates chat requests and normalizes the model', () => {
    const result = chatRequestSchema.safeParse({
      message: 'My dog is coughing',
      history: [{ role: 'user', content: 'Hi there' }],
      model: 'bad-model',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe('gemini-3.5-flash');
    }
  });
});

describe('blog schemas', () => {
  const valid = {
    title: '  Spot early signs your pet needs a vet  ',
    excerpt: 'The small changes that are worth a phone call.',
    body: 'x'.repeat(60),
  };

  it('trims the title and defaults an unpublished post to draft', () => {
    const result = blogCreateSchema.parse(valid);

    expect(result.title).toBe('Spot early signs your pet needs a vet');
    // Publishing is a decision the author makes, not one the schema makes for
    // them.
    expect(result.status).toBe('draft');
    expect(result.tags).toEqual([]);
  });

  it('lowercases and deduplicates tags', () => {
    // Otherwise 'Dogs' and 'dogs' are two tags that each match half the posts.
    const result = blogCreateSchema.parse({ ...valid, tags: ['Dogs', 'dogs', ' Cats '] });

    expect(result.tags).toEqual(['dogs', 'cats']);
  });

  it('refuses a moderation status from an author', () => {
    // 'hidden' and 'removed' belong to the admin routes. Accepting them here
    // would let an author patch their way out of a takedown.
    for (const status of ['hidden', 'removed']) {
      expect(blogUpdateSchema.safeParse({ status }).success).toBe(false);
    }
    expect(blogUpdateSchema.safeParse({ status: 'published' }).success).toBe(true);
  });

  it('refuses an update that changes nothing', () => {
    const result = blogUpdateSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Include at least one field to update');
    }
  });

  it('coerces list paging from the query string and caps the page size', () => {
    // Query values arrive as strings, and an uncapped limit turns a paginated
    // endpoint back into a full scan.
    expect(blogListQuerySchema.parse({ page: '2', limit: '3' })).toMatchObject({
      page: 2,
      limit: 3,
    });
    expect(blogListQuerySchema.parse({})).toMatchObject({ page: 1, limit: BLOG_PAGE_SIZE });
    expect(blogListQuerySchema.safeParse({ limit: String(BLOG_PAGE_SIZE_MAX + 1) }).success).toBe(
      false
    );
  });

  it('normalises a tag filter the same way it stores one', () => {
    expect(blogListQuerySchema.parse({ tag: ' DOGS ' }).tag).toBe('dogs');
  });
});
describe('professional schemas', () => {
  const valid = {
    licenseNumber: '  vet  1234-ph ',
    licenseAuthority: '  Professional   Regulation Commission ',
    credentialUrls: ['https://example.com/licence.pdf'],
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    bio: 'x'.repeat(80),
    yearsExperience: 7,
    backgroundCheckConsent: true,
  };

  it('normalises the licence so one licence cannot apply twice', () => {
    const result = professionalApplySchema.parse(valid);

    expect(result.licenseNumber).toBe('VET 1234-PH');
    expect(result.licenseAuthority).toBe('Professional Regulation Commission');
    expect(result.specialties).toEqual([]);
  });

  it('lowercases and deduplicates specialties', () => {
    // The directory filters on this field: 'Surgery' must not hide the surgeons.
    const result = professionalApplySchema.parse({
      ...valid,
      specialties: ['Surgery', 'surgery', ' Dentistry '],
    });

    expect(result.specialties).toEqual(['surgery', 'dentistry']);
    expect(
      professionalApplySchema.safeParse({
        ...valid,
        specialties: Array.from({ length: PROFESSIONAL_MAX_SPECIALTIES + 1 }, (_, n) => `s${n}`),
      }).success
    ).toBe(false);
  });

  it('insists on a credential a reviewer can open', () => {
    expect(professionalApplySchema.safeParse({ ...valid, credentialUrls: [] }).success).toBe(false);
    expect(
      professionalApplySchema.safeParse({ ...valid, credentialUrls: ['licence.pdf'] }).success
    ).toBe(false);
  });

  it('refuses an application without background-check consent', () => {
    // An unticked box has to fail, which is why the field is not a defaulted
    // boolean: the application is the record of that consent.
    expect(
      professionalApplySchema.safeParse({ ...valid, backgroundCheckConsent: false }).success
    ).toBe(false);

    const missing = { ...valid } as Record<string, unknown>;
    delete missing.backgroundCheckConsent;
    expect(professionalApplySchema.safeParse(missing).success).toBe(false);
  });

  it('coerces years of experience but keeps it a whole number', () => {
    expect(professionalApplySchema.parse({ ...valid, yearsExperience: '7' }).yearsExperience).toBe(
      7
    );
    expect(professionalApplySchema.safeParse({ ...valid, yearsExperience: 7.5 }).success).toBe(
      false
    );
    expect(professionalApplySchema.safeParse({ ...valid, yearsExperience: -1 }).success).toBe(
      false
    );
  });

  it('requires a reason with something in it before turning someone down', () => {
    // The reason is all the applicant is told and all the audit log can show.
    expect(professionalRejectSchema.safeParse({ reason: 'no' }).success).toBe(false);
    expect(professionalRejectSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(
      professionalRejectSchema.safeParse({ reason: 'The licence number does not match the board.' })
        .success
    ).toBe(true);
  });

  it('defaults and caps the directory query', () => {
    expect(professionalListQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: PROFESSIONAL_PAGE_SIZE,
    });
    expect(professionalListQuerySchema.parse({ page: '3', specialty: ' Surgery ' })).toMatchObject({
      page: 3,
      specialty: 'surgery',
    });
    expect(
      professionalListQuerySchema.safeParse({ limit: String(PROFESSIONAL_PAGE_SIZE_MAX + 1) })
        .success
    ).toBe(false);
  });
});
