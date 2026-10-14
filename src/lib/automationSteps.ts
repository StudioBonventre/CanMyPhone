import type { AutomationSpec, AutomationTriggerKind, Source } from "../types";

type TriggerInfo = {
  /** Name of the trigger exactly as listed in Kurzbefehle → Automation → Neue Automation. */
  label: string;
  symbol: string;
  /** Apple Support page that documents this trigger (German Shortcuts User Guide). */
  sourceTopic: string;
  sourceLabel: string;
};

const EVENTS = { sourceTopic: "apd932ff833f", sourceLabel: "Trigger für Ereignisse" };
const TRAVEL = { sourceTopic: "apd8ebfc4e8e", sourceLabel: "Trigger für Reisen" };
const COMMUNICATION = { sourceTopic: "apdd711f9dff", sourceLabel: "Trigger für Kommunikation" };
const SETTINGS = { sourceTopic: "apde31e9638b", sourceLabel: "Trigger für Einstellungen" };

export const TRIGGERS: Record<AutomationTriggerKind, TriggerInfo> = {
  time: { label: "Tageszeit", symbol: "🕒", ...EVENTS },
  alarm: { label: "Wecker", symbol: "⏰", ...EVENTS },
  sleep: { label: "Schlafen", symbol: "🌙", ...EVENTS },
  sound: { label: "Geräuscherkennung", symbol: "👂", ...EVENTS },
  arrive: { label: "Ankunft", symbol: "📍", ...TRAVEL },
  leave: { label: "Verlassen", symbol: "🚶", ...TRAVEL },
  carplay: { label: "CarPlay", symbol: "🚗", ...TRAVEL },
  message: { label: "Nachricht", symbol: "💬", ...COMMUNICATION },
  email: { label: "E-Mail", symbol: "✉️", ...COMMUNICATION },
  bluetooth: { label: "Bluetooth", symbol: "🎧", ...SETTINGS },
  wifi: { label: "WLAN", symbol: "📶", ...SETTINGS },
  battery: { label: "Batteriestatus", symbol: "🔋", ...SETTINGS },
  charger: { label: "Ladegerät", symbol: "🔌", ...SETTINGS },
  "low-power": { label: "Stromsparmodus", symbol: "🪫", ...SETTINGS },
  app: { label: "App", symbol: "📱", ...SETTINGS },
  focus: { label: "Fokus", symbol: "🌗", ...SETTINGS },
  nfc: { label: "NFC", symbol: "🏷️", ...SETTINGS }
};

export function triggerSymbol(kind: AutomationTriggerKind): string {
  return TRIGGERS[kind].symbol;
}

export function automationSources(spec: AutomationSpec): Source[] {
  const trigger = TRIGGERS[spec.trigger.kind];
  return [
    {
      label: "Apple Support — Persönliche Automation erstellen",
      url: "https://support.apple.com/de-de/guide/shortcuts/apdfbdbd7123/ios"
    },
    {
      label: `Apple Support — ${trigger.sourceLabel}`,
      url: `https://support.apple.com/de-de/guide/shortcuts/${trigger.sourceTopic}/ios`
    }
  ];
}

/**
 * Turns a recipe into the exact, beginner-friendly taps in Kurzbefehle.
 * One instruction per step, so the guide can show one thing at a time with Zurück/Weiter.
 */
export function automationSteps(spec: AutomationSpec): string[] {
  const trigger = TRIGGERS[spec.trigger.kind];
  const steps = [
    "Öffne die App Kurzbefehle und tippe unten auf „Automation“.",
    "Tippe oben rechts auf „+“ – beim allerersten Mal auf „Neue Automation“.",
    `Wähle den Auslöser „${trigger.label}“.`,
    `Stelle ein: ${spec.trigger.setup}`,
    "Wähle „Sofort ausführen“, damit dein iPhone nicht jedes Mal nachfragt. Tippe dann auf „Weiter“.",
    "Tippe auf „Neuer leerer Kurzbefehl“."
  ];

  spec.actions.forEach((action, index) => {
    const add = index === 0 ? "Tippe auf „Aktion hinzufügen“" : "Tippe unten in das Suchfeld";
    steps.push(`${add}, suche nach „${action.search}“ und wähle „${action.label}“.${action.detail ? ` ${action.detail}` : ""}`);
  });

  steps.push("Tippe oben rechts auf „Fertig“. Probiere die Automation einmal aus und sag CanMyPhone, ob sie geklappt hat.");
  return steps;
}
