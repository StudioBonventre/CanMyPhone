import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import type { EntitlementState, Solution } from "../types";
import { directActionPlan, type DirectActionKind } from "./actionPlanning";
import {
  automaticActionAccess,
  consumeAutomaticAction,
  DEFAULT_ENTITLEMENTS,
  developmentPremiumEnabled
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
  const stored = await loadEntitlementState() ?? DEFAULT_ENTITLEMENTS;

  if (developmentPremiumEnabled()) {
    const developmentState: EntitlementState = { ...stored, pro: true };
    await syncPremiumEntitlement(true);
    return { allowed: true, state: developmentState };
  }

  await syncPremiumEntitlement(stored.pro);
  const access = automaticActionAccess(stored);
  if (access.allowed) return { allowed: true, state: stored };

  return {
    allowed: false,
    state: stored,
    message: "Deine erste automatische Aktion war kostenlos. Für weitere automatische Änderungen brauchst du CanMyPhone Pro oder ein Credit. Anleitungen bleiben kostenlos."
  };
}

async function persistSuccessfulAutomaticAction(state: EntitlementState): Promise<void> {
  // Never mutate the user's persisted purchase/credit state because of a development-only Pro override.
  if (developmentPremiumEnabled()) {
    await syncPremiumEntitlement(true);
    return;
  }

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
    // App-owned permissions are infrastructure, not a premium automation.
    // A person must never spend a credit merely to grant CanMyPhone access it needs.
    if (plan.kind === "permission") {
      const result = await openSupportedSettings(solution);
      return {
        handled: true,
        succeeded: result.reason === "permission-granted",
        kind: "permission",
        message: result.message
      };
    }

    const gate = await entitlementGate();
    if (!gate.allowed) {
      return {
        handled: true,
        succeeded: false,
        locked: true,
        kind: plan.kind,
        message: gate.message ?? "Für weitere automatische Änderungen brauchst du CanMyPhone Pro oder ein Credit."
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

    return {
      handled: false,
      succeeded: false,
      kind: plan.kind,
      message: "Für diese Aktion ist derzeit kein sicherer direkter iOS-Weg hinterlegt."
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
