import { getUserById, getUsersByEmail } from '../auth';
import { db } from '@/lib/db';

describe('Auth Service - Dual Role Support', () => {
  beforeEach(async () => {
    // Clean up test users
    await db.user.deleteMany({
      where: {
        email: {
          contains: 'auth-test'
        }
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
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
    // Verify profiles are included (even if null)
    expect(retrievedUser).toHaveProperty('mentorProfile');
    expect(retrievedUser).toHaveProperty('studentProfile');
  });

  it('should return null for non-existent user', async () => {
    const user = await getUserById('non-existent-id');

    expect(user).toBeNull();
  });

  it('should get users by email (single user without profiles)', async () => {
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
    expect(users[0]).toHaveProperty('mentorProfile');
    expect(users[0]).toHaveProperty('studentProfile');
  });

  it('should get users by email with both mentor and student profiles (dual-role user)', async () => {
    // Create a user with both mentor and student profiles
    const user = await db.user.create({
      data: {
        email: 'auth-test-dual@example.com',
        passwordHash: 'hash',
        role: 'MENTOR', // Primary role is MENTOR
        mentorProfile: {
          create: {
            displayName: 'Dr. Test Mentor',
            institution: 'Test University',
            department: 'Computer Science',
            title: 'Professor',
            bioShort: 'Test mentor bio',
          }
        },
        studentProfile: {
          create: {
            displayName: 'Test Student',
            backgroundBrief: 'Test student background',
          }
        }
      }
    });

    const users = await getUsersByEmail('auth-test-dual@example.com');

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('auth-test-dual@example.com');
    expect(users[0].id).toBe(user.id);

    // Verify both profiles are included
    expect(users[0].mentorProfile).toBeDefined();
    expect(users[0].mentorProfile?.displayName).toBe('Dr. Test Mentor');
    expect(users[0].mentorProfile?.institution).toBe('Test University');

    expect(users[0].studentProfile).toBeDefined();
    expect(users[0].studentProfile?.displayName).toBe('Test Student');
    expect(users[0].studentProfile?.backgroundBrief).toBe('Test student background');
  });

  it('should get user by id with both profiles (dual-role user)', async () => {
    // Create a user with both profiles
    const user = await db.user.create({
      data: {
        email: 'auth-test-dual2@example.com',
        passwordHash: 'hash',
        role: 'STUDENT', // Primary role is STUDENT
        mentorProfile: {
          create: {
            displayName: 'Prof. Dual Role',
            institution: 'Dual University',
            department: 'Engineering',
          }
        },
        studentProfile: {
          create: {
            displayName: 'Student Dual',
            backgroundBrief: 'Learning while teaching',
          }
        }
      }
    });

    const retrievedUser = await getUserById(user.id);

    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.email).toBe('auth-test-dual2@example.com');
    expect(retrievedUser?.id).toBe(user.id);

    // Verify both profiles are included
    expect(retrievedUser?.mentorProfile).toBeDefined();
    expect(retrievedUser?.mentorProfile?.displayName).toBe('Prof. Dual Role');
    expect(retrievedUser?.mentorProfile?.institution).toBe('Dual University');

    expect(retrievedUser?.studentProfile).toBeDefined();
    expect(retrievedUser?.studentProfile?.displayName).toBe('Student Dual');
    expect(retrievedUser?.studentProfile?.backgroundBrief).toBe('Learning while teaching');
  });

  it('should return empty array for non-existent email', async () => {
    const users = await getUsersByEmail('nonexistent@example.com');

    expect(users).toHaveLength(0);
  });
});
