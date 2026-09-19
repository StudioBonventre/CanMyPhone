import { matchCapabilities } from "./capabilities";
import type { AutomationPlan, RiskLevel } from "./types";

const riskRank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
const allowedRootKeys = new Set([
  "version", "id", "title", "explanation", "triggers", "conditions", "actions",
  "authorizations", "executionMode", "riskLevel", "fallbacks", "requiresPro",
  "status", "capabilityIds", "confirmationRequired"
]);

export type PlanValidation = { ok: true; plan: AutomationPlan } | { ok: false; errors: string[] };

export function validateAutomationPlan(input: unknown): PlanValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["plan must be an object"] };
  }

  const plan = input as Partial<AutomationPlan> & Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(plan)) if (!allowedRootKeys.has(key)) errors.push(`unknown field: ${key}`);
  if (plan.version !== 1) errors.push("unsupported plan version");
  if (typeof plan.id !== "string" || !plan.id) errors.push("id is required");
  if (typeof plan.title !== "string" || !plan.title) errors.push("title is required");
  if (!Array.isArray(plan.triggers) || plan.triggers.length === 0) errors.push("at least one trigger is required");
  if (!Array.isArray(plan.actions) || plan.actions.length === 0) errors.push("at least one action is required");
  if (!Array.isArray(plan.capabilityIds)) errors.push("capabilityIds are required");

  const ids = Array.isArray(plan.capabilityIds) ? plan.capabilityIds.filter((id): id is string => typeof id === "string") : [];
  const { matched, missing } = matchCapabilities(ids);
  if (missing.length) errors.push(`unsupported capabilities: ${missing.join(", ")}`);

  const actionIds = Array.isArray(plan.actions)
    ? plan.actions.map((action) => action?.capabilityId).filter((id): id is string => typeof id === "string")
    : [];
  const undeclared = actionIds.filter((id) => !ids.includes(id));
  if (undeclared.length) errors.push(`actions use undeclared capabilities: ${undeclared.join(", ")}`);

  const maxCapabilityRisk = matched.reduce((max, item) => Math.max(max, riskRank[item.riskLevel]), 0);
  const declaredRisk = plan.riskLevel && plan.riskLevel in riskRank ? riskRank[plan.riskLevel as RiskLevel] : -1;
  if (declaredRisk < maxCapabilityRisk) errors.push("risk level understates a capability");

  const hasSensitiveAction = Array.isArray(plan.actions) && plan.actions.some((action) => action?.sensitive === true);
  if (hasSensitiveAction && plan.confirmationRequired !== true) errors.push("sensitive actions require confirmation");

  return errors.length ? { ok: false, errors } : { ok: true, plan: plan as AutomationPlan };
}
