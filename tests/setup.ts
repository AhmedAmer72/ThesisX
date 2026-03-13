import { readFileSync } from "fs";
import { resolve } from "path";

const envFromFile: Record<string, string> = {};
try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const value = m[2].trim().replace(/\r$/, "");
      envFromFile[key] = value;
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  /* no .env */
}

process.env.DEMO_MODE = "true";
process.env.BUILDATHON_MODE = "false";
process.env.SOSO_ALLOW_DEMO = "true";
process.env.DISABLE_AUDIT_PERSIST = "true";
process.env.EXECUTION_MODE = "mock";
process.env.SOSO_HEALTH_LIVE = "false";
delete process.env.SOSOVALUE_API_KEY;
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  envFromFile.DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://thesisx:thesisx@localhost:5432/thesisx_test";
