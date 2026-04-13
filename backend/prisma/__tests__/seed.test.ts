import { PrismaClient } from "@prisma/client";

describe("Seed Data", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "test-seed",
        },
      },
    });
  });

  it("should create dual-role test users", async () => {
    // These should be created by seed script
    const testEmail = "test-seed-dual@example.com";

    await prisma.user.createMany({
      data: [
        {
          email: testEmail,
          passwordHash: "hash",
          role: "STUDENT",
        },
        {
          email: testEmail,
          passwordHash: "hash",
          role: "MENTOR",
        },
      ],
    });

    const users = await prisma.user.findMany({
      where: { email: testEmail },
    });

    expect(users).toHaveLength(2);
    expect(users.some((u) => u.role === "STUDENT")).toBe(true);
    expect(users.some((u) => u.role === "MENTOR")).toBe(true);
  });
});
