import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

function loadEnvFile() {
  try {
    const raw = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim();
      }
    }
  } catch {
    /* no .env */
  }
}

export default function globalSetup() {
  loadEnvFile();

  const testDb =
    process.env.TEST_DATABASE_URL?.trim() ??
    process.env.DATABASE_URL?.trim() ??
    "";

  if (!testDb.startsWith("postgres")) {
    console.warn(
      "[vitest] Skipping prisma db push — set TEST_DATABASE_URL (postgresql) for DB integration tests."
    );
    return;
  }

  process.env.DATABASE_URL = testDb;
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: testDb },
    stdio: "pipe",
  });
}
