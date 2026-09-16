import { Linking, Platform } from "react-native";
import { Solution } from "../types";

export type SettingsLaunchResult = {
  opened: boolean;
  reason: "opened-app-settings" | "manual-system-path" | "not-ios" | "no-settings-guide";
};

/**
 * Uses public platform APIs only.
 * iOS does not provide a public API for arbitrary deep links into Bluetooth/Siri/etc.
 * For system pages, CanMyPhone keeps the breadcrumb visible via the guide + Live Activity.
 */
export async function openSupportedSettings(solution: Solution): Promise<SettingsLaunchResult> {
  if (!solution.settings) return { opened: false, reason: "no-settings-guide" };
  if (Platform.OS !== "ios") return { opened: false, reason: "not-ios" };

  if (solution.settings.openMode === "app-settings") {
    try {
      await Linking.openSettings();
      return { opened: true, reason: "opened-app-settings" };
    } catch {
      return { opened: false, reason: "manual-system-path" };
    }
  }

  return { opened: false, reason: "manual-system-path" };
}
