import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  oauthState?: string;
};

/** Production deployments must set SESSION_SECRET with at least 32 characters. */
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
