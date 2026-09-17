import * as Brightness from "expo-brightness";
import type { EntitlementState, Solution } from "../types";
import { directActionPlan, type DirectActionKind } from "./actionPlanning";
import {
  automaticActionAccess,
  consumeAutomaticAction,
  DEFAULT_ENTITLEMENTS
} from "./entitlements";
import { openSupportedSettings } from "./settings";
import { loadEntitlementState, saveEntitlementState } from "./storage";

export { directActionPlan } from "./actionPlanning";
export type { DirectActionKind, DirectActionPlan } from "./actionPlanning";

export type DirectActionResult = {
  handled: boolean;
  succeeded: boolean;
  message: string;
  kind?: DirectActionKind;
  locked?: boolean;
};

async function entitlementGate(): Promise<{
  allowed: boolean;
  state: EntitlementState;
  message?: string;
}> {
  const state = await loadEntitlementState() ?? DEFAULT_ENTITLEMENTS;
  const access = automaticActionAccess(state);
  if (access.allowed) return { allowed: true, state };

  return {
    allowed: false,
    state,
    message: "Deine erste automatische Aktion war kostenlos. Für weitere automatische Aktionen brauchst du CanMyPhone Pro oder ein Credit. Anleitungen bleiben kostenlos."
  };
}

async function persistSuccessfulAutomaticAction(state: EntitlementState): Promise<void> {
  await saveEntitlementState(consumeAutomaticAction(state));
}

export async function runDirectAction(solution: Solution, query: string): Promise<DirectActionResult> {
  const plan = directActionPlan(solution, query);
  if (!plan.supported || !plan.kind) {
    return { handled: false, succeeded: false, message: "Für diese Lösung ist eine Anleitung der sichere Weg." };
  }

  const gate = await entitlementGate();
  if (!gate.allowed) {
    return {
      handled: true,
      succeeded: false,
      locked: true,
      kind: plan.kind,
      message: gate.message ?? "Für weitere automatische Aktionen brauchst du CanMyPhone Pro oder ein Credit."
    };
  }

  if (plan.kind === "brightness") {
    if (plan.brightness === undefined) {
      return {
        handled: true,
        succeeded: false,
        kind: "brightness",
        message: "Sag mir die gewünschte Helligkeit, zum Beispiel „35 %“."
      };
    }
    try {
      await Brightness.setBrightnessAsync(plan.brightness);
      await persistSuccessfulAutomaticAction(gate.state);
      return {
        handled: true,
        succeeded: true,
        kind: "brightness",
        message: `Helligkeit auf ${Math.round(plan.brightness * 100)} % gestellt.`
      };
    } catch {
      return {
        handled: true,
        succeeded: false,
        kind: "brightness",
        message: "Die Helligkeit konnte auf diesem Gerät gerade nicht geändert werden."
      };
    }
  }

  const result = await openSupportedSettings(solution);
  const succeeded = result.reason === "permission-granted";
  if (succeeded) await persistSuccessfulAutomaticAction(gate.state);

  return {
    handled: true,
    succeeded,
    kind: "permission",
    message: result.message
  };
}
