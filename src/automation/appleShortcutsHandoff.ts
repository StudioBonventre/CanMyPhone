import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";

function stringParameter(step: ShortcutStep, key = "value"): string | undefined {
  const value = step.parameters[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function triggerDescription(step: ShortcutStep): string {
  const value = stringParameter(step);
  switch (step.capabilityId) {
    case "trigger.app-opened":
      return value ? `wenn die App ${value} geöffnet wird` : "wenn die ausgewählte App geöffnet wird";
    case "trigger.location-enter":
      return value ? `wenn ich den Ort ${value} erreiche` : "wenn ich den ausgewählten Ort erreiche";
    case "trigger.location-exit":
      return value ? `wenn ich den Ort ${value} verlasse` : "wenn ich den ausgewählten Ort verlasse";
    case "trigger.bluetooth-connected":
      return value ? `wenn ${value} per Bluetooth verbunden wird` : "wenn das ausgewählte Bluetooth-Gerät verbunden wird";
    case "trigger.bluetooth-disconnected":
      return value ? `wenn ${value} per Bluetooth getrennt wird` : "wenn das ausgewählte Bluetooth-Gerät getrennt wird";
    case "trigger.battery-level":
      return value ? `wenn der Batteriestand ${value} Prozent erreicht` : "wenn der ausgewählte Batteriestand erreicht wird";
    case "trigger.charger-connected":
      return "wenn das Ladegerät verbunden wird";
    case "trigger.charger-disconnected":
      return "wenn das Ladegerät getrennt wird";
    case "trigger.time":
    case "trigger.weekday":
      return value ? `zum Zeitplan ${value}` : "zum ausgewählten Zeitplan";
    case "trigger.focus-changed":
      return value ? `wenn sich der Fokus ${value} ändert` : "wenn sich der ausgewählte Fokus ändert";
    default:
      return "mit dem im Wunsch beschriebenen Auslöser";
  }
}

function actionDescription(step: ShortcutStep): string {
  switch (step.capabilityId) {
    case "system.brightness.set": {
      const percent = stringParameter(step, "percent");
      return percent ? `die Helligkeit auf ${percent} Prozent setzen` : "die Helligkeit setzen";
    }
    case "system.low-power.set":
      return `den Stromsparmodus ${stringParameter(step) === "off" ? "ausschalten" : "einschalten"}`;
    case "system.focus.set":
      return "den gewünschten Fokus ändern";
    case "system.volume.set":
      return "die Lautstärke ändern";
    case "media.spotify.open":
      return "Spotify starten";
    case "media.apple-music.play":
      return "Apple Music starten";
    case "media.playlist.play":
      return "die gewünschte Playlist starten";
    case "navigation.route.start":
      return "die gewünschte Navigation starten";
    default:
      return "die in CanMyPhone gespeicherte Aktion ausführen";
  }
}

function cleanName(value: string): string {
  return value.replace(/[„“]/g, '"').replace(/\s+/g, " ").trim().slice(0, 120);
}

export function buildAppleIntelligenceAutomationDescription(definition: ShortcutDefinition): string {
  const name = cleanName(definition.name);
  const trigger = triggerDescription(definition.trigger);
  const actions = definition.actions.map(actionDescription).join(" und ");

  return [
    "Erstelle eine persönliche Automation in Kurzbefehle, nicht nur einen normalen Kurzbefehl.",
    `Auslöser: ${trigger}.`,
    `Gewünschtes Ergebnis: ${actions}.`,
    `Verwende als auszuführende Aktion die App-Aktion „CanMyPhone Automation ausführen“ und wähle die gespeicherte CanMyPhone-Automation „${name}“.`,
    "Übernimm Trigger und Parameter aus dieser Beschreibung, prüfe die Zusammenfassung und erstelle die Automation so, dass sie ohne zusätzliche Nachfrage läuft, sofern iOS diesen Trigger dafür zulässt."
  ].join(" ");
}
