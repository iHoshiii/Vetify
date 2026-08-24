/**
 * Puts the three launch posts in the database.
 *
 *   npm run seed:blogs
 *
 * The blogs page used to hold these as three hardcoded strings, so a fresh
 * database would otherwise render an empty screen where a working feature used to
 * be. Needs somebody to credit them to: run `npm run seed:admin -- <email>`
 * first, since only professionals and admins can hold authorship.
 *
 * Idempotent — a post whose slug is already there is left exactly as it is,
 * edits included.
 */
import { connectDb, disconnectDb } from '../config/db';
import { applyDnsServers } from '../config/dns';
import { env } from '../config/env';
import { ensureIndexes, findBlogBySlug, insertBlog, slugify, usersCollection } from '../models';

const POSTS = [
  {
    title: 'Spot early signs that your pet needs a vet visit',
    excerpt:
      'Most illnesses show up days before anything dramatic. Here is what those first few days look like.',
    tags: ['health', 'symptoms'],
    body: `Most illnesses announce themselves days before anything dramatic happens. The signs are ordinary enough to explain away, which is exactly why they get missed.

## What to watch for

- **Appetite.** One skipped meal is nothing. Two days of picking at food is not.
- **Water.** Sudden thirst, or a bowl that stays full, both matter.
- **Movement.** Hesitating at stairs or at a jump they used to make without thinking.
- **Grooming.** Cats stop grooming what hurts; dogs over-lick it.
- **Breathing at rest.** Count breaths while they sleep. Faster than usual is worth a call.

## When to call the same day

Repeated vomiting, straining in the litter box, a swollen abdomen, pale gums, or any collapse. None of these wait until morning.

Write down when you first noticed the change. "Off her food since Tuesday" is worth far more to your vet than "she has not been herself lately".`,
  },
  {
    title: 'Build a calmer home routine for anxious pets',
    excerpt:
      'Anxiety responds to predictability more than to reassurance. A routine is the treatment.',
    tags: ['behaviour', 'anxiety'],
    body: `An anxious animal is not asking to be comforted out of it. They are asking for a day they can predict. Most of what helps is scheduling rather than training.

## Make the day predictable

Feed, walk and settle at roughly the same times. Cats and dogs both track routine closely, and a predictable day removes the low background question of what happens next.

## Give them somewhere to leave to

One place — a crate with the door open, a covered bed, the top of a wardrobe — that nobody follows them into. A retreat only works if it is never used as a punishment.

## Lower the volume, not the exposure

Keep the trigger present but far enough away that they still take food. Pair it with something good, then close the distance over weeks. Marching them up to what frightens them teaches the opposite lesson.

## What to stop doing

Do not correct fear. Growling, hiding and flinching are information; punishing them removes the warning without touching the fear.

If the panic is daily, or if they cannot eat or settle at all, ask your vet about medication alongside the routine. It is not a last resort, and it makes the behaviour work possible.`,
  },
  {
    title: 'What to prepare before a clinic appointment',
    excerpt: 'Ten minutes of preparation is usually the difference between a guess and a diagnosis.',
    tags: ['clinic', 'checklist'],
    body: `Consultations are short. What you bring decides how much of it goes on questions you could have answered at home.

## Bring

- **A timeline.** When the problem started, what has changed since, what you have already tried.
- **The medicine cabinet.** Every current medication, supplement and flea treatment, with doses.
- **The food.** Brand and amount, including treats and anything from the table.
- **A video.** A limp, a cough or a seizure rarely performs on cue in the consult room.
- **Your questions, written down.** They are easy to forget and awkward to remember afterwards.

## Ask before you leave home

Whether to fast beforehand — it matters for bloodwork and for anything needing sedation — and whether to collect a urine or stool sample.

## On the day

Cats travel better in a carrier left out for days beforehand rather than produced on the morning. Dogs do better after a short walk. Arrive a few minutes early so the waiting room is not the first stressful part of the visit.`,
  },
];

async function main(): Promise<void> {
  applyDnsServers(env.DNS_SERVERS);

  const connected = await connectDb();
  if (!connected) throw new Error(`Could not reach Mongo at ${env.MONGODB_URI}`);

  // The unique slug index has to exist before the first insert, or nothing
  // enforces the uniqueness these posts are being checked for.
  await ensureIndexes();

  const author = await usersCollection().findOne({
    role: { $in: ['admin', 'professional'] },
    status: 'active',
  });

  if (!author) {
    throw new Error('No active admin or professional to author these posts. Run seed:admin first.');
  }

  let written = 0;

  for (const post of POSTS) {
    const slug = slugify(post.title);

    if (await findBlogBySlug(slug)) {
      console.log(`[seed:blogs] skipped ${slug} — already there`);
      continue;
    }

    await insertBlog({ ...post, author: author._id, status: 'published' });
    written++;
    console.log(`[seed:blogs] published ${slug}`);
  }

  console.log(`[seed:blogs] ${written} post(s) written, credited to ${author.email}`);
}

main()
  .catch((err) => {
    console.error(`[seed:blogs] ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
