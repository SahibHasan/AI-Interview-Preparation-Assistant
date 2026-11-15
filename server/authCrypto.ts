import crypto from 'crypto';

/**
 * Hashes a user password with a unique random salt using Node's scrypt KDF.
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Constant-time verification of a plaintext password against a stored scrypt hash.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, salt, keyHex] = parts;
  if (!salt || !keyHex) {
    return false;
  }

  try {
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
