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
  | { ok: false; code: "needs-clarification"; message: string; clarificationQuestion: string }
  | { ok: false; code: "unsupported" | "invalid-plan" | "timeout" | "server-error" | "not-authenticated"; message: string };

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
  if (!normalized) return { ok: false, code: "needs-clarification", message: "Ich brauche noch eine Angabe.", clarificationQuestion: "Was soll wann passieren?" };
  if (isTeslaRearTrunkGoal(normalized)) return { ok: true, plan: createTeslaRearTrunkPlan(), source: "verified-template" };
  return { ok: false, code: "unsupported", message: "Für dieses Ziel ist noch kein verifizierter lokaler Plan vorhanden." };
}

export function acceptServerPlannerOutput(input: unknown): PlannerResponse {
  if (input && typeof input === "object" && "clarificationNeeded" in input && (input as {clarificationNeeded?:unknown}).clarificationNeeded === true) {
    const question = (input as {clarificationQuestion?:unknown}).clarificationQuestion;
    return typeof question === "string" && question.trim()
      ? { ok:false, code:"needs-clarification", message:"Ich brauche noch eine Angabe.", clarificationQuestion:question }
      : { ok:false, code:"invalid-plan", message:"Diese Automation kann ich noch nicht sicher erstellen." };
  }
  const candidate = input && typeof input === "object" && "plan" in input ? (input as {plan:unknown}).plan : input;
  const validated = validateAutomationPlan(candidate);
  return validated.ok
    ? { ok: true, plan: validated.plan, source: "server-ai" }
    : { ok: false, code: "invalid-plan", message: "Diese Automation kann ich noch nicht sicher erstellen." };
}

export type ServerPlannerClient = {
  plan(goal: string, context: PlannerContext): Promise<unknown>;
};

export async function planGoal(goal: string, context: PlannerContext, server: ServerPlannerClient): Promise<PlannerResponse> {
  const verified = compileVerifiedGoal(goal);
  if (verified.ok) return verified;
  if (!goal.trim()) return verified;
  try { return acceptServerPlannerOutput(await server.plan(goal, context)); }
  catch (error) {
    const code = error instanceof Error ? error.message : "server-error";
    if (code === "timeout") return { ok:false, code:"timeout", message:"Die Planung dauert gerade zu lange. Bitte versuche es erneut." };
    if (code === "not-authenticated") return { ok:false, code:"not-authenticated", message:"Bitte melde dich erneut an, damit ich sicher planen kann." };
    return { ok:false, code:"server-error", message:"Der sichere Planner ist gerade nicht erreichbar." };
  }
}
