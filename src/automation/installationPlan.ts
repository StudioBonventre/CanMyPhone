import { compileAutomationRuntime } from "./engine";
import type { ShortcutDefinition } from "./shortcutCompiler";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry } from "./providerConnectorRegistry";
import { connectorPlanForDefinition } from "./connectorPlanning";
import type { ConnectorDiscoveryRequest } from "./connectorDiscovery";

export type InstallationPlan = {
  status: "READY" | "DISCOVERY_REQUIRED" | "SETUP_REQUIRED" | "SAFETY_REQUIRED" | "UNSUPPORTED";
  requiredProviders: string[];
  requiredPermissions: string[];
  discoveryRequests: ConnectorDiscoveryRequest[];
  resolvedHosts: Array<{ role: "trigger" | "action"; capabilityId: string; providerId: string; host: string }>;
  triggerHost: "CANMYPHONE_NATIVE" | "APPLE_PERSONAL_AUTOMATION" | "HOMEKIT" | "PROVIDER" | "MANUAL" | "UNSUPPORTED";
  actionHosts: Array<"CANMYPHONE_NATIVE" | "HOMEKIT" | "PROVIDER" | "APPLE_SHORTCUTS" | "UNSUPPORTED">;
  installationHost: ReturnType<typeof compileAutomationRuntime>["installationHost"];
  runnerIntentRequired: boolean;
  shortcutActionCount: number;
  runtimePath: string[];
};

export function installationPlanForDefinition(definition: ShortcutDefinition, connected: ReadonlySet<string> = new Set(), registry: ConnectorRegistry = connectorRegistry): InstallationPlan {
  const runtime = compileAutomationRuntime(definition, registry);
  const connectors = connectorPlanForDefinition(definition, connected, registry);
  const requiredProviders = [...new Set(connectors.requirements.flatMap(r => "provider" in r.binding ? [r.binding.provider.id] : []))];
  const resolvedHosts = connectors.requirements.flatMap(r => "provider" in r.binding ? [{ role: r.role, capabilityId: r.capabilityId, providerId: r.binding.provider.id, host: registry.getProvider(r.binding.provider.id)?.executionHost ?? "PROVIDER" }] : []);
  const triggerHost = runtime.triggerDriver === "CANMYPHONE_MANUAL" ? "MANUAL" :
    runtime.triggerDriver === "APPLE_SHORTCUTS_BRIDGE" ? "APPLE_PERSONAL_AUTOMATION" : runtime.triggerDriver;
  const actionHosts = runtime.actionDrivers.map((driver) => driver === "APPLE_SHORTCUTS_ACTION" ? "APPLE_SHORTCUTS" :
    driver === "CANMYPHONE_APP_INTENT" ? "CANMYPHONE_NATIVE" : driver === "GUIDED" ? "UNSUPPORTED" : driver);
  const runnerIntentRequired = triggerHost === "APPLE_PERSONAL_AUTOMATION" && actionHosts.some((host) => host === "CANMYPHONE_NATIVE" || host === "PROVIDER");
  const shortcutActionCount = actionHosts.filter((host) => host === "APPLE_SHORTCUTS").length;
  return {
    status: connectors.discoveryRequired ? "DISCOVERY_REQUIRED" : runtime.installationHost === "UNSUPPORTED" ? "UNSUPPORTED" : !connectors.ready ? "SETUP_REQUIRED" : definition.confirmationRequired ? "SAFETY_REQUIRED" : "READY",
    requiredProviders, requiredPermissions: definition.requiredSetup, discoveryRequests: connectors.discoveryRequests, resolvedHosts,
    triggerHost, actionHosts, installationHost: runtime.installationHost,
    runnerIntentRequired, shortcutActionCount,
    runtimePath: runtime.installationHost === "HOMEKIT" ? ["Apple Home", "HomeKit-Aktion"] :
      triggerHost === "APPLE_PERSONAL_AUTOMATION" ? ["iOS-Systemauslöser", ...(runnerIntentRequired ? ["CanMyPhone App Intent", "CanMyPhone Runner"] : []), ...(shortcutActionCount ? ["Apple-Kurzbefehle-Aktion"] : [])] :
      [triggerHost, "CanMyPhone Runner", ...actionHosts]
  };
}
