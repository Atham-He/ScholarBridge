import { getUserByEmail, getUserById, ensureProfile } from "../auth";
import { db } from "@/lib/db";

describe("Auth Service - Unified Account", () => {
  beforeEach(async () => {
    await db.user.deleteMany({
      where: {
        email: {
          contains: "auth-test",
        },
      },
    });
  });

  afterEach(async () => {
    await db.user.deleteMany({
      where: {
        email: {
          contains: "auth-test",
        },
      },
    });
  });

  it("gets a user by id with unified profile included", async () => {
    const user = await db.user.create({
      data: {
        email: "auth-test@example.com",
        passwordHash: "hash",
        profile: {
          create: {
            displayName: "Unified User",
            institution: "Test University",
            backgroundBrief: "Applies and publishes research projects.",
          },
        },
      },
    });

    const retrievedUser = await getUserById(user.id);

    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.email).toBe("auth-test@example.com");
    expect(retrievedUser?.id).toBe(user.id);
    expect(retrievedUser?.profile?.displayName).toBe("Unified User");
    expect(retrievedUser?.profile?.institution).toBe("Test University");
    expect(retrievedUser?.profile?.backgroundBrief).toBe("Applies and publishes research projects.");
  });

  it("returns null for non-existent user", async () => {
    const user = await getUserById("non-existent-id");

    expect(user).toBeNull();
  });

  it("gets a single user by unique email", async () => {
    await db.user.create({
      data: {
        email: "auth-test-single@example.com",
        passwordHash: "hash",
      },
    });

    const user = await getUserByEmail("auth-test-single@example.com");

    expect(user?.email).toBe("auth-test-single@example.com");
    expect(user).toHaveProperty("profile");
  });

  it("ensures a default profile for an existing account", async () => {
    const user = await db.user.create({
      data: {
        email: "auth-test-profile@example.com",
        passwordHash: "hash",
      },
    });

    const profile = await ensureProfile(user.id, user.email);

    expect(profile.userId).toBe(user.id);
    expect(profile.displayName).toBe("auth-test-profile");
  });

  it("returns null for non-existent email", async () => {
    const user = await getUserByEmail("nonexistent@example.com");

    expect(user).toBeNull();
  });
});
