import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  if (!key) return; // silently skip in dev if not configured

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we fire page views manually
    autocapture: false,
    persistence: "localStorage",
  });
}

export { posthog };
