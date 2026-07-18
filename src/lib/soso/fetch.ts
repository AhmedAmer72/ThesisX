export const SOSO_API_ROOT =
  process.env.SOSOVALUE_BASE_URL?.replace(/\/openapi\/v1\/?$/, "") ??
  "https://openapi.sosovalue.com";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function hasSosoApiKey(): boolean {
  return Boolean(process.env.SOSOVALUE_API_KEY?.trim());
}

export { isLiveIntelligenceRequired } from "@/lib/buildathon";

function parseApiPayload(raw: unknown): FetchResult<unknown> {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.code === "number" && o.code !== 0) {
      return {
        ok: false,
        error: String(o.message ?? o.msg ?? `api_code_${o.code}`),
      };
    }
    if ("data" in o) return { ok: true, data: o.data };
  }
  return { ok: true, data: raw };
}

/** Keep snowflake currency IDs exact — JSON.parse would round them as numbers. */
function parseJsonPreservingIds(text: string): unknown {
  const safe = text.replace(
    /"(currencyId|currency_id)"\s*:\s*(\d{15,})/g,
    '"$1":"$2"'
  );
  return JSON.parse(safe);
}

async function request(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<FetchResult<unknown>> {
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return { ok: false, error: "missing_api_key" };

  const url = `${SOSO_API_ROOT}${path.startsWith("/") ? path : `/${path}`}`;
  let attempt = 0;
  while (attempt < 4) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "x-soso-api-key": key,
          Accept: "application/json",
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        cache: "no-store",
      });

      if (res.status === 429 || res.status >= 500) {
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }

      if (!res.ok) {
        return { ok: false, error: `http_${res.status}` };
      }

      const text = await res.text();
      const json = parseJsonPreservingIds(text);
      return parseApiPayload(json);
    } catch (e) {
      attempt++;
      if (attempt >= 4) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "fetch_failed",
        };
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return { ok: false, error: "max_retries" };
}

export async function sosoGet(path: string): Promise<FetchResult<unknown>> {
  return request("GET", path);
}

export async function sosoPost(
  path: string,
  body: Record<string, unknown> = {}
): Promise<FetchResult<unknown>> {
  return request("POST", path, body);
}

/** @deprecated Use sosoGet/sosoPost with full paths from SOSO_API_ROOT */
export async function sosoFetch(path: string): Promise<FetchResult<unknown>> {
  return sosoGet(`/openapi/v1${path.startsWith("/") ? path : `/${path}`}`);
}
