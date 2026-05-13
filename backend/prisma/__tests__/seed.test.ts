import { PrismaClient } from "@prisma/client";

describe("Seed Data Shape", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "test-seed",
        },
      },
    });
  });

  it("creates a unified user with profile, projects, saved projects, and applications", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "test-seed-owner@example.com",
        passwordHash: "hash",
        profile: {
          create: {
            displayName: "Seed Owner",
            aiHardWeight: 60,
            aiFitWeight: 40,
          },
        },
      },
    });

    const applicant = await prisma.user.create({
      data: {
        email: "test-seed-applicant@example.com",
        passwordHash: "hash",
        profile: {
          create: {
            displayName: "Seed Applicant",
            education: "PhD",
          },
        },
      },
    });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: "Seed Project",
        description: "Seed project description.",
        researchArea: "NLP",
        startTime: "2026-09",
        capacity: 2,
      },
    });

    const saved = await prisma.savedProject.create({
      data: {
        userId: applicant.id,
        projectId: project.id,
      },
    });

    const application = await prisma.application.create({
      data: {
        applicantUserId: applicant.id,
        ownerUserId: owner.id,
        projectId: project.id,
      },
    });

    expect(saved.userId).toBe(applicant.id);
    expect(application.ownerUserId).toBe(owner.id);
    expect(application.applicantUserId).toBe(applicant.id);
  });
});
