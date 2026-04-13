import { SessionData } from '../session';

describe('Session Data Structure', () => {
  it('should include role field in SessionData', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id',
      role: 'STUDENT',
      lastRoleSwitchAt: new Date(),
      oauthState: 'test-state'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.role).toBe('STUDENT');
    expect(sessionData.lastRoleSwitchAt).toBeDefined();
    expect(sessionData.oauthState).toBe('test-state');
  });

  it('should allow optional fields', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.role).toBeUndefined();
    expect(sessionData.lastRoleSwitchAt).toBeUndefined();
  });
});
