import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** Five megabytes. Larger than any sensible cover, smaller than a denial of
 * service, and enforced while reading rather than trusted from a header. */
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 5_000;

/** One hop, and the new location is re-validated from scratch. A chain is how a
 * public URL ends up pointing at the metadata service. */
const MAX_REDIRECTS = 1;

/** An image as the model takes it. */
export type InlineImage = { mimeType: string; data: string };

/**
 * Address ranges that are not the public internet.
 *
 * A cover URL is a string a stranger typed, and fetching it server-side means the
 * server will connect to whatever it names — including 127.0.0.1, the Docker
 * gateway, or a cloud metadata endpoint. This is the list that says no.
 */
function isPrivateV4(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // Carrier-grade NAT, and the multicast/reserved space above it.
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

function isPrivateV6(ip: string): boolean {
  const address = ip.toLowerCase();

  if (address === '::' || address === '::1') return true;
  // An IPv4-mapped address is an IPv4 address wearing a hat.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateV4(mapped[1]);
  // fc00::/7 unique-local, fe80::/10 link-local.
  return /^f[cd]/.test(address) || /^fe[89ab]/.test(address);
}

function isPrivate(ip: string): boolean {
  return isIP(ip) === 6 ? isPrivateV6(ip) : isPrivateV4(ip);
}

/**
 * Whether every address a hostname resolves to is on the public internet.
 *
 * Every address, not the first: a name that answers with one public and one
 * loopback address is a name that gets to pick at connect time.
 *
 * This narrows the window rather than closing it — the resolution the fetch
 * performs is a second, later one, and a name can answer differently. Closing it
 * would mean connecting to the checked address directly, which loses certificate
 * validation, so this is the depth chosen here on purpose.
 */
async function resolvesPublic(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivate(hostname);

  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((entry) => !isPrivate(entry.address));
  } catch {
    return false;
  }
}

/** Reads the body with the cap enforced as it arrives, so a lying or absent
 * content-length cannot buy an unbounded read. */
async function readCapped(response: Response): Promise<Buffer | null> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_BYTES) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  const reader = response.body?.getReader();
  if (!reader) return null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * A cover image, fetched and base64'd for the model, or null if it could not be
 * had safely.
 *
 * Null is deliberately not "fine": the caller treats a cover it could not read as
 * an incomplete check and holds the post, because a nudity screen that skips the
 * picture is not a nudity screen.
 */
export async function fetchCoverImage(rawUrl: string): Promise<InlineImage | null> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // https only. Plain http would also be a downgrade an attacker can control.
    if (target.protocol !== 'https:') return null;
    if (!(await resolvesPublic(target.hostname))) return null;

    let response: Response;
    try {
      response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'image/*' },
      });
    } catch {
      return null;
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REDIRECTS) return null;
      // Resolved against the current URL, then run through every check above.
      target = new URL(location, target);
      continue;
    }

    if (!response.ok) return null;

    const mimeType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    if (!mimeType.startsWith('image/')) return null;

    const body = await readCapped(response);
    if (!body || body.byteLength === 0) return null;

    return { mimeType, data: body.toString('base64') };
  }

  return null;
}
