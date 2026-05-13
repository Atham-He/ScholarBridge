import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default async function globalSetup() {
  const backendRoot = path.resolve(__dirname, "../..");
  const dbUrl = process.env.E2E_DATABASE_URL ?? "file:./prisma/e2e.db";
  const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice("file:".length) : null;

  if (dbPath) {
    const resolvedDbPath = path.resolve(backendRoot, dbPath);
    if (fs.existsSync(resolvedDbPath)) {
      fs.rmSync(resolvedDbPath, { force: true });
    }
  }

  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
  };

  execSync("npx prisma db push --force-reset --skip-generate", {
    cwd: backendRoot,
    stdio: "inherit",
    env,
  });

  execSync("npx prisma db seed", {
    cwd: backendRoot,
    stdio: "inherit",
    env,
  });
}
