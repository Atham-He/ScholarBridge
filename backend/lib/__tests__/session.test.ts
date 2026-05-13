import { SessionData } from '../session';

describe('Session Data Structure', () => {
  it('should include only account session fields', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id',
      oauthState: 'test-state'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.oauthState).toBe('test-state');
  });

  it('should allow optional fields', () => {
    const sessionData: SessionData = {
      userId: 'test-user-id'
    };

    expect(sessionData.userId).toBe('test-user-id');
    expect(sessionData.oauthState).toBeUndefined();
  });
});
