import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";

function titleCase(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

function value(step: ShortcutStep, key = "value"): string | undefined {
  const raw = step.parameters[key];
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined;
}

export function triggerDisplayName(step: ShortcutStep): string {
  const v = value(step);
  switch (step.capabilityId) {
    case "trigger.manual": return "Manuell";
    case "trigger.app-opened": return v ? titleCase(v) : "App geöffnet";
    case "trigger.app-closed": return v ? `${titleCase(v)} geschlossen` : "App geschlossen";
    case "trigger.location-enter": return v === "home" ? "Zuhause" : v ? `Ankunft: ${titleCase(v)}` : "Ankunft";
    case "trigger.location-exit": return v === "home" ? "Zuhause verlassen" : v ? `Verlassen: ${titleCase(v)}` : "Ort verlassen";
    case "trigger.bluetooth-connected": return v ? `${titleCase(v)} verbunden` : "Bluetooth verbunden";
    case "trigger.bluetooth-disconnected": return v ? `${titleCase(v)} getrennt` : "Bluetooth getrennt";
    case "trigger.wifi-connected": return v ? `WLAN: ${v}` : "WLAN verbunden";
    case "trigger.carplay-connected": return "CarPlay verbunden";
    case "trigger.time":
    case "trigger.weekday": return v ? `Zeit: ${v}` : "Zeitplan";
    case "trigger.battery-level": return v ? `Akku ${v} %` : "Akkustand";
    case "trigger.charger-connected": return "Ladegerät verbunden";
    case "trigger.charger-disconnected": return "Ladegerät getrennt";
    case "trigger.focus-changed": return v ? `Fokus: ${v}` : "Fokus geändert";
    default: return step.capabilityId.replace(/^trigger\./, "").replace(/-/g, " ");
  }
}

export function actionDisplayName(step: ShortcutStep): string {
  switch (step.capabilityId) {
    case "system.brightness.set": {
      const raw = step.parameters.percent;
      const percent = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(percent)) {
        if (percent <= 0) return "Helligkeit Minimum";
        if (percent >= 100) return "Helligkeit Maximum";
        return `Helligkeit ${Math.round(percent)} %`;
      }
      return "Helligkeit";
    }
    case "system.volume.set": return `Lautstärke ${value(step) ?? ""}`.trim();
    case "system.low-power.set": return value(step) === "off" ? "Stromsparmodus aus" : "Stromsparmodus an";
    case "system.focus.set": return "Fokus ändern";
    case "media.spotify.open": return "Spotify starten";
    case "media.apple-music.play": return "Apple Music starten";
    case "media.playlist.play": return "Playlist starten";
    case "navigation.route.start": return "Navigation starten";
    case "vehicle.lock": return "Fahrzeug verriegeln";
    case "vehicle.unlock": return "Fahrzeug entriegeln";
    case "smart-home.cover.open": {
      const room = value(step, "room");
      return room ? `Rollläden ${titleCase(room)} öffnen` : "Rollläden öffnen";
    }
    case "smart-home.cover.close": {
      const room = value(step, "room");
      return room ? `Rollläden ${titleCase(room)} schließen` : "Rollläden schließen";
    }
    case "smart-home.light.set": return "Licht setzen";
    case "smart-home.climate.set": return "Klima setzen";
    default: return step.capabilityId.split(".").slice(-2).join(" ").replace(/-/g, " ");
  }
}

export function automationDisplayName(definition: ShortcutDefinition): string {
  const trigger = triggerDisplayName(definition.trigger);
  const actions = definition.actions.map(actionDisplayName);
  const actionPart = actions.length <= 2
    ? actions.join(" + ")
    : `${actions.slice(0, 2).join(" + ")} + ${actions.length - 2} weitere`;
  return `${trigger} → ${actionPart || "Automation"}`.slice(0, 92);
}
