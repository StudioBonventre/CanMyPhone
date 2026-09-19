import { createTeslaRearTrunkPlan } from "./teslaPlan";
import type { AutomationPlan } from "./types";
import { validateAutomationPlan } from "./validation";

export type PlannerContext = {
  locale: string;
  connectedProviders: string[];
  grantedSignals: string[];
};

export type PlannerResponse =
  | { ok: true; plan: AutomationPlan; source: "verified-template" | "server-ai" }
  | { ok: false; code: "needs-clarification" | "unsupported" | "invalid-plan"; message: string };

function isTeslaRearTrunkGoal(goal: string): boolean {
  return /tesla/i.test(goal)
    && /(heck|kofferraum|trunk)/i.test(goal)
    && /(schlie|close)/i.test(goal)
    && /(entfern|weggeh|move away|leave)/i.test(goal);
}

/**
 * Fast deterministic compilation for verified high-value goals. Everything else
 * crosses the authenticated server planner boundary and is validated again here.
 */
export function compileVerifiedGoal(goal: string): PlannerResponse {
  const normalized = goal.trim();
  if (!normalized) return { ok: false, code: "needs-clarification", message: "Beschreibe, was wann passieren soll." };
  if (isTeslaRearTrunkGoal(normalized)) return { ok: true, plan: createTeslaRearTrunkPlan(), source: "verified-template" };
  return { ok: false, code: "unsupported", message: "Für dieses Ziel ist noch kein verifizierter lokaler Plan vorhanden." };
}

export function acceptServerPlannerOutput(input: unknown): PlannerResponse {
  const validated = validateAutomationPlan(input);
  return validated.ok
    ? { ok: true, plan: validated.plan, source: "server-ai" }
    : { ok: false, code: "invalid-plan", message: validated.errors.join("; ") };
}

export type ServerPlannerClient = {
  plan(goal: string, context: PlannerContext): Promise<unknown>;
};

export async function planGoal(goal: string, context: PlannerContext, server: ServerPlannerClient): Promise<PlannerResponse> {
  const verified = compileVerifiedGoal(goal);
  if (verified.ok) return verified;
  if (!goal.trim()) return verified;
  const proposal = await server.plan(goal, context);
  return acceptServerPlannerOutput(proposal);
}
