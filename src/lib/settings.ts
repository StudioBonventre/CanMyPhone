import { Linking, Platform } from "react-native";
import { CanMyPhoneNative, type PermissionKind } from "../../modules/canmyphone-native";
import type { Solution } from "../types";
import { loadEntitlementState } from "./storage";

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
  return "Pfad anzeigen";
}

function hasCurrentShortcutBridge(): boolean {
  return typeof CanMyPhoneNative?.openShortcuts === "function";
}

async function syncNativePremiumForShortcuts(): Promise<void> {
  try {
    const syncPremium = CanMyPhoneNative?.setPremiumEntitlement;
    if (typeof syncPremium !== "function") return;
    const state = await loadEntitlementState();
    await syncPremium.call(CanMyPhoneNative, Boolean(state?.pro));
  } catch {
    // Shortcut handoff must still work if entitlement persistence is temporarily unavailable.
  }
}

async function openShortcutsDestination(destination: "app" | "create"): Promise<boolean> {
  const url = destination === "create" ? "shortcuts://create-shortcut" : "shortcuts://";

  // Apple's documented Shortcuts URL scheme works even when the installed
  // Development Build predates our native bridge.
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
  // Keep native App Intents aligned with the purchase state before the user
  // leaves CanMyPhone to configure or run a shortcut.
  await syncNativePremiumForShortcuts();

  // Personal automations belong on the Shortcuts app's main surface. A blank
  // shortcut editor is useful for ordinary shortcut creation, but misleading for automations.
  const destination = solution.id === "ios-back-tap" || solution.category === "automation" ? "app" : "create";
  const currentNativeBuild = hasCurrentShortcutBridge();
  const opened = await openShortcutsDestination(destination);

  if (solution.id === "ios-back-tap") {
    return {
      opened,
      reason: opened ? "opened-shortcuts" : "manual-system-path",
      message: opened
        ? currentNativeBuild
          ? "Kurzbefehle ist geöffnet und der CanMyPhone App-Kurzbefehl ist im aktuellen Build verfügbar. Danach ordnest du ihn nur noch unter Bedienungshilfen → Tippen → Auf Rückseite tippen zu."
          : "Kurzbefehle ist geöffnet. Dein installierter Test-Build enthält den neuen CanMyPhone App-Kurzbefehl noch nicht; dafür brauchst du einmal den aktuellen Development Build."
        : "Kurzbefehle konnte nicht geöffnet werden. Öffne die Apple-App Kurzbefehle manuell; CanMyPhone merkt sich deinen Fortschritt."
    };
  }

  return {
    opened,
    reason: opened ? "opened-shortcuts" : "manual-system-path",
    message: opened
      ? destination === "app"
        ? "Kurzbefehle ist geöffnet. CanMyPhone hält den passenden Automationsschritt im Guide bereit."
        : "Der Kurzbefehle-Editor ist geöffnet. CanMyPhone hält den nächsten Schritt im Guide für dich bereit."
      : "Kurzbefehle konnte nicht geöffnet werden. CanMyPhone zeigt dir stattdessen den kürzesten manuellen Weg."
  };
}

async function openAppSettingsFallback(): Promise<boolean> {
  try {
    const openAppSettings = CanMyPhoneNative?.openAppSettings;
    if (typeof openAppSettings === "function") {
      const opened = await openAppSettings.call(CanMyPhoneNative);
      if (opened) return true;
    }
  } catch {
    // Fall through to React Native's public settings API.
  }

  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
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
    const permissionStatus = CanMyPhoneNative?.permissionStatus;
    const requestPermission = CanMyPhoneNative?.requestPermission;

    if (typeof permissionStatus !== "function" || typeof requestPermission !== "function") {
      return {
        opened: false,
        reason: "native-permission-unavailable",
        message: "Dein installierter Test-Build enthält diesen nativen iOS-Berechtigungsdialog noch nicht. Installiere den aktuellen Development Build."
      };
    }

    try {
      const current = await permissionStatus.call(CanMyPhoneNative, permission);

      if (current.granted) {
        return {
          opened: false,
          reason: "permission-granted",
          message: "Der Zugriff ist bereits erlaubt. Du kannst direkt mit dem nächsten Schritt weitermachen."
        };
      }

      if (current.status === "notDetermined") {
        const requested = await requestPermission.call(CanMyPhoneNative, permission);
        return {
          opened: false,
          reason: requested.granted ? "permission-granted" : "permission-denied",
          message: requested.granted
            ? "Erlaubt. Der Zugriff ist eingerichtet und du kannst direkt weitermachen."
            : "Nicht erlaubt. Tippe erneut auf den blauen Button, wenn du die Berechtigung in den iOS-Einstellungen ändern möchtest."
        };
      }

      if (permission === "notifications") {
        try {
          const openNotificationSettings = CanMyPhoneNative?.openNotificationSettings;
          if (typeof openNotificationSettings === "function") {
            const opened = await openNotificationSettings.call(CanMyPhoneNative);
            if (opened) {
              return {
                opened: true,
                reason: "opened-notification-settings",
                message: "Die Mitteilungseinstellungen für CanMyPhone wurden geöffnet."
              };
            }
          }
        } catch {
          // Use app settings fallback below.
        }
      }

      const opened = await openAppSettingsFallback();
      return {
        opened,
        reason: "opened-app-settings",
        message: opened
          ? "Die CanMyPhone-Einstellungen wurden geöffnet."
          : "Die App-Einstellungen konnten nicht geöffnet werden. Folge dem angezeigten Pfad manuell."
      };
    } catch {
      return {
        opened: false,
        reason: "native-permission-unavailable",
        message: "Der Berechtigungsstatus konnte gerade nicht gelesen werden. CanMyPhone hat keine Einstellung verändert."
      };
    }
  }

  if (solution.settings.openMode === "app-settings") {
    const opened = await openAppSettingsFallback();
    return {
      opened,
      reason: opened ? "opened-app-settings" : "manual-system-path",
      message: opened
        ? "Die CanMyPhone-Einstellungen wurden geöffnet."
        : "Die App-Einstellungen konnten nicht geöffnet werden."
    };
  }

  return {
    opened: false,
    reason: "manual-system-path",
    message: "Apple stellt für diesen Systembereich keinen öffentlichen Deep Link bereit. CanMyPhone zeigt dir deshalb direkt den kürzesten erlaubten Pfad und hält deinen Fortschritt fest."
  };
}
