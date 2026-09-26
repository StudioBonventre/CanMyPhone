export type TriggerKind = "manual" | "geofence-exit" | "shortcut";
export type ConditionKind = "vehicle-state" | "authorization" | "entitlement";
export type ActionKind = "ios-public-api" | "app-intent" | "tesla-command" | "handoff";
export type ExecutionMode = "on-device" | "server" | "shortcut-handoff" | "guided";
export type RiskLevel = "low" | "medium" | "high";

export type AutomationTrigger = {
  id: string;
  kind: TriggerKind;
  capabilityId: string;
  parameters: Record<string, unknown>;
};

export type AutomationCondition = {
  id: string;
  kind: ConditionKind;
  capabilityId: string;
  parameters: Record<string, unknown>;
};

export type AutomationAction = {
  id: string;
  kind: ActionKind;
  capabilityId: string;
  parameters: Record<string, unknown>;
  sensitive: boolean;
};

export type AuthorizationRequirement = {
  id: string;
  provider: "ios" | "tesla" | "canmyphone";
  kind: "location-always" | "oauth" | "virtual-key" | "explicit-confirmation";
  reason: string;
  oneTime: boolean;
};

export type FallbackStep = {
  id: string;
  when: string;
  mode: "notify" | "confirm" | "guided" | "abort";
  message: string;
};

export type AutomationGraph = {
  version: 1;
  id: string;
  title: string;
  explanation: string[];
  triggers: AutomationTrigger[];
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  authorizations: AuthorizationRequirement[];
  executionMode: ExecutionMode;
  riskLevel: RiskLevel;
  fallbacks: FallbackStep[];
  requiresPro: boolean;
};

export type AutomationPlan = AutomationGraph & {
  status: "preview" | "authorization-needed" | "ready" | "active" | "failed";
  capabilityIds: string[];
  confirmationRequired: boolean;
};
