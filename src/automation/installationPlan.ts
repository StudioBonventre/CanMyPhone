import { compileAutomationRuntime } from "./engine";
import type { ShortcutDefinition } from "./shortcutCompiler";

export type InstallationPlan = {
  triggerHost: "CANMYPHONE_NATIVE" | "APPLE_PERSONAL_AUTOMATION" | "HOMEKIT" | "PROVIDER" | "MANUAL" | "UNSUPPORTED";
  actionHosts: Array<"CANMYPHONE_NATIVE" | "HOMEKIT" | "PROVIDER" | "APPLE_SHORTCUTS" | "UNSUPPORTED">;
  installationHost: ReturnType<typeof compileAutomationRuntime>["installationHost"];
  runnerIntentRequired: boolean;
  shortcutActionCount: number;
  runtimePath: string[];
};

export function installationPlanForDefinition(definition: ShortcutDefinition): InstallationPlan {
  const runtime = compileAutomationRuntime(definition);
  const triggerHost = runtime.triggerDriver === "CANMYPHONE_MANUAL" ? "MANUAL" :
    runtime.triggerDriver === "APPLE_SHORTCUTS_BRIDGE" ? "APPLE_PERSONAL_AUTOMATION" : runtime.triggerDriver;
  const actionHosts = runtime.actionDrivers.map((driver) => driver === "APPLE_SHORTCUTS_ACTION" ? "APPLE_SHORTCUTS" :
    driver === "CANMYPHONE_APP_INTENT" ? "CANMYPHONE_NATIVE" : driver === "GUIDED" ? "UNSUPPORTED" : driver);
  const runnerIntentRequired = triggerHost === "APPLE_PERSONAL_AUTOMATION" && actionHosts.some((host) => host === "CANMYPHONE_NATIVE" || host === "PROVIDER");
  const shortcutActionCount = actionHosts.filter((host) => host === "APPLE_SHORTCUTS").length;
  return {
    triggerHost, actionHosts, installationHost: runtime.installationHost,
    runnerIntentRequired, shortcutActionCount,
    runtimePath: runtime.installationHost === "HOMEKIT" ? ["Apple Home", "HomeKit-Aktion"] :
      triggerHost === "APPLE_PERSONAL_AUTOMATION" ? ["iOS-Systemauslöser", ...(runnerIntentRequired ? ["CanMyPhone App Intent", "CanMyPhone Runner"] : []), ...(shortcutActionCount ? ["Apple-Kurzbefehle-Aktion"] : [])] :
      [triggerHost, "CanMyPhone Runner", ...actionHosts]
  };
}
