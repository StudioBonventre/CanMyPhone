import * as Brightness from "expo-brightness";
import type { PermissionKind } from "../../modules/canmyphone-native";
import type { Solution } from "../types";
import { openSupportedSettings } from "./settings";

export type DirectActionKind = "brightness" | "permission";

export type DirectActionPlan = {
  supported: boolean;
  kind?: DirectActionKind;
  label: string;
  needsInput?: "brightness-percent";
  permission?: PermissionKind;
  brightness?: number;
};

export type DirectActionResult = {
  handled: boolean;
  succeeded: boolean;
  message: string;
  kind?: DirectActionKind;
};

function brightnessFromQuery(query: string): number | null {
  const match = query.match(/(?:auf\s*)?(\d{1,3})(?:\s*%|\s*prozent)/i);
  if (!match) return null;
  const percent = Math.max(0, Math.min(100, Number(match[1])));
  return percent / 100;
}

export function directActionPlan(solution: Solution, query: string): DirectActionPlan {
  if (solution.id === "ios-set-brightness") {
    const brightness = brightnessFromQuery(query);
    return brightness === null
      ? { supported: true, kind: "brightness", label: "Helligkeit einstellen", needsInput: "brightness-percent" }
      : { supported: true, kind: "brightness", label: `Auf ${Math.round(brightness * 100)} % stellen`, brightness };
  }

  if (solution.settings?.permission) {
    return {
      supported: true,
      kind: "permission",
      label: "Berechtigung prüfen",
      permission: solution.settings.permission
    };
  }

  return { supported: false, label: "Guide starten" };
}

export async function runDirectAction(solution: Solution, query: string): Promise<DirectActionResult> {
  const plan = directActionPlan(solution, query);
  if (!plan.supported || !plan.kind) {
    return { handled: false, succeeded: false, message: "Für diese Lösung ist eine Anleitung der sichere Weg." };
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
  return {
    handled: true,
    succeeded,
    kind: "permission",
    message: result.message
  };
}
