import { CanMyPhoneNative } from "../../modules/canmyphone-native";
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

async function syncPremiumEntitlement(enabled: boolean): Promise<void> {
  try {
    const sync = CanMyPhoneNative?.setPremiumEntitlement;
    if (typeof sync === "function") {
      await sync.call(CanMyPhoneNative, enabled);
    }
  } catch {
    // Older development builds may not contain this native method yet.
    // Entitlement sync must never block the action the user actually requested.
  }
}

async function entitlementGate(): Promise<{
  allowed: boolean;
  state: EntitlementState;
  message?: string;
}> {
  const state = await loadEntitlementState() ?? DEFAULT_ENTITLEMENTS;
  await syncPremiumEntitlement(state.pro);

  const access = automaticActionAccess(state);
  if (access.allowed) return { allowed: true, state };

  return {
    allowed: false,
    state,
    message: "Deine erste automatische Aktion war kostenlos. Für weitere automatische Aktionen brauchst du CanMyPhone Pro oder ein Credit. Anleitungen bleiben kostenlos."
  };
}

async function persistSuccessfulAutomaticAction(state: EntitlementState): Promise<void> {
  const next = consumeAutomaticAction(state);
  await saveEntitlementState(next);
  await syncPremiumEntitlement(next.pro);
}

export async function runDirectAction(solution: Solution, query: string): Promise<DirectActionResult> {
  const plan = directActionPlan(solution, query);
  if (!plan.supported || !plan.kind) {
    return { handled: false, succeeded: false, message: "Für diese Lösung ist eine Anleitung der sichere Weg." };
  }

  try {
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
          message: "Sag mir die gewünschte Helligkeit zwischen 0 und 100 Prozent, zum Beispiel „35 %“."
        };
      }

      const setBrightness = CanMyPhoneNative?.setBrightness;
      if (typeof setBrightness !== "function") {
        return {
          handled: true,
          succeeded: false,
          kind: "brightness",
          message: "Dein installierter CanMyPhone-Testbuild enthält die neue Helligkeitsfunktion noch nicht. Installiere den aktuellen Development Build und versuche es erneut."
        };
      }

      try {
        const applied = await setBrightness.call(CanMyPhoneNative, plan.brightness);
        if (!applied.success) {
          return {
            handled: true,
            succeeded: false,
            kind: "brightness",
            message: applied.message || "Die Helligkeit konnte auf diesem Gerät gerade nicht geändert werden."
          };
        }

        await persistSuccessfulAutomaticAction(gate.state);
        return {
          handled: true,
          succeeded: true,
          kind: "brightness",
          message: applied.message
        };
      } catch {
        return {
          handled: true,
          succeeded: false,
          kind: "brightness",
          message: "Die Helligkeit konnte gerade nicht geändert werden. Prüfe, ob der aktuelle Development Build installiert ist."
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
  } catch {
    return {
      handled: true,
      succeeded: false,
      kind: plan.kind,
      message: "Die Aktion konnte gerade nicht abgeschlossen werden. CanMyPhone hat nichts verändert; versuche es bitte noch einmal."
    };
  }
}
