import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const backendRoot = __dirname;
const repoRoot = path.resolve(backendRoot, "..");

const envCandidates = [
  path.join(backendRoot, ".env.test"),
  path.join(backendRoot, ".env"),
  path.join(repoRoot, ".env.test"),
  path.join(repoRoot, ".env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const env = process.env as Record<string, string | undefined>;

env.NODE_ENV = env.NODE_ENV || "test";
env.SESSION_SECRET = env.SESSION_SECRET || "test-session-secret";
env.DATABASE_URL = env.DATABASE_URL || `file:${path.join(backendRoot, "dev.db")}`;
