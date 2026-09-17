import { Linking, Platform } from "react-native";
import { CanMyPhoneNative, type PermissionKind } from "../../modules/canmyphone-native";
import type { Solution } from "../types";

export type SettingsLaunchResult = {
  opened: boolean;
  reason:
    | "opened-app-settings"
    | "opened-notification-settings"
    | "permission-granted"
    | "permission-denied"
    | "manual-system-path"
    | "not-ios"
    | "no-settings-guide";
  message: string;
};

function permissionForSolution(solution: Solution): PermissionKind | null {
  return solution.settings?.permission ?? null;
}

export function settingsActionLabel(solution: Solution): string {
  const permission = permissionForSolution(solution);
  if (permission) return "Berechtigung prüfen";
  if (solution.settings?.openMode === "app-settings") return "App-Einstellungen öffnen";
  return "In Einstellungen fortfahren";
}

/**
 * Public iOS APIs only.
 * - App-owned permissions: ask through the real system permission sheet first.
 * - App settings / notification settings: use Apple's documented settings URLs.
 * - Arbitrary system panes: keep a visible breadcrumb instead of private App-Prefs links.
 */
export async function openSupportedSettings(solution: Solution): Promise<SettingsLaunchResult> {
  if (!solution.settings) {
    return { opened: false, reason: "no-settings-guide", message: "Für diese Lösung ist kein Einstellungsweg hinterlegt." };
  }
  if (Platform.OS !== "ios") {
    return { opened: false, reason: "not-ios", message: "Dieser Einstellungsweg ist für iOS vorgesehen." };
  }

  const permission = permissionForSolution(solution);
  if (permission && CanMyPhoneNative) {
    const current = await CanMyPhoneNative.permissionStatus(permission);
    if (current.granted) {
      return { opened: false, reason: "permission-granted", message: current.message };
    }

    if (current.status === "notDetermined") {
      const requested = await CanMyPhoneNative.requestPermission(permission);
      return {
        opened: false,
        reason: requested.granted ? "permission-granted" : "permission-denied",
        message: requested.message
      };
    }

    const opened = permission === "notifications"
      ? await CanMyPhoneNative.openNotificationSettings()
      : await CanMyPhoneNative.openAppSettings();

    return {
      opened,
      reason: permission === "notifications" ? "opened-notification-settings" : "opened-app-settings",
      message: opened ? "Die passenden App-Einstellungen wurden geöffnet." : current.message
    };
  }

  if (solution.settings.openMode === "app-settings") {
    try {
      if (CanMyPhoneNative) {
        const opened = await CanMyPhoneNative.openAppSettings();
        return { opened, reason: "opened-app-settings", message: opened ? "Die CanMyPhone-Einstellungen wurden geöffnet." : "Die App-Einstellungen konnten nicht geöffnet werden." };
      }
      await Linking.openSettings();
      return { opened: true, reason: "opened-app-settings", message: "Die CanMyPhone-Einstellungen wurden geöffnet." };
    } catch {
      return { opened: false, reason: "manual-system-path", message: "Die App-Einstellungen konnten nicht geöffnet werden." };
    }
  }

  return {
    opened: false,
    reason: "manual-system-path",
    message: "Diesen Systembereich stellt iOS Apps nicht als öffentlichen Direktlink bereit. CanMyPhone hält deshalb den kürzesten Pfad sichtbar."
  };
}
