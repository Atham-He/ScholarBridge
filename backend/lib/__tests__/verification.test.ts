import { generateCode, hashcode, verifyCode, isCodeExpired } from '../verification';

describe('Verification Code Service', () => {
  describe('generateCode', () => {
    it('should generate 6-digit code', () => {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes each time', () => {
      const code1 = generateCode();
      const code2 = generateCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('hashcode', () => {
    it('should hash code with bcrypt', async () => {
      const code = '123456';
      const hash = await hashcode(code);

      // Bcrypt hashes start with $2b$ or $2a$
      expect(hash).toMatch(/^\$2[ab]\$/);
      expect(hash).not.toBe(code);
    });

    it('should generate different hashes for same code (due to salt)', async () => {
      const hash1 = await hashcode('123456');
      const hash2 = await hashcode('123456');

      // Bcrypt uses random salt, so hashes differ
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different codes', async () => {
      const hash1 = await hashcode('123456');
      const hash2 = await hashcode('654321');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyCode', () => {
    it('should verify correct code', async () => {
      const code = '123456';
      const hash = await hashcode(code);

      const isValid = await verifyCode(code, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect code', async () => {
      const code = '123456';
      const hash = await hashcode(code);

      const isValid = await verifyCode('654321', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('isCodeExpired', () => {
    it('should not expire fresh codes', () => {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      expect(isCodeExpired(expiresAt)).toBe(false);
    });

    it('should expire old codes', () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      expect(isCodeExpired(expiresAt)).toBe(true);
    });
  });
});
