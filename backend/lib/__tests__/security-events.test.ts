import { logSecurityEvent, SecurityEventType } from '../security-events';
import { db } from '@/lib/db';

describe('Security Events Service', () => {
  afterEach(async () => {
    await db.securityEvent.deleteMany({});
  });

  it('should log security event with metadata', async () => {
    await logSecurityEvent('LOGIN_SUCCESS', {
      email: 'test@example.com',
      ipAddress: '127.0.0.1'
    });

    const events = await db.securityEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('LOGIN_SUCCESS');
  });

  it('should log event without userId for pre-account events', async () => {
    await logSecurityEvent('VERIFY_FAIL', {
      email: 'test@example.com',
      reason: 'Invalid code'
    });

    const events = await db.securityEvent.findMany();
    expect(events[0].userId).toBeNull();
  });
});
