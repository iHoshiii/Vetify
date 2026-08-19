import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// hash the password by mathematical compuation 2^12 times or 4096 times
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS); // salt_rounds = 12
}

// Checks if the typed login password matches the stored database hash
export function comparePassword(hash: string | null, candidate: string): Promise<boolean> {
  // Ihe user has no password in DB (Log in with Google), reject immediately
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(candidate, hash);
}
