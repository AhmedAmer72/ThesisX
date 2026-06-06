import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export type LogLevel = "info" | "warn" | "error";

export function logRequest(
  label: string,
  meta?: Record<string, unknown>
): string {
  const requestId = randomUUID().slice(0, 8);
  const payload = {
    requestId,
    label,
    ts: new Date().toISOString(),
    ...meta,
  };
  if (process.env.NODE_ENV !== "test") {
    console.info("[thesisx]", JSON.stringify(payload));
  }
  void persistAudit("info", "http", label, requestId, undefined, meta);
  return requestId;
}

export function logAiRun(
  fundId: string,
  stage: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    fundId,
    stage,
    ts: new Date().toISOString(),
    ...meta,
  };
  if (process.env.NODE_ENV !== "test") {
    console.info("[thesisx:ai]", JSON.stringify(entry));
  }
  void persistAudit("info", "ai", stage, undefined, fundId, meta);
}

export function logExecution(
  fundId: string,
  message: string,
  meta?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "test") {
    console.info(
      "[thesisx:execution]",
      JSON.stringify({ fundId, message, ts: new Date().toISOString(), ...meta })
    );
  }
  void persistAudit("info", "execution", message, undefined, fundId, meta);
}

export function logError(
  category: string,
  message: string,
  meta?: Record<string, unknown>,
  requestId?: string,
  fundId?: string
) {
  console.error(
    "[thesisx:error]",
    JSON.stringify({
      category,
      message,
      requestId,
      fundId,
      ts: new Date().toISOString(),
      ...meta,
    })
  );
  void persistAudit("error", category, message, requestId, fundId, meta);
}

/** Sentry-compatible exception capture (logs + optional SDK). */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>
) {
  const message = err instanceof Error ? err.message : String(err);
  logError("exception", message, {
    stack: err instanceof Error ? err.stack : undefined,
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
    ...context,
  });
}

export function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  if (process.env.NODE_ENV !== "test") {
    console.info(
      "[thesisx:metric]",
      JSON.stringify({
        name,
        value,
        tags,
        ts: new Date().toISOString(),
      })
    );
  }
}

async function persistAudit(
  level: LogLevel,
  category: string,
  message: string,
  requestId?: string,
  fundId?: string,
  meta?: Record<string, unknown>
) {
  if (process.env.DISABLE_AUDIT_PERSIST === "true") return;
  try {
    await prisma.auditLog.create({
      data: {
        level,
        category,
        message,
        requestId,
        fundId,
        metadataJson: JSON.stringify(meta ?? {}),
      },
    });
  } catch {
    /* db may be unavailable during bootstrap */
  }
}
