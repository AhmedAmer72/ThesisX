/**
 * Product analytics — PostHog-compatible event sink.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  const payload = { name, properties: properties ?? {}, ts: Date.now() };
  if (process.env.NODE_ENV !== "test") {
    console.info("[analytics]", JSON.stringify(payload));
  }
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    const w = window as Window & {
      posthog?: { capture: (n: string, p?: Record<string, unknown>) => void };
    };
    w.posthog?.capture(name, properties);
  }
}
