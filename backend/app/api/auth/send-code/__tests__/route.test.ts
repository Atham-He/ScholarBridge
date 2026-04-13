import { POST } from '../route';

describe('POST /api/auth/send-code', () => {
  it('should send verification code for valid email and role', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'STUDENT'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('验证码已发送');
  });

  it('should reject invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        role: 'STUDENT'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject invalid role', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'INVALID'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
