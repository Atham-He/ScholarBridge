import bcrypt from "bcryptjs";
import { POST } from "../route";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    });

    await db.user.deleteMany({
      where: {
        email: {
          in: ["login-test@example.com", "missing-password-login@example.com"],
        },
      },
    });
  });

  it("allows a unified account to log in", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "login-test@example.com",
        passwordHash,
        profile: {
          create: {
            displayName: "Login Test",
          },
        },
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "login-test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe("login-test@example.com");
    expect(data.user.role).toBeUndefined();
  });

  it("rejects wrong passwords", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "login-test@example.com",
        passwordHash,
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "login-test@example.com",
        password: "wrong",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Incorrect email or password");
  });

  it("does not require role in the request body", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "login-test@example.com",
        passwordHash,
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "login-test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("rejects accounts without passwords", async () => {
    await db.user.create({
      data: {
        email: "missing-password-login@example.com",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "missing-password-login@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(401);
  });
});
