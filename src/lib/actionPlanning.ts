import type { PermissionKind } from "../../modules/canmyphone-native";
import type { Solution } from "../types";

export type DirectActionKind = "brightness" | "permission";

export type DirectActionPlan = {
  supported: boolean;
  kind?: DirectActionKind;
  label: string;
  needsInput?: "brightness-percent";
  permission?: PermissionKind;
  brightness?: number;
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
