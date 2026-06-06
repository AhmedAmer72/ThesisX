process.env.DEMO_MODE = "true";
process.env.BUILDATHON_MODE = "false";
process.env.SOSO_ALLOW_DEMO = "true";
process.env.DISABLE_AUDIT_PERSIST = "true";
process.env.EXECUTION_MODE = "mock";
process.env.SOSO_HEALTH_LIVE = "false";
delete process.env.SOSOVALUE_API_KEY;process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://thesisx:thesisx@localhost:5432/thesisx_test";
