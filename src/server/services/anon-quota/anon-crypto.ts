import crypto from 'node:crypto';
import { env } from '../../config/env';

// gets the secret keys from the .env
function getAnonSecret(): string {
  return env.OAUTH_STATE_SECRET ?? env.JWT_SECRET_ACCESS;
}

// gnerates a synchronous, tamper-proof sha-256 signature
// in in A-Z, a-z, 0-9, -, _ format
export function signAnonId(id: string): string {
  return crypto.createHmac('sha256', getAnonSecret()).update(id).digest('base64url');
}

// combines the original ID and its unique signature using a dot separator
export function sealAnonId(id: string): string {
  return `${id}.${signAnonId(id)}`;
}

// validates a signed string and extracts the original ID if untampered
export function unsealAnonId(raw: unknown): string | null {
  // Ensure the input is a valid string type
  if (typeof raw !== 'string') return null;

  // find the separator dot, ensure it exists and isn't the first character
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;

  // split the string into the raw ID and the provided signature
  const id = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  // re-generate the expected signature using the extracted ID and server secret
  const expected = signAnonId(id);

  // convert both signatures to binary buffers for accurate byte-length comparison
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');

  // prevent timingSafeEqual from throwing errors by verifying identical byte lengths
  if (signatureBuffer.byteLength !== expectedBuffer.byteLength) return null;

  // perform a constant-time execution check to completely prevent timing attacks
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  // return the original, verified ID safely
  return id;
}
