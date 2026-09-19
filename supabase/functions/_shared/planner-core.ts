export type PlannerEnvelope = {
  intent: string;
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
  confidence: number;
  plan: Record<string, unknown> | null;
};

export const capabilitySummary = [
  "ios.core-location.geofence-exit: trigger; radiusMeters 100..1000; centerSource parked-vehicle-location|user-selected-place; risk medium; Pro",
  "shortcuts.app-intent.run-plan: action; planId non-empty; risk low; free",
  "tesla.fleet-api.vehicle-state: condition; scopes vehicle_device_data|vehicle_cmds OR field rt equals 1; risk medium; Pro",
  "tesla.fleet-api.actuate-rear-trunk: action; endpoint actuate_trunk; whichTrunk rear; expectedPriorState open; sensitive; risk high; Pro"
].join("\n");

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, allowed: string[]) { return Object.keys(value).every((key) => allowed.includes(key)); }

export function validatePortablePlan(plan: unknown): boolean {
  if (!object(plan) || !exact(plan, ["version","id","title","explanation","triggers","conditions","actions","authorizations","executionMode","riskLevel","fallbacks","requiresPro","status","capabilityIds","confirmationRequired"])) return false;
  if (plan.version !== 1 || typeof plan.id !== "string" || typeof plan.title !== "string" || !Array.isArray(plan.triggers) || !Array.isArray(plan.conditions) || !Array.isArray(plan.actions) || !Array.isArray(plan.authorizations) || !Array.isArray(plan.fallbacks) || !Array.isArray(plan.capabilityIds)) return false;
  const known = new Set(["ios.core-location.geofence-exit","shortcuts.app-intent.run-plan","tesla.fleet-api.vehicle-state","tesla.fleet-api.actuate-rear-trunk"]);
  if (plan.capabilityIds.some((id) => typeof id !== "string" || !known.has(id))) return false;
  const nodes = [...plan.triggers, ...plan.conditions, ...plan.actions];
  if (nodes.some((node) => !object(node) || typeof node.capabilityId !== "string" || !known.has(node.capabilityId) || !object(node.parameters))) return false;
  for (const node of nodes as Record<string, unknown>[]) {
    const p = node.parameters as Record<string, unknown>;
    if (node.capabilityId === "ios.core-location.geofence-exit" && (!exact(p,["radiusMeters","centerSource"]) || typeof p.radiusMeters !== "number" || p.radiusMeters < 100 || p.radiusMeters > 1000 || !["parked-vehicle-location","user-selected-place"].includes(String(p.centerSource)))) return false;
    if (node.capabilityId === "tesla.fleet-api.actuate-rear-trunk" && "endpoint" in p && (!exact(p,["endpoint","whichTrunk","expectedPriorState"]) || p.endpoint !== "actuate_trunk" || p.whichTrunk !== "rear" || p.expectedPriorState !== "open")) return false;
  }
  const risk = { low: 0, medium: 1, high: 2 } as const;
  const requiredRisk = plan.capabilityIds.includes("tesla.fleet-api.actuate-rear-trunk") ? 2 : plan.capabilityIds.includes("ios.core-location.geofence-exit") || plan.capabilityIds.includes("tesla.fleet-api.vehicle-state") ? 1 : 0;
  if (!(String(plan.riskLevel) in risk) || risk[plan.riskLevel as keyof typeof risk] < requiredRisk) return false;
  if (plan.actions.some((action) => object(action) && action.sensitive === true) && plan.confirmationRequired !== true) return false;
  return true;
}

export function validatePlannerEnvelope(value: unknown): { ok: true; value: PlannerEnvelope } | { ok: false; code: string } {
  if (!object(value) || !exact(value, ["intent","clarificationNeeded","clarificationQuestion","confidence","plan"])) return { ok: false, code: "invalid_model_output" };
  if (typeof value.intent !== "string" || typeof value.clarificationNeeded !== "boolean" || typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) return { ok: false, code: "invalid_model_output" };
  if (value.clarificationNeeded) {
    if (typeof value.clarificationQuestion !== "string" || !value.clarificationQuestion.trim() || value.plan !== null) return { ok: false, code: "invalid_clarification" };
  } else if (value.clarificationQuestion !== null || !validatePortablePlan(value.plan)) return { ok: false, code: "invalid_plan" };
  return { ok: true, value: value as PlannerEnvelope };
}

export function safeLogFields(requestId: string, result: "ok"|"clarification"|"error", code?: string) { return { requestId, result, ...(code ? { code } : {}) }; }

export function hasBearerAuthorization(header: string | null): boolean {
  return typeof header === "string" && /^Bearer\s+\S+$/.test(header);
}
