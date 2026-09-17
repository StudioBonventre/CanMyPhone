import * as Brightness from "expo-brightness";
import type { Solution } from "../types";
import { directActionPlan, type DirectActionKind } from "./actionPlanning";
import { openSupportedSettings } from "./settings";

export { directActionPlan } from "./actionPlanning";
export type { DirectActionKind, DirectActionPlan } from "./actionPlanning";

export type DirectActionResult = {
  handled: boolean;
  succeeded: boolean;
  message: string;
  kind?: DirectActionKind;
};

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
