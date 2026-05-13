import { POST } from '../route';
import { db } from '@/lib/db';
import { hashcode } from '@/lib/verification';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('POST /api/auth/verify-email', () => {
  beforeEach(async () => {
    // Mock cookies
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    });

    // Clean up test data
    await db.user.deleteMany({
      where: { email: 'verify-test@example.com' }
    });
    await db.emailVerification.deleteMany({
      where: { email: 'verify-test@example.com' }
    });
  });

  it('should verify code and create user account', async () => {
    // First create a verification code
    const codeHash = await hashcode('123456');
    await db.emailVerification.create({
      data: {
        email: 'verify-test@example.com',
        code: codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '123456',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe('verify-test@example.com');
  });

  it('should reject invalid verification code', async () => {
    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '000000',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    // When no verification code exists, it returns "验证码不存在或已使用，请重新获取"
    expect(data.error).toBeTruthy();
  });

  it('should reject wrong verification code', async () => {
    // First create a verification code
    const codeHash = await hashcode('123456');
    await db.emailVerification.create({
      data: {
        email: 'verify-test@example.com',
        code: codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '000000', // Wrong code
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('验证码错误');
  });

  it('should reject expired verification code', async () => {
    const codeHash = await hashcode('123456');
    await db.emailVerification.create({
      data: {
        email: 'verify-test@example.com',
        code: codeHash,
        expiresAt: new Date(Date.now() - 1000) // Expired
      }
    });

    const request = new Request('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'verify-test@example.com',
        code: '123456',
        password: 'password123',
        displayName: 'Test User'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('验证码已过期');
  });
});
