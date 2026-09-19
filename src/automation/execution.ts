import type { AutomationPlan, FallbackStep } from "./types";
import { validateAutomationPlan } from "./validation";

export type ProviderResult = { ok: true; confirmed: true } | { ok: false; code: string; message?: string };
export type AutomationProvider = { execute(plan: AutomationPlan): Promise<ProviderResult> };

export function fallbackFor(plan: AutomationPlan, code: string): FallbackStep | undefined {
  const normalized = code.toLowerCase();
  if (normalized.includes("state")) return plan.fallbacks.find((item) => item.id === "unknown-state");
  if (normalized.includes("asleep")) return plan.fallbacks.find((item) => item.id === "vehicle-asleep");
  return plan.fallbacks.find((item) => item.id === "command-failed");
}

export async function executeValidatedPlan(plan: AutomationPlan, provider: AutomationProvider, confirmed: boolean) {
  const validation = validateAutomationPlan(plan);
  if (!validation.ok) return { ok: false as const, message: validation.errors.join("; ") };
  if (plan.confirmationRequired && !confirmed) return { ok: false as const, message: "Bestätigung erforderlich." };
  const result = await provider.execute(plan);
  if (result.ok) return { ok: true as const, message: "Ausführung wurde vom Anbieter bestätigt." };
  const fallback = fallbackFor(plan, result.code);
  return { ok: false as const, message: fallback?.message ?? result.message ?? "Ausführung fehlgeschlagen." };
}
