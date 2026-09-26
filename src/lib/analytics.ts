export type ProductEvent =
  | "request_submitted" | "plan_created" | "plan_failed" | "authorization_needed"
  | "automation_created" | "automation_run" | "automation_failed"
  | "suggestion_shown" | "suggestion_accepted" | "suggestion_dismissed"
  | "paywall_opened" | "purchase_success" | "purchase_failed"
  | "automation_materialization_started" | "automation_handoff_opened"
  | "automation_saved_waiting_for_apple_setup"
  | "automation_setup_confirmed" | "automation_setup_cancelled"
  | "automation_enabled" | "automation_disabled"
  | "automation_run_success" | "automation_run_failed";

export type SafeEventProperties = Record<string, string | number | boolean | null>;

const forbiddenKeys = /(^|_)(text|query|prompt|message|transcript|vin|location|latitude|longitude)($|_)/i;

export function sanitizeEventProperties(properties: SafeEventProperties): SafeEventProperties {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => !forbiddenKeys.test(key)));
}

/** Adapter boundary for PostHog. Raw user requests are deliberately not accepted. */
export function trackProductEvent(event: ProductEvent, properties: SafeEventProperties = {}): void {
  const safe = sanitizeEventProperties(properties);
  void event;
  void safe;
  // The concrete PostHog client is injected at app bootstrap once a project key is configured.
}
