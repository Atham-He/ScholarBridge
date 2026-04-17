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
          in: ["mentor-login-test@example.com", "dual-login-test@example.com"],
        },
      },
    });
  });

  it("允许导师账号按导师身份正常登录", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "mentor-login-test@example.com",
        passwordHash,
        role: "MENTOR",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "mentor-login-test@example.com",
        password: "password123",
        role: "MENTOR",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe("mentor-login-test@example.com");
    expect(data.user.role).toBe("MENTOR");
  });

  it("同邮箱仅有一个角色账号时，选错身份会登录失败", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "dual-login-test@example.com",
        passwordHash,
        role: "MENTOR",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "dual-login-test@example.com",
        password: "password123",
        role: "STUDENT",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("邮箱或密码错误");
  });

  it("未传 role 时直接返回 400", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "dual-login-test@example.com",
        passwordHash,
        role: "STUDENT",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "dual-login-test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("邮箱或密码无效");
  });

  it("允许小写 role 登录", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await db.user.create({
      data: {
        email: "mentor-login-test@example.com",
        passwordHash,
        role: "MENTOR",
      },
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "mentor-login-test@example.com",
        password: "password123",
        role: "mentor",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user.role).toBe("MENTOR");
  });

  it("同邮箱双角色时，不同 role 登录不同账号", async () => {
    const mentorPasswordHash = await bcrypt.hash("mentor123", 10);
    const studentPasswordHash = await bcrypt.hash("student123", 10);

    const student = await db.user.create({
      data: {
        email: "dual-login-test@example.com",
        passwordHash: studentPasswordHash,
        role: "STUDENT",
      },
    });

    const mentor = await db.user.create({
      data: {
        email: "dual-login-test@example.com",
        passwordHash: mentorPasswordHash,
        role: "MENTOR",
      },
    });

    const studentRequest = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "dual-login-test@example.com",
        password: "student123",
        role: "STUDENT",
      }),
    });

    const studentResponse = await POST(studentRequest as any);
    const studentData = await studentResponse.json();

    expect(studentResponse.status).toBe(200);
    expect(studentData.user.id).toBe(student.id);
    expect(studentData.user.role).toBe("STUDENT");

    const mentorRequest = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "dual-login-test@example.com",
        password: "mentor123",
        role: "MENTOR",
      }),
    });

    const mentorResponse = await POST(mentorRequest as any);
    const mentorData = await mentorResponse.json();

    expect(mentorResponse.status).toBe(200);
    expect(mentorData.user.id).toBe(mentor.id);
    expect(mentorData.user.role).toBe("MENTOR");
  });
});