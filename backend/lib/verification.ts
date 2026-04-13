import bcrypt from 'bcryptjs';

export function generateCode(): string {
  // Generate 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashcode(code: string): Promise<string> {
  // Hash verification code using bcrypt (same as password hashing)
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  // Verify code against hash
  return bcrypt.compare(code, hash);
}

export function isCodeExpired(expiresAt: Date): boolean {
  // Check if code has expired (15 minute validity)
  const now = new Date();
  return now > expiresAt;
}

export function calculateExpiry(minutes: number = 15): Date {
  // Calculate expiry time
  return new Date(Date.now() + minutes * 60 * 1000);
}
