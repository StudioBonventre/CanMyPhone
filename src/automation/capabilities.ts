import type { ActionKind, ExecutionMode, RiskLevel, TriggerKind } from "./types";

export type Capability = {
  id: string;
  provider: "ios" | "shortcuts" | "tesla";
  operation: TriggerKind | ActionKind | "read-vehicle-state";
  executionMode: ExecutionMode;
  riskLevel: RiskLevel;
  requiresPro: boolean;
  publicApi: boolean;
};

export const CAPABILITIES: readonly Capability[] = [
  {
    id: "ios.core-location.geofence-exit",
    provider: "ios",
    operation: "geofence-exit",
    executionMode: "on-device",
    riskLevel: "medium",
    requiresPro: true,
    publicApi: true
  },
  {
    id: "shortcuts.app-intent.run-plan",
    provider: "shortcuts",
    operation: "app-intent",
    executionMode: "shortcut-handoff",
    riskLevel: "low",
    requiresPro: false,
    publicApi: true
  },
  {
    id: "tesla.fleet-api.vehicle-state",
    provider: "tesla",
    operation: "read-vehicle-state",
    executionMode: "server",
    riskLevel: "medium",
    requiresPro: true,
    publicApi: true
  },
  {
    id: "tesla.fleet-api.actuate-rear-trunk",
    provider: "tesla",
    operation: "tesla-command",
    executionMode: "server",
    riskLevel: "high",
    requiresPro: true,
    publicApi: true
  }
] as const;

export function capabilityById(id: string): Capability | undefined {
  return CAPABILITIES.find((capability) => capability.id === id);
}

export function matchCapabilities(ids: string[]): { matched: Capability[]; missing: string[] } {
  const matched = ids.map(capabilityById).filter((item): item is Capability => Boolean(item));
  const found = new Set(matched.map((item) => item.id));
  return { matched, missing: ids.filter((id) => !found.has(id)) };
}
