import type { Solution } from "../types";

/**
 * Small set of fast-moving capabilities whose regional/device availability changes
 * more often than the evergreen knowledge catalogue. Keep these entries sourced
 * directly from current first-party platform documentation.
 */
export const currentAvailabilitySolutions: Solution[] = [
  {
    id: "ios-enable-apple-intelligence",
    platform: "ios",
    title: "Apple Intelligence auf dem iPhone aktivieren",
    summary: "Apple Intelligence ist auf unterstützten iPhones auch in Deutschland und der EU verfügbar. Die neue Siri AI ist davon getrennt und auf iPhone in der EU zunächst nicht verfügbar.",
    aliases: [
      "apple intelligence aktivieren",
      "apple intelligence einschalten",
      "apple intelligence anmachen",
      "apple intelligence einrichten",
      "enable apple intelligence",
      "turn on apple intelligence"
    ],
    category: "assistant",
    builtIn: true,
    cost: "Kostenlos auf unterstützten Geräten",
    setupMinutes: 2,
    intents: ["enable", "availability", "howto", "general"],
    entities: ["apple-intelligence"],
    availability: {
      minOsMajor: 18,
      requiresAppleIntelligence: true
    },
    requirements: [
      "Apple-Intelligence-fähiges iPhone, zum Beispiel iPhone 15 Pro/Pro Max oder iPhone 16 und neuer",
      "Unterstützte Geräte- und Siri-Sprache",
      "Aktuelle iOS-Version"
    ],
    voice: {
      route: "none",
      note: "Apple Intelligence umfasst mehrere Funktionen. Siri AI ist eine separate, neuere Siri-Ausbaustufe mit eigener regionaler Verfügbarkeit."
    },
    steps: [
      "Öffne die Einstellungen",
      "Öffne Siri beziehungsweise Apple Intelligence & Siri, je nach angezeigter iOS-Oberfläche",
      "Aktiviere die angebotenen Apple-Intelligence-Funktionen und folge der Einrichtung",
      "Wenn Siri AI nicht angeboten wird, ist das in der EU derzeit erwartbar; die übrigen verfügbaren Apple-Intelligence-Funktionen kannst du trotzdem nutzen"
    ],
    settings: {
      path: ["Einstellungen", "Siri / Apple Intelligence & Siri"],
      openMode: "manual-system",
      note: "Apple bietet keinen öffentlichen Deep Link direkt in diesen geschützten Systembereich."
    },
    sources: [
      { label: "Apple — Apple Intelligence und Siri", url: "https://www.apple.com/de/apple-intelligence/" },
      { label: "Apple Support — Siri auf dem iPhone aktivieren", url: "https://support.apple.com/guide/iphone/turn-on-and-activate-siri-iph83aad8922/ios" }
    ]
  }
];
