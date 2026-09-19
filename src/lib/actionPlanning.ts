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

function validBrightnessPercent(raw: string): number | null {
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return percent / 100;
}

function brightnessFromQuery(query: string): number | null {
  // Explicit target language is authoritative even if the sentence also says
  // "heller" or "dunkler", e.g. "mach es heller, auf 60 %".
  const explicitTarget = query.match(/\bauf\s*(-?\d{1,3})(?:\s*%|\s*prozent)\b/i);
  if (explicitTarget) return validBrightnessPercent(explicitTarget[1]);

  // Relative requests need the current brightness as an input. Until that
  // capability is implemented, never reinterpret "25 % heller" as "auf 25 %".
  if (/\b(heller|dunkler|erhöhen|erhoehen|senken|reduzieren|mehr|weniger)\b/i.test(query)) {
    return null;
  }

  const percentage = query.match(/(-?\d{1,3})(?:\s*%|\s*prozent)\b/i);
  if (!percentage) return null;
  return validBrightnessPercent(percentage[1]);
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
