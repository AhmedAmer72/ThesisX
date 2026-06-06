import { execSync } from "child_process";
import path from "path";

export default function globalSetup() {
  const dbPath = path
    .join(__dirname, "../prisma/test.db")
    .replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "pipe",
  });
}
