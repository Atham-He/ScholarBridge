import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  role?: 'MENTOR' | 'STUDENT';  // NEW: Track active role
  lastRoleSwitchAt?: Date;  // NEW: For security tracking
  oauthState?: string;  // NEW: For OAuth CSRF protection
};

/** 生产环境务必设置 SESSION_SECRET（≥32 字符） */
const fallbackSecret =
  "dev-only-secret-change-me-in-env-file-32";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? fallbackSecret,
  cookieName: "skill-hub-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  },
};
