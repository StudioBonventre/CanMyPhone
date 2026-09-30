import { matchCapabilities } from "./capabilities";
import type { AutomationPlan, RiskLevel } from "./types";

const riskRank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
const rootKeys = ["version", "id", "title", "explanation", "triggers", "conditions", "actions", "authorizations", "executionMode", "riskLevel", "fallbacks", "requiresPro", "status", "capabilityIds", "confirmationRequired"];
const nodeKeys = { trigger: ["id", "kind", "capabilityId", "parameters"], condition: ["id", "kind", "capabilityId", "parameters"], action: ["id", "kind", "capabilityId", "parameters", "sensitive"] };
export type PlanValidation = { ok: true; plan: AutomationPlan } | { ok: false; errors: string[] };

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, allowed: string[], path: string, errors: string[]) { for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}: unknown field ${key}`); }
function text(value: unknown, path: string, errors: string[]) { if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string`); }
function oneOf(value: unknown, allowed: readonly unknown[], path: string, errors: string[]) { if (!allowed.includes(value)) errors.push(`${path} has an unsupported value`); }

function parameters(capabilityId: unknown, value: unknown, path: string, errors: string[]) {
  if (!object(value)) return void errors.push(`${path} must be an object`);
  if (capabilityId === "ios.core-location.geofence-exit") {
    exact(value, ["radiusMeters", "centerSource"], path, errors);
    if (typeof value.radiusMeters !== "number" || !Number.isFinite(value.radiusMeters) || value.radiusMeters < 100 || value.radiusMeters > 1000) errors.push(`${path}.radiusMeters must be between 100 and 1000`);
    oneOf(value.centerSource, ["parked-vehicle-location", "user-selected-place"], `${path}.centerSource`, errors);
  } else if (capabilityId === "tesla.fleet-api.vehicle-state") {
    const scopeCheck = "scopes" in value;
    exact(value, scopeCheck ? ["scopes"] : ["field", "equals"], path, errors);
    if (scopeCheck) {
      if (!Array.isArray(value.scopes) || value.scopes.length === 0 || value.scopes.some((scope) => !["vehicle_device_data", "vehicle_cmds"].includes(String(scope)))) errors.push(`${path}.scopes contains an unsupported Tesla scope`);
    } else {
      oneOf(value.field, ["rt"], `${path}.field`, errors);
      oneOf(value.equals, [1], `${path}.equals`, errors);
    }
  } else if (capabilityId === "tesla.fleet-api.actuate-rear-trunk") {
    const entitlement = "product" in value;
    exact(value, entitlement ? ["product"] : ["endpoint", "whichTrunk", "expectedPriorState"], path, errors);
    if (entitlement) oneOf(value.product, ["pro"], `${path}.product`, errors);
    else {
      oneOf(value.endpoint, ["actuate_trunk"], `${path}.endpoint`, errors);
      oneOf(value.whichTrunk, ["rear"], `${path}.whichTrunk`, errors);
      oneOf(value.expectedPriorState, ["open"], `${path}.expectedPriorState`, errors);
    }
  } else if (capabilityId === "shortcuts.app-intent.run-plan") {
    exact(value, ["planId"], path, errors); text(value.planId, `${path}.planId`, errors);
  } else errors.push(`${path}: parameters cannot be validated for an unknown capability`);
}

function nodes(value: unknown, kind: keyof typeof nodeKeys, errors: string[]) {
  if (!Array.isArray(value) || (kind !== "condition" && value.length === 0)) return void errors.push(`${kind}s must be ${kind === "condition" ? "an array" : "a non-empty array"}`);
  const kinds = kind === "trigger" ? ["manual", "geofence-exit", "shortcut"] : kind === "condition" ? ["vehicle-state", "authorization", "entitlement"] : ["ios-public-api", "app-intent", "tesla-command", "handoff"];
  value.forEach((node, index) => {
    const path = `${kind}s[${index}]`;
    if (!object(node)) return errors.push(`${path} must be an object`);
    exact(node, nodeKeys[kind], path, errors); text(node.id, `${path}.id`, errors); text(node.capabilityId, `${path}.capabilityId`, errors); oneOf(node.kind, kinds, `${path}.kind`, errors);
    if (kind === "action" && typeof node.sensitive !== "boolean") errors.push(`${path}.sensitive must be boolean`);
    parameters(node.capabilityId, node.parameters, `${path}.parameters`, errors);
  });
}

export function validateAutomationPlan(input: unknown): PlanValidation {
  if (!object(input)) return { ok: false, errors: ["plan must be an object"] };
  const errors: string[] = []; exact(input, rootKeys, "plan", errors);
  if (input.version !== 1) errors.push("unsupported plan version");
  text(input.id, "id", errors); text(input.title, "title", errors);
  if (!Array.isArray(input.explanation) || input.explanation.some((item) => typeof item !== "string" || !item.trim())) errors.push("explanation must contain non-empty strings");
  nodes(input.triggers, "trigger", errors); nodes(input.conditions, "condition", errors); nodes(input.actions, "action", errors);
  if (!Array.isArray(input.authorizations)) errors.push("authorizations must be an array");
  else input.authorizations.forEach((item, index) => {
    const path = `authorizations[${index}]`; if (!object(item)) return errors.push(`${path} must be an object`);
    exact(item, ["id", "provider", "kind", "reason", "oneTime"], path, errors); text(item.id, `${path}.id`, errors); text(item.reason, `${path}.reason`, errors);
    oneOf(item.provider, ["ios", "tesla", "canmyphone"], `${path}.provider`, errors); oneOf(item.kind, ["location-always", "oauth", "virtual-key", "explicit-confirmation"], `${path}.kind`, errors);
    if (typeof item.oneTime !== "boolean") errors.push(`${path}.oneTime must be boolean`);
  });
  if (!Array.isArray(input.fallbacks)) errors.push("fallbacks must be an array");
  else input.fallbacks.forEach((item, index) => {
    const path = `fallbacks[${index}]`; if (!object(item)) return errors.push(`${path} must be an object`);
    exact(item, ["id", "when", "mode", "message"], path, errors); text(item.id, `${path}.id`, errors); text(item.when, `${path}.when`, errors); text(item.message, `${path}.message`, errors); oneOf(item.mode, ["notify", "confirm", "guided", "abort"], `${path}.mode`, errors);
  });
  oneOf(input.executionMode, ["on-device", "server", "shortcut-handoff", "guided"], "executionMode", errors); oneOf(input.riskLevel, ["low", "medium", "high"], "riskLevel", errors); oneOf(input.status, ["preview", "authorization-needed", "ready", "active", "failed"], "status", errors);
  if (typeof input.requiresPro !== "boolean") errors.push("requiresPro must be boolean"); if (typeof input.confirmationRequired !== "boolean") errors.push("confirmationRequired must be boolean");
  if (!Array.isArray(input.capabilityIds) || input.capabilityIds.some((id) => typeof id !== "string")) errors.push("capabilityIds must contain strings");
  const ids = Array.isArray(input.capabilityIds) ? input.capabilityIds.filter((id): id is string => typeof id === "string") : [];
  const { matched, missing } = matchCapabilities(ids); if (missing.length) errors.push(`unsupported capabilities: ${missing.join(", ")}`);
  const allNodes = [...(Array.isArray(input.triggers) ? input.triggers : []), ...(Array.isArray(input.conditions) ? input.conditions : []), ...(Array.isArray(input.actions) ? input.actions : [])];
  const undeclared = allNodes.filter(object).map((node) => node.capabilityId).filter((id): id is string => typeof id === "string" && !ids.includes(id)); if (undeclared.length) errors.push(`nodes use undeclared capabilities: ${[...new Set(undeclared)].join(", ")}`);
  const maxRisk = matched.reduce((max, item) => Math.max(max, riskRank[item.riskLevel]), 0); const declaredRisk = typeof input.riskLevel === "string" && input.riskLevel in riskRank ? riskRank[input.riskLevel as RiskLevel] : -1; if (declaredRisk < maxRisk) errors.push("risk level understates a capability");
  const sensitive = Array.isArray(input.actions) && input.actions.some((action) => object(action) && action.sensitive === true); if (sensitive && input.confirmationRequired !== true) errors.push("sensitive actions require confirmation");
  return errors.length ? { ok: false, errors } : { ok: true, plan: input as unknown as AutomationPlan };
}
