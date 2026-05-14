import { POST } from '../route';

describe('POST /api/auth/send-code', () => {
  it('should send verification code for valid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('A verification code has been sent');
  });

  it('should reject invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject missing email', async () => {
    const request = new Request('http://localhost:3000/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
