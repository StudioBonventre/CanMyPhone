import { hasValidSafetyApproval, validateStoredAutomation, type AutomationExecutionResult, type StoredAutomation } from "./materialization";
import { validateSchemaValue, type ConnectorRegistry } from "./providerConnectorRegistry";
import { connectorRegistry } from "./builtinConnectorManifests";

export type VerifiedProviderEvent = {
  eventId: string;
  providerId: string;
  event: string;
  receivedAt: string;
};

export type ProviderEventVerification = {
  verified: true;
  method: "WEBHOOK_SIGNATURE" | "WEBSOCKET_SESSION" | "LOCAL_SESSION" | "SERVER_AUTH";
  verifiedAt: string;
};

export type NormalizedProviderEvent = {
  eventId: string;
  providerId: string;
  installationId: string;
  deviceId?: string;
  deviceName?: string;
  room?: string;
  capabilityId: string;
  eventType: string;
  normalizedPayload: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
  verification: ProviderEventVerification;
};

export type RawProviderEvent = {
  providerId: string;
  installationId: string;
  headers: Readonly<Record<string, string | undefined>>;
  body: unknown;
  receivedAt: string;
};

export type ProviderEventVerifier = (raw: RawProviderEvent) => Promise<NormalizedProviderEvent | null>;

export interface ProviderEventReceiptStore {
  /** Atomically returns true only for the first claim of a key until expiresAt. */
  claim(key: string, expiresAt: string): Promise<boolean>;
}

export class MemoryProviderEventReceiptStore implements ProviderEventReceiptStore {
  private readonly receipts = new Map<string, number>();

  async claim(key: string, expiresAt: string): Promise<boolean> {
    const now = Date.now();
    for (const [storedKey, expiry] of this.receipts) if (expiry <= now) this.receipts.delete(storedKey);
    const expiry = Date.parse(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now || this.receipts.has(key)) return false;
    this.receipts.set(key, expiry);
    return true;
  }
}

export type ProviderEventDispatchResult = {
  matchedAutomationIds: string[];
  executions: AutomationExecutionResult[];
};

export type ProviderEventIngestResult =
  | { accepted: true; duplicate: false; event: NormalizedProviderEvent; dispatch: ProviderEventDispatchResult }
  | { accepted: false; duplicate: boolean; code: string };

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");
const validTimestamp = (value: string) => Number.isFinite(Date.parse(value));

function validNormalizedProviderEvent(event: NormalizedProviderEvent, registry: ConnectorRegistry, now: Date, maxAgeMs: number, futureSkewMs: number): boolean {
  if (
    !event.eventId.trim() ||
    !event.providerId.trim() ||
    !event.installationId.trim() ||
    !event.capabilityId.trim() ||
    !event.eventType.trim() ||
    !validTimestamp(event.occurredAt) ||
    !validTimestamp(event.receivedAt) ||
    !validTimestamp(event.verification.verifiedAt) ||
    event.verification.verified !== true
  ) return false;

  const occurredAt = Date.parse(event.occurredAt);
  const receivedAt = Date.parse(event.receivedAt);
  const verifiedAt = Date.parse(event.verification.verifiedAt);
  const nowMs = now.getTime();
  if (occurredAt < nowMs - maxAgeMs || occurredAt > nowMs + futureSkewMs) return false;
  if (receivedAt < occurredAt - futureSkewMs || receivedAt > nowMs + futureSkewMs) return false;
  if (verifiedAt < receivedAt - futureSkewMs || verifiedAt > nowMs + futureSkewMs) return false;

  const manifest = registry.getProvider(normalize(event.providerId));
  if (!manifest || !registry.listReadyProviders().some(item => item.providerId === manifest.providerId)) return false;
  if (manifest.eventInstallationSupported !== true || !manifest.triggers.includes(event.capabilityId)) return false;
  const schema = manifest.eventSchemas[event.capabilityId];
  return Boolean(schema && validateSchemaValue(schema, event.normalizedPayload));
}

/**
 * Authenticates, normalizes and deduplicates an external event before it may
 * reach stored automations. Provider-specific raw payload never becomes action
 * parameters; the stored automation definition remains authoritative.
 */
export async function ingestProviderEvent(
  raw: RawProviderEvent,
  automations: readonly StoredAutomation[],
  execute: (automation: StoredAutomation) => Promise<AutomationExecutionResult>,
  options: {
    verifier: ProviderEventVerifier;
    receipts: ProviderEventReceiptStore;
    registry?: ConnectorRegistry;
    now?: Date;
    maxAgeMs?: number;
    futureSkewMs?: number;
    dedupeTtlMs?: number;
  }
): Promise<ProviderEventIngestResult> {
  if (!raw.providerId.trim() || !raw.installationId.trim() || !validTimestamp(raw.receivedAt)) {
    return { accepted: false, duplicate: false, code: "INVALID_PROVIDER_EVENT_ENVELOPE" };
  }

  const event = await options.verifier(raw);
  if (!event || normalize(event.providerId) !== normalize(raw.providerId) || event.installationId !== raw.installationId) {
    return { accepted: false, duplicate: false, code: "PROVIDER_EVENT_VERIFICATION_FAILED" };
  }

  const registry = options.registry ?? connectorRegistry;
  const now = options.now ?? new Date();
  if (!validNormalizedProviderEvent(event, registry, now, options.maxAgeMs ?? 5 * 60_000, options.futureSkewMs ?? 60_000)) {
    return { accepted: false, duplicate: false, code: "PROVIDER_EVENT_NOT_TRUSTED" };
  }

  const dedupeKey = [normalize(event.providerId), event.installationId, event.eventId].join(":");
  const claimed = await options.receipts.claim(dedupeKey, new Date(now.getTime() + (options.dedupeTtlMs ?? 24 * 60 * 60_000)).toISOString());
  if (!claimed) return { accepted: false, duplicate: true, code: "PROVIDER_EVENT_DUPLICATE" };

  const dispatch = await dispatchNormalizedProviderEvent(event, automations, execute);
  return { accepted: true, duplicate: false, event, dispatch };
}

function targetMatches(parameters: Record<string, string | number | boolean>, event: NormalizedProviderEvent): boolean {
  const provider = typeof parameters.provider === "string" ? normalize(parameters.provider) : "";
  if (provider && provider !== normalize(event.providerId)) return false;
  const device = typeof parameters.device === "string" ? normalize(parameters.device) : "";
  if (device && ![event.deviceId, event.deviceName].some(value => typeof value === "string" && normalize(value) === device)) return false;
  const room = typeof parameters.room === "string" ? normalize(parameters.room) : "";
  if (room && (typeof event.room !== "string" || normalize(event.room) !== room)) return false;
  if (typeof parameters.value === "boolean" && event.normalizedPayload.value !== parameters.value) return false;
  return true;
}

/** Matches the provider-neutral capability first. Legacy trigger.provider-event
 * definitions remain supported while old saved automations are migrated. */
export async function dispatchNormalizedProviderEvent(
  event: NormalizedProviderEvent,
  automations: readonly StoredAutomation[],
  execute: (automation: StoredAutomation) => Promise<AutomationExecutionResult>
): Promise<ProviderEventDispatchResult> {
  const providerId = normalize(event.providerId);
  const eventName = normalize(event.eventType);
  const matches = automations.filter((automation) => {
    if (!validateStoredAutomation(automation) || !automation.enabled || !hasValidSafetyApproval(automation)) return false;
    const trigger = automation.definition.trigger;
    if (trigger.capabilityId === event.capabilityId) return targetMatches(trigger.parameters, event);
    if (trigger.capabilityId !== "trigger.provider-event") return false;
    const parameters = trigger.parameters;
    return normalize(String(parameters.provider ?? "")) === providerId && normalize(String(parameters.event ?? "")) === eventName;
  });
  const executions: AutomationExecutionResult[] = [];
  for (const automation of matches) executions.push(await execute(automation));
  return { matchedAutomationIds: matches.map(({ id }) => id), executions };
}

/** Dispatch only events already authenticated by the connector transport. Event
 * data never becomes action parameters; the stored definition remains authoritative.
 * Prefer ingestProviderEvent at external trust boundaries. */
export async function dispatchVerifiedProviderEvent(
  event: VerifiedProviderEvent,
  automations: readonly StoredAutomation[],
  execute: (automation: StoredAutomation) => Promise<AutomationExecutionResult>
): Promise<ProviderEventDispatchResult> {
  if (!event.eventId.trim() || !event.providerId.trim() || !event.event.trim() || !validTimestamp(event.receivedAt)) {
    throw new Error("INVALID_VERIFIED_PROVIDER_EVENT");
  }
  const providerId = normalize(event.providerId);
  const eventName = normalize(event.event);
  const matches = automations.filter((automation) => {
    if (!validateStoredAutomation(automation) || !automation.enabled || !hasValidSafetyApproval(automation) || automation.definition.trigger.capabilityId !== "trigger.provider-event") return false;
    const parameters = automation.definition.trigger.parameters;
    return normalize(String(parameters.provider ?? "")) === providerId && normalize(String(parameters.event ?? "")) === eventName;
  });
  const executions: AutomationExecutionResult[] = [];
  for (const automation of matches) executions.push(await execute(automation));
  return { matchedAutomationIds: matches.map(({ id }) => id), executions };
}
