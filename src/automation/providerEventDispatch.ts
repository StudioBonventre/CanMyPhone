import { hasValidSafetyApproval, validateStoredAutomation, type AutomationExecutionResult, type StoredAutomation } from "./materialization";

export type VerifiedProviderEvent = {
  eventId: string;
  providerId: string;
  event: string;
  receivedAt: string;
};

export type ProviderEventDispatchResult = {
  matchedAutomationIds: string[];
  executions: AutomationExecutionResult[];
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US");

/** Dispatch only events authenticated by the connector transport. Event data
 * never becomes action parameters; the stored definition remains authoritative. */
export async function dispatchVerifiedProviderEvent(
  event: VerifiedProviderEvent,
  automations: readonly StoredAutomation[],
  execute: (automation: StoredAutomation) => Promise<AutomationExecutionResult>
): Promise<ProviderEventDispatchResult> {
  if (!event.eventId.trim() || !event.providerId.trim() || !event.event.trim() || !Number.isFinite(Date.parse(event.receivedAt))) {
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
