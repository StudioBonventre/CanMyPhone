import type { Solution } from "../types";

export type ShortcutChoice = {
  id: string;
  label: string;
  queryHint: string;
};

export type ShortcutAssistantPlan = {
  applicable: boolean;
  title: string;
  explanation: string;
  clarification?: string;
  choices?: ShortcutChoice[];
  suggestedName?: string;
  steps: string[];
};

function includesAny(value: string, terms: string[]): boolean {
  const q = value.toLowerCase();
  return terms.some((term) => q.includes(term));
}

export function shortcutAssistantPlan(query: string, solution?: Solution | null): ShortcutAssistantPlan {
  const q = query.trim();
  const shortcutCapable = solution?.id === "ios-back-tap" || solution?.voice?.route === "shortcut" || solution?.category === "automation" || includesAny(q, ["automatisch", "automation", "kurzbefehl", "shortcut", "siri"]);

  if (!shortcutCapable) {
    return {
      applicable: false,
      title: "Kein Kurzbefehl nötig",
      explanation: "Für dieses Ziel ist ein direkter iPhone-Weg einfacher.",
      steps: []
    };
  }

  if (solution?.id === "ios-back-tap") {
    return {
      applicable: true,
      title: "Back Tap mit CanMyPhone vorbereiten",
      explanation: "CanMyPhone registriert einen eigenen App Shortcut automatisch. Apple verlangt nur die letzte Zuordnung zu Doppeltippen oder Dreimal tippen in den Bedienungshilfen.",
      suggestedName: "CanMyPhone öffnen",
      steps: [
        "Tippe auf „Shortcut vorbereiten“ — CanMyPhone öffnet die Kurzbefehle-App über Apples offiziellen Deep Link",
        "Prüfe, dass der CanMyPhone App Shortcut verfügbar ist",
        "Öffne Einstellungen → Bedienungshilfen → Tippen → Auf Rückseite tippen",
        "Wähle Doppeltippen oder Dreimal tippen und ordne den CanMyPhone Shortcut zu"
      ]
    };
  }

  if (includesAny(q, ["losfahren", "auto", "carplay", "fahrzeug"])) {
    return {
      applicable: true,
      title: "Automation fürs Auto",
      explanation: "CanMyPhone kann dir den passenden Kurzbefehle-Weg vorbereiten, ohne dass du die Fachbegriffe kennen musst.",
      clarification: "Woran soll dein iPhone erkennen, dass du losfährst?",
      choices: [
        { id: "carplay", label: "CarPlay verbindet sich", queryHint: "CarPlay" },
        { id: "bluetooth", label: "Auto-Bluetooth verbindet sich", queryHint: "Bluetooth" },
        { id: "leave", label: "Ich verlasse einen Ort", queryHint: "Ort verlassen" }
      ],
      suggestedName: "Losfahren",
      steps: [
        "Öffne Kurzbefehle → Automation",
        "Wähle den Auslöser, der zu deinem Auto passt",
        "Füge die gewünschte Aktion hinzu",
        "Prüfe die Option für automatische Ausführung, falls iOS sie für diesen Auslöser anbietet"
      ]
    };
  }

  if (includesAny(q, ["tesla"])) {
    return {
      applicable: true,
      title: "Tesla-Aktion als Siri-Kurzbefehl",
      explanation: "CanMyPhone nutzt die von der Tesla-App angebotenen App-Kurzbefehle und legt keine privaten Fahrzeugbefehle an.",
      clarification: "Welche Tesla-Aktion möchtest du per Siri starten?",
      choices: [
        { id: "unlock", label: "Entriegeln", queryHint: "Tesla entriegeln" },
        { id: "climate", label: "Klima starten", queryHint: "Tesla Klima" },
        { id: "other", label: "Andere verfügbare Tesla-Aktion", queryHint: "Tesla App-Kurzbefehl" }
      ],
      suggestedName: "Tesla Aktion",
      steps: [
        "Öffne Kurzbefehle → App-Kurzbefehle → Tesla",
        "Wähle eine Aktion, die deine Tesla-App tatsächlich anbietet",
        "Gib ihr einen kurzen Namen",
        "Starte sie anschließend über Siri mit diesem Namen"
      ]
    };
  }

  return {
    applicable: true,
    title: "Kurzbefehl vorbereiten",
    explanation: "CanMyPhone führt dich durch den kürzesten offiziellen Kurzbefehle-Weg.",
    suggestedName: solution?.title ?? "Meine Automation",
    steps: solution?.steps ?? [
      "Öffne Kurzbefehle",
      "Wähle die gewünschte Aktion",
      "Gib dem Kurzbefehl einen eindeutigen Namen",
      "Teste ihn einmal"
    ]
  };
}
