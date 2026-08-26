import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';
import { BLOG_STATUSES, type BlogModeration } from './types';

/**
 * What the database needs in order to hold a post, which is not the same thing
 * as what the product asks an author for. The length and tag rules live in
 * `blogCreateSchema` (@shared/schemas) so the client form and the route
 * validator share one copy of them — restating them here would give two places
 * to change and one to forget.
 *
 * What is left is the part no caller may skip: an author that is a real id, and
 * a status that is one of the four. That matters for the callers who never pass
 * through the route — the seed script, and the moderation routes in phase 5.
 */
export const blogAttrsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  excerpt: z.string().trim().min(1, 'Excerpt is required'),
  body: z.string().trim().min(1, 'Body is required'),
  coverUrl: z.string().trim().min(1).nullish(),
  tags: z.array(z.string().trim().min(1)).nullish(),
  author: z.custom<string | ObjectId>(isValidObjectId, 'Author is required'),
  status: z.enum(BLOG_STATUSES).default('draft'),
  // Lets the seed script pin a slug, so re-running it lands on the same post
  // rather than minting a `-2` beside the old one.
  slug: z.string().trim().min(1).optional(),
  /**
   * The screen's verdict, for the caller that has one.
   *
   * Not broken out field by field: this is built by the screening service from its
   * own types rather than received from a client, so a zod copy of the shape would
   * be a second definition of it to keep in step. What matters at this door is that
   * it is an object or absent.
   */
  moderation: z
    .custom<BlogModeration>((value) => value === null || typeof value === 'object')
    .nullish(),
});

export type BlogAttrs = z.input<typeof blogAttrsSchema>;
