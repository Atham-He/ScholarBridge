import { PrismaClient } from '@prisma/client';

describe('Database Schema - Dual Role Support', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow multiple users with same email but different roles', async () => {
    // This test will pass after schema migration
    const email = 'test-dual@example.com';

    // Create student user
    const student = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash1',
        role: 'STUDENT'
      }
    });

    // Create mentor user with same email
    const mentor = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash2',
        role: 'MENTOR'
      }
    });

    expect(student.email).toBe(mentor.email);
    expect(student.role).toBe('STUDENT');
    expect(mentor.role).toBe('MENTOR');
    expect(student.id).not.toBe(mentor.id);

    // Cleanup
    await prisma.user.deleteMany({ where: { email } });
  });
});
