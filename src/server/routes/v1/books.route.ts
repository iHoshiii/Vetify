import { BOOK_MAX_BYTES, BOOK_TOPICS } from '@shared/books';
import { createHash } from 'node:crypto';
import { Router, raw } from 'express';
import rateLimit from 'express-rate-limit';
import { Binary, ObjectId } from 'mongodb';
import { z } from 'zod';
import { optionalAuth } from '../../middleware/optionalAuth';
import { isTest } from '../../config/env';
import { requireRole } from '../../middleware/requireAuth';
import { validateQuery } from '../../middleware/validate';
import {
  bookAllowance,
  bookAffiliatePage,
  booksCollection,
  bookSummary,
  bookUploadSummary,
  recordBookCommission,
} from '../../models/books';
import { findProfessionalByUser } from '../../models/professionals';
import { created, fail, ok } from '../../utils/response';

const router = Router();
const screeningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.currentUser!._id.toString(),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many submissions. Try again in an hour.' },
  skip: () => isTest,
});
const requireVerifiedVet: import('express').RequestHandler = async (req, res, next) => {
  const professional = await findProfessionalByUser(req.currentUser!._id);
  if (professional?.status !== 'verified') {
    fail(res, 403, 'Only verified vet professionals can upload documents.');
    return;
  }
  next();
};
router.use(optionalAuth);
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/:id/allowance', requireRole('user', 'professional', 'admin'), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !ObjectId.isValid(id)) return fail(res, 404, 'Book not found.');
  if (
    !(await booksCollection().findOne(
      { _id: new ObjectId(id), status: 'approved' },
      { projection: { _id: 1 } }
    ))
  )
    return fail(res, 404, 'Book not found.');
  ok(res, await bookAllowance(req.currentUser!._id.toString(), id));
});
const listSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });
router.get('/mine', requireRole('professional'), validateQuery(listSchema), async (req, res) => {
  const { page } = req.validatedQuery as z.infer<typeof listSchema>;
  const filter = { author: req.currentUser!._id };
  const [items, total] = await Promise.all([
    booksCollection()
      .find(filter, { projection: { pdf: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * 12)
      .limit(12)
      .toArray(),
    booksCollection().countDocuments(filter),
  ]);
  ok(res, { items: items.map(bookUploadSummary), total, page, pages: Math.ceil(total / 12) });
});
router.get(
  '/affiliate',
  requireRole('professional'),
  validateQuery(listSchema),
  async (req, res) => {
    const { page } = req.validatedQuery as z.infer<typeof listSchema>;
    ok(res, await bookAffiliatePage(req.currentUser!._id, page));
  }
);
router.get(
  '/',
  requireRole('user', 'professional', 'admin'),
  validateQuery(listSchema),
  async (req, res) => {
    const { page } = req.validatedQuery as z.infer<typeof listSchema>;
    const [items, total] = await Promise.all([
      booksCollection()
        .find({ status: 'approved' }, { projection: { pdf: 0 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * 12)
        .limit(12)
        .toArray(),
      booksCollection().countDocuments({ status: 'approved' }),
    ]);
    ok(res, {
      items: items.map(bookSummary),
      total,
      page,
      pages: Math.ceil(total / 12),
    });
  }
);
const uploadSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(1000),
  topic: z.enum(BOOK_TOPICS),
  veterinaryOnly: z.literal('true'),
});
const parsePdf = raw({ type: 'application/pdf', limit: BOOK_MAX_BYTES });
router.post(
  '/',
  requireRole('professional'),
  requireVerifiedVet,
  screeningLimiter,
  validateQuery(uploadSchema),
  (req, res, next) => {
    parsePdf(req, res, (error?: unknown) => {
      if ((error as { type?: string } | undefined)?.type === 'entity.too.large') {
        fail(res, 413, 'Upload a PDF document of up to 10 MB.');
        return;
      }
      next(error);
    });
  },
  async (req, res) => {
    const pdf: unknown = req.body;
    if (
      !Buffer.isBuffer(pdf) ||
      pdf.length < 8 ||
      pdf.length > BOOK_MAX_BYTES ||
      pdf.subarray(0, 5).toString() !== '%PDF-' ||
      !pdf.subarray(-1024).includes(Buffer.from('%%EOF'))
    ) {
      return fail(res, 400, 'Upload a valid PDF document of up to 10 MB.');
    }
    const input = req.validatedQuery as z.infer<typeof uploadSchema>;
    const actor = req.currentUser!;
    const book = {
      _id: new ObjectId(),
      title: input.title,
      description: input.description,
      topic: input.topic,
      author: actor._id,
      uploadedBy: actor.name ?? 'Vet professional',
      size: pdf.length,
      createdAt: new Date(),
      pdf: new Binary(pdf),
      contentHash: createHash('sha256').update(pdf).digest('hex'),
      status: 'pending' as const,
    };
    try {
      await booksCollection().insertOne(book);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      return fail(
        res,
        409,
        'An identical document has already been uploaded. Check My uploads if it belongs to you.'
      );
    }
    created(res, bookUploadSummary(book));
  }
);
router.post(
  '/:id/recheck',
  requireRole('professional'),
  requireVerifiedVet,
  screeningLimiter,
  async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || !ObjectId.isValid(id))
      return fail(res, 404, 'Document not found.');
    const filter = { _id: new ObjectId(id), author: req.currentUser!._id };
    const book = await booksCollection().findOne(filter, { projection: { pdf: 0 } });
    if (!book) return fail(res, 404, 'Document not found.');
    if (book.status !== 'unverified')
      return fail(res, 409, 'This document is not waiting for another check.');
    if (book.moderation?.checkedAt && Date.now() - book.moderation.checkedAt.getTime() < 60_000) {
      return fail(res, 429, 'Wait a minute before checking again.');
    }
    const updated = await booksCollection().findOneAndUpdate(
      { ...filter, status: 'unverified' },
      {
        $set: {
          status: 'pending',
          'moderation.uncertainChecks': 0,
          'moderation.reason': 'Waiting for an automatic check.',
        },
        $unset: {
          'moderation.lockUntil': '',
          'moderation.token': '',
          'moderation.nextCheckAt': '',
        },
      },
      { returnDocument: 'after', projection: { pdf: 0 } }
    );
    if (!updated) return fail(res, 409, 'This document is already being checked.');
    ok(res, bookUploadSummary(updated));
  }
);
router.post('/:id/download', requireRole('user', 'professional', 'admin'), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== 'string' || !ObjectId.isValid(id)) return fail(res, 404, 'Book not found.');
  const book = await booksCollection().findOne({ _id: new ObjectId(id), status: 'approved' });
  if (!book) return fail(res, 404, 'Book not found.');
  const now = new Date();
  const userId = req.currentUser!._id.toString();
  await recordBookCommission(userId, id, now, book.author);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="book-${book._id}.pdf"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(book.pdf.buffer));
});
export default router;
