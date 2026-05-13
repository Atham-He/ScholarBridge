import { PrismaClient } from "@prisma/client";

describe("Database Schema - Unified Account", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces one account per email and supports both publishing and applying", async () => {
    const email = "test-unified@example.com";

    await prisma.user.deleteMany({ where: { email } });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "hash",
        profile: {
          create: {
            displayName: "Unified Tester",
          },
        },
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email,
          passwordHash: "hash2",
        },
      }),
    ).rejects.toThrow();

    const project = await prisma.project.create({
      data: {
        ownerUserId: user.id,
        title: "Unified Project",
        description: "A project owned by the same account model.",
        researchArea: "AI",
        startTime: "2026-09",
        capacity: 1,
      },
    });

    expect(project.ownerUserId).toBe(user.id);

    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
