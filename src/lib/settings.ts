import { Linking, Platform } from "react-native";
import { CanMyPhoneNative, type PermissionKind } from "../../modules/canmyphone-native";
import type { Solution } from "../types";

export type SettingsLaunchResult = {
  opened: boolean;
  reason:
    | "opened-app-settings"
    | "opened-notification-settings"
    | "opened-shortcuts"
    | "permission-granted"
    | "permission-denied"
    | "manual-system-path"
    | "native-permission-unavailable"
    | "not-ios"
    | "no-settings-guide";
  message: string;
};

function permissionForSolution(solution: Solution): PermissionKind | null {
  return solution.settings?.permission ?? null;
}

export function isPermissionSettingsFlow(solution: Solution): boolean {
  return Boolean(permissionForSolution(solution));
}

export function isShortcutSettingsFlow(solution: Solution): boolean {
  return solution.id === "ios-back-tap" || solution.voice?.route === "shortcut" || solution.category === "automation";
}

export function settingsActionLabel(solution: Solution): string {
  const permission = permissionForSolution(solution);
  if (permission === "notifications") return "Mitteilungen prüfen";
  if (permission) return "Zugriff erlauben";
  if (solution.id === "ios-back-tap") return "Kurzbefehle öffnen";
  if (isShortcutSettingsFlow(solution)) return "Kurzbefehle öffnen";
  if (solution.settings?.openMode === "app-settings") return "App-Einstellungen öffnen";
  return "Nächsten Schritt anzeigen";
}

async function openShortcutsDestination(destination: "app" | "create"): Promise<boolean> {
  const url = destination === "create" ? "shortcuts://create-shortcut" : "shortcuts://";

  // Prefer the public URL scheme directly. This also works with an older
  // Development Build that does not yet contain our native openShortcuts bridge.
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    // Fall through to the native bridge if the JS handoff fails.
  }

  try {
    const openShortcuts = CanMyPhoneNative?.openShortcuts;
    if (typeof openShortcuts === "function") {
      return await openShortcuts.call(CanMyPhoneNative, destination);
    }
  } catch {
    // Keep the guide alive and show the manual fallback below.
  }

  return false;
}

async function openShortcutHandoff(solution: Solution): Promise<SettingsLaunchResult> {
  const destination = solution.id === "ios-back-tap" ? "app" : "create";
  const opened = await openShortcutsDestination(destination);

  if (solution.id === "ios-back-tap") {
    return {
      opened,
      reason: opened ? "opened-shortcuts" : "manual-system-path",
      message: opened
        ? "Kurzbefehle ist geöffnet. CanMyPhone stellt seinen App Shortcut automatisch bereit. Danach fehlt nur noch die von Apple vorgeschriebene Zuordnung unter Bedienungshilfen → Tippen → Auf Rückseite tippen."
        : "Kurzbefehle konnte nicht geöffnet werden. Öffne die Apple-App Kurzbefehle manuell; CanMyPhone merkt sich deinen Fortschritt."
    };
  }

  return {
    opened,
    reason: opened ? "opened-shortcuts" : "manual-system-path",
    message: opened
      ? "Der Kurzbefehle-Editor ist geöffnet. CanMyPhone hält den nächsten Schritt im Guide für dich bereit."
      : "Kurzbefehle konnte nicht geöffnet werden. CanMyPhone zeigt dir stattdessen den kürzesten manuellen Weg."
  };
}

/**
 * Public iOS APIs only.
 * - App-owned permissions: ask through the real system permission sheet first.
 * - If a permission was already denied, open the official app/notification settings.
 * - Shortcut-capable flows: use Apple's documented Shortcuts URL scheme.
 * - Arbitrary system panes: never use private App-Prefs/prefs URLs. Keep the shortest breadcrumb instead.
 */
export async function openSupportedSettings(solution: Solution): Promise<SettingsLaunchResult> {
  if (Platform.OS !== "ios") {
    return {
      opened: false,
      reason: "not-ios",
      message: "Dieser Einstellungsweg ist für iOS vorgesehen."
    };
  }

  if (isShortcutSettingsFlow(solution) && !solution.settings?.permission) {
    return openShortcutHandoff(solution);
  }

  if (!solution.settings) {
    return {
      opened: false,
      reason: "no-settings-guide",
      message: "Für diese Lösung ist kein Einstellungsweg hinterlegt."
    };
  }

  const permission = permissionForSolution(solution);

  if (permission) {
    if (!CanMyPhoneNative) {
      return {
        opened: false,
        reason: "native-permission-unavailable",
        message: "Der native iOS-Berechtigungsdialog ist in diesem Build noch nicht verfügbar."
      };
    }

    const current = await CanMyPhoneNative.permissionStatus(permission);

    if (current.granted) {
      return {
        opened: false,
        reason: "permission-granted",
        message: current.message
      };
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
      message: opened
        ? permission === "notifications"
          ? "Die Mitteilungseinstellungen für CanMyPhone wurden geöffnet."
          : "Die CanMyPhone-Einstellungen wurden geöffnet."
        : current.message
    };
  }

  if (solution.settings.openMode === "app-settings") {
    try {
      if (CanMyPhoneNative) {
        const opened = await CanMyPhoneNative.openAppSettings();
        return {
          opened,
          reason: "opened-app-settings",
          message: opened
            ? "Die CanMyPhone-Einstellungen wurden geöffnet."
            : "Die App-Einstellungen konnten nicht geöffnet werden."
        };
      }

      await Linking.openSettings();
      return {
        opened: true,
        reason: "opened-app-settings",
        message: "Die CanMyPhone-Einstellungen wurden geöffnet."
      };
    } catch {
      return {
        opened: false,
        reason: "manual-system-path",
        message: "Die App-Einstellungen konnten nicht geöffnet werden."
      };
    }
  }

  return {
    opened: false,
    reason: "manual-system-path",
    message: "Apple stellt für diesen Systembereich keinen öffentlichen Deep Link bereit. CanMyPhone zeigt dir deshalb direkt den kürzesten erlaubten Pfad und hält deinen Fortschritt fest."
  };
}
