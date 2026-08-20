import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const saltLength = 16;
const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(saltLength).toString('hex');
  const hash = scryptSync(password, salt, keyLength).toString('hex');

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [algorithm, salt, expectedHash] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) return false;

  const actualHash = scryptSync(password, salt, keyLength);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  return (
    actualHash.length === expectedBuffer.length &&
    timingSafeEqual(actualHash, expectedBuffer)
  );
}