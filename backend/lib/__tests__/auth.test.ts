import { getCurrentUser, getUserById, getUsersByEmail } from '../auth';
import { db } from '@/lib/db';

describe('Auth Service - Dual Role Support', () => {
  beforeEach(async () => {
    await db.user.deleteMany({
      where: {
        email: {
          contains: 'auth-test'
        }
      }
    });
  });

  it('should get user by id with profiles included', async () => {
    const user = await db.user.create({
      data: {
        email: 'auth-test@example.com',
        passwordHash: 'hash',
        role: 'STUDENT'
      }
    });

    const retrievedUser = await getUserById(user.id);

    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.email).toBe('auth-test@example.com');
    expect(retrievedUser?.id).toBe(user.id);
  });

  it('should return null for non-existent user', async () => {
    const user = await getUserById('non-existent-id');

    expect(user).toBeNull();
  });

  it('should get users by email (single user)', async () => {
    await db.user.create({
      data: {
        email: 'auth-test-single@example.com',
        passwordHash: 'hash',
        role: 'MENTOR'
      }
    });

    const users = await getUsersByEmail('auth-test-single@example.com');

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('auth-test-single@example.com');
  });

  it('should get users by email (single user)', async () => {
    const user = await db.user.create({
      data: {
        email: 'auth-test-dual@example.com',
        passwordHash: 'hash',
        role: 'STUDENT'
      }
    });

    const users = await getUsersByEmail('auth-test-dual@example.com');

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('auth-test-dual@example.com');
    expect(users[0].id).toBe(user.id);
  });

  it('should return empty array for non-existent email', async () => {
    const users = await getUsersByEmail('nonexistent@example.com');

    expect(users).toHaveLength(0);
  });
});
