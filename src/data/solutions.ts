import { Solution } from "../types";

export const solutions: Solution[] = [
  {
    id: "ios-enable-siri",
    platform: "ios",
    title: "Siri einschalten",
    summary: "Siri ist bereits im iPhone integriert. Du kannst Sprachaktivierung, Seitentaste oder beides aktivieren.",
    aliases: ["siri einschalten", "siri anmachen", "siri aktivieren", "hey siri einschalten", "turn on siri", "enable siri", "wie mach ich siri an"],
    category: "assistant",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "howto", "voice-control"],
    entities: ["siri"],
    voice: {
      route: "siri-direct",
      note: "Damit aktivierst du die klassische Siri-Funktion. Erweiterte Siri-KI ist davon getrennt."
    },
    steps: [
      "Öffne die Einstellungen",
      "Tippe auf Siri",
      "Aktiviere Siri und folge der Einrichtung",
      "Wähle, ob du Siri per Stimme, Seitentaste oder mit beidem starten möchtest"
    ],
    settings: {
      path: ["Einstellungen", "Siri"],
      openMode: "manual-system",
      note: "Apple erlaubt Apps keinen öffentlichen Direktlink tief in die Siri-Einstellungen. CanMyPhone merkt sich deshalb den Pfad für dich."
    },
    sources: [
      { label: "Apple Support — Siri aktivieren", url: "https://support.apple.com/guide/iphone/turn-on-and-activate-siri-iph83aad8922/27/ios/27" }
    ]
  },
  {
    id: "ios-run-shortcuts-with-siri",
    platform: "ios",
    title: "Kurzbefehle mit Siri starten",
    summary: "Siri kann Kurzbefehle beim Namen starten. So lassen sich auch viele Aktionen von Apps per Sprache ausführen, selbst wenn Siri die App nicht direkt steuert.",
    aliases: ["siri shortcut", "siri kurzbefehl", "kurzbefehl mit siri", "app mit siri steuern", "siri app steuern", "siri automation"],
    category: "automation",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["voice-control", "automation", "howto"],
    entities: ["siri", "shortcuts"],
    voice: {
      route: "shortcut",
      invocation: "Sage „Siri“ oder „Hey Siri“ und danach den Namen des Kurzbefehls.",
      note: "Das funktioniert mit klassischer Siri und benötigt keine zusätzliche Siri-KI.",
      fallback: "Wenn eine App keine passende Kurzbefehls-Aktion anbietet, ist direkte Siri-Steuerung eventuell nicht möglich."
    },
    steps: [
      "Öffne die App Kurzbefehle",
      "Öffne App-Kurzbefehle, um Aktionen deiner installierten Apps zu sehen",
      "Wähle eine passende App-Aktion oder nutze sie in einem eigenen Kurzbefehl",
      "Gib dem Kurzbefehl einen kurzen, eindeutigen Namen",
      "Starte Siri und sage den Namen des Kurzbefehls"
    ],
    sources: [
      { label: "Apple Support — Kurzbefehle mit Siri ausführen", url: "https://support.apple.com/guide/shortcuts/use-siri-to-run-shortcuts-apd07c25bb38/10.0/ios/27" },
      { label: "Apple Support — App-Kurzbefehle", url: "https://support.apple.com/de-ch/guide/shortcuts/apd43295406d/ios" }
    ]
  },
  {
    id: "ios-tesla-siri-unlock",
    platform: "ios",
    title: "Tesla über Siri und Kurzbefehle steuern",
    summary: "Die offizielle Tesla-App unterstützt Siri. Verfügbare Tesla-Aktionen können in Kurzbefehle eingebaut und anschließend per Stimme gestartet werden.",
    aliases: [
      "tesla mit siri öffnen", "tesla mit siri oeffnen", "tesla per siri öffnen", "tesla per siri entriegeln",
      "tesla siri unlock", "unlock tesla with siri", "open tesla with siri", "tesla kurzbefehl", "tesla shortcut siri"
    ],
    category: "car",
    builtIn: false,
    cost: "Kostenlos mit Tesla-App",
    setupMinutes: 4,
    intents: ["voice-control", "automation", "howto"],
    entities: ["tesla", "siri", "shortcuts", "car"],
    requirements: [
      "Offizielle Tesla-App installiert und angemeldet",
      "Mobiler Zugriff für das Fahrzeug aktiviert",
      "Die gewünschte Tesla-Aktion muss in deiner App-/Fahrzeugversion als Kurzbefehl verfügbar sein",
      "Für Fernbefehle benötigen iPhone und Fahrzeug gegebenenfalls eine Datenverbindung"
    ],
    voice: {
      route: "shortcut",
      invocation: "Beispiel: Kurzbefehl „Tesla öffnen“ anlegen und dann „Siri, Tesla öffnen“ sagen.",
      note: "Dieser Weg nutzt klassische Siri plus Apple Kurzbefehle.",
      fallback: "Wenn Tesla die gewünschte Aktion nicht anbietet, nutze die Tesla-App direkt."
    },
    steps: [
      "Aktualisiere und öffne die offizielle Tesla-App und prüfe, ob Fernzugriff funktioniert",
      "Öffne Apple Kurzbefehle",
      "Öffne App-Kurzbefehle und wähle Tesla",
      "Wähle eine verfügbare Fahrzeugaktion und gegebenenfalls dein Fahrzeug",
      "Lege daraus einen Kurzbefehl mit einem eindeutigen Namen wie „Tesla öffnen“ an",
      "Aktiviere Siri und sage den Namen des Kurzbefehls"
    ],
    sources: [
      { label: "Tesla — Mobile App", url: "https://www.tesla.com/ownersmanual/modely/de_de/GUID-F6E2CD5E-F226-4167-AC48-BD021D1FFDAB.html" },
      { label: "App Store — Tesla unterstützt Siri", url: "https://apps.apple.com/de/app/tesla/id582007913" },
      { label: "Apple Support — Kurzbefehle mit Siri", url: "https://support.apple.com/guide/shortcuts/use-siri-to-run-shortcuts-apd07c25bb38/10.0/ios/27" }
    ]
  },
  {
    id: "ios-siri-ai-eu-status",
    platform: "ios",
    title: "Siri-KI in der EU: klassische Siri und Kurzbefehle nutzen",
    summary: "Wenn eine neue Siri-KI-Funktion in deiner Region nicht verfügbar ist, bleiben klassische Siri und Apple Kurzbefehle für viele Aufgaben eine gute Alternative.",
    aliases: ["siri ai europa", "siri ai eu", "siri ki europa", "apple intelligence siri europa", "siri ai geht nicht", "siri ai deutschland"],
    category: "assistant",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["availability", "voice-control", "howto"],
    entities: ["siri", "apple-intelligence"],
    availability: { regions: ["eu"] },
    voice: {
      route: "none",
      note: "CanMyPhone bevorzugt hier klassische Siri und Kurzbefehle, wenn sie dein Ziel bereits lösen können.",
      fallback: "Nutze klassische Siri plus Apple Kurzbefehle, wenn sich die gewünschte Aufgabe damit abbilden lässt."
    },
    steps: [
      "Lass klassische Siri in Einstellungen → Siri aktiviert",
      "Prüfe für App-Steuerung die App-Kurzbefehle in Kurzbefehle",
      "Lege für deine gewünschte Aktion einen Kurzbefehl an",
      "Starte ihn anschließend über seinen Namen mit Siri"
    ],
    sources: [
      { label: "Apple — Apple Intelligence und Siri", url: "https://www.apple.com/de/apple-intelligence/" },
      { label: "Apple Support — Siri-Funktionen", url: "https://support.apple.com/guide/iphone/get-started-with-siri-ai-iphv6zwrg8jvfgr/27/ios/27" }
    ]
  },
  {
    id: "ios-enable-siri-ai",
    platform: "ios",
    title: "Erweiterte Siri-Funktionen aktivieren",
    summary: "Auf unterstützten iPhones lassen sich neue Siri-Funktionen in den Siri-Einstellungen aktivieren. Verfügbarkeit hängt von Gerät, Sprache und Region ab.",
    aliases: ["siri ai einschalten", "siri ai aktivieren", "turn on siri ai", "enable siri ai", "apple intelligence siri einschalten"],
    category: "assistant",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["enable", "availability", "voice-control"],
    entities: ["siri", "apple-intelligence"],
    availability: {
      excludedRegions: ["eu"],
      minOsMajor: 27,
      requiresAppleIntelligence: true
    },
    requirements: [
      "Unterstützte iOS-Version",
      "Apple-Intelligence-fähiges iPhone",
      "Unterstützte Geräte- und Siri-Sprache",
      "Verfügbarkeit der Funktion in deiner Region"
    ],
    voice: {
      route: "siri-ai",
      note: "Erweiterte Siri-Funktionen können zusätzlichen Kontext und natürlichere Interaktionen ermöglichen."
    },
    steps: [
      "Öffne die Einstellungen",
      "Tippe auf Siri",
      "Öffne die angebotene Option für die erweiterten Siri-Funktionen",
      "Folge der Einrichtung auf dem Bildschirm"
    ],
    sources: [
      { label: "Apple Support — Siri einrichten", url: "https://support.apple.com/guide/iphone/get-started-with-siri-ai-iphv6zwrg8jvfgr/27/ios/27" }
    ]
  },
  {
    id: "ios-enable-bluetooth",
    platform: "ios",
    title: "Bluetooth einschalten",
    summary: "Bluetooth lässt sich direkt in den Einstellungen aktivieren. Dort siehst du auch verbundene und verfügbare Geräte.",
    aliases: ["bluetooth einschalten", "bluetooth anmachen", "bluetooth aktivieren", "wie mach ich bluetooth an", "turn on bluetooth", "enable bluetooth"],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    entities: ["bluetooth"],
    steps: ["Öffne die Einstellungen", "Tippe auf Bluetooth", "Schalte Bluetooth ein"],
    settings: {
      path: ["Einstellungen", "Bluetooth"],
      openMode: "manual-system",
      note: "CanMyPhone verwendet absichtlich keine privaten Einstellungs-Links, die bei Apple nicht offiziell freigegeben sind."
    },
    sources: [
      { label: "Apple Support — Bluetooth-Geräte verbinden", url: "https://support.apple.com/guide/iphone/connect-bluetooth-devices-iph3c50f191/ios" }
    ]
  },
  {
    id: "ios-parked-car",
    platform: "ios",
    title: "Das geparkte Auto mit Apple Karten wiederfinden",
    summary: "Dein iPhone kann sich den Parkplatz automatisch merken, wenn die Verbindung zu CarPlay oder zum Bluetooth-System deines Autos getrennt wird.",
    aliases: ["where did i park", "find my car", "remember parking spot", "parkplatz merken", "auto wiederfinden", "wo steht mein auto"],
    category: "travel",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    entities: ["car"],
    requirements: [
      "Ortungsdienste aktiviert",
      "Auto über Bluetooth oder CarPlay gekoppelt",
      "Funktion für geparkten Standort in Karten aktiviert"
    ],
    steps: [
      "Öffne die Einstellungen",
      "Gehe zu Apps → Karten",
      "Aktiviere die Anzeige des geparkten Standorts",
      "Prüfe, ob Ortungsdienste und wichtige Orte aktiviert sind"
    ],
    settings: {
      path: ["Einstellungen", "Apps", "Karten", "Geparkten Standort anzeigen"],
      openMode: "manual-system"
    },
    sources: [
      { label: "Apple Support — Geparktes Auto", url: "https://support.apple.com/guide/iphone/get-directions-to-your-parked-car-ipha13ef1c2e/27/ios/27" }
    ]
  },
  {
    id: "ios-scan-document",
    platform: "ios",
    title: "Dokumente ohne Scanner-App als PDF scannen",
    summary: "Notizen und Dateien können Papierdokumente mit automatischer Kantenerkennung scannen und digital speichern.",
    aliases: ["scan document", "scan pdf", "scanner app", "papier digitalisieren", "dokument scannen", "rechnung scannen"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: [
      "Öffne Notizen",
      "Erstelle eine neue Notiz oder öffne eine vorhandene",
      "Tippe auf die Schaltfläche für Anhänge",
      "Wähle Dokumente scannen",
      "Halte die Kamera über jede Seite und beende anschließend den Scan"
    ],
    sources: [
      { label: "Apple Support — Dokumente scannen", url: "https://support.apple.com/de-de/108963" }
    ]
  },
  {
    id: "ios-live-text",
    platform: "ios",
    title: "Text direkt aus Kamera oder Fotos kopieren",
    summary: "Live Text erkennt Text in Kamera, Fotos, Videos und Webseiten. Du kannst ihn kopieren, übersetzen, nachschlagen oder direkt verwenden.",
    aliases: ["copy text from paper", "ocr", "copy text camera", "text abschreiben", "text aus foto kopieren", "text übersetzen kamera"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    requirements: ["Unterstütztes Gerät sowie unterstützte Sprache und Region"],
    steps: [
      "Öffne die Kamera und richte sie auf Text",
      "Tippe auf das Live-Text-Symbol, sobald es erscheint",
      "Markiere den gewünschten Text",
      "Wähle Kopieren, Übersetzen, Nachschlagen oder eine andere verfügbare Aktion"
    ],
    sources: [
      { label: "Apple Support — Live Text", url: "https://support.apple.com/de-de/guide/iphone/iphcf0b71b0e/ios" }
    ]
  },
  {
    id: "ios-back-tap",
    platform: "ios",
    title: "Die Rückseite deines iPhones als Knopf nutzen",
    summary: "Mit „Auf Rückseite tippen“ kannst du durch doppeltes oder dreifaches Tippen Aktionen wie Screenshot, Bedienungshilfen oder einen Kurzbefehl starten.",
    aliases: ["tap back iphone", "double tap back", "back tap screenshot", "hinten tippen iphone", "rückseite tippen", "doppeltippen rückseite"],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    steps: [
      "Öffne die Einstellungen",
      "Gehe zu Bedienungshilfen → Tippen",
      "Öffne Auf Rückseite tippen",
      "Wähle Doppeltippen oder Dreimal tippen",
      "Wähle eine Aktion oder einen Kurzbefehl"
    ],
    settings: {
      path: ["Einstellungen", "Bedienungshilfen", "Tippen", "Auf Rückseite tippen"],
      openMode: "manual-system"
    },
    sources: [
      { label: "Apple Support — Auf Rückseite tippen", url: "https://support.apple.com/de-de/guide/iphone/iphaa57e7885/ios" }
    ]
  },
  {
    id: "ios-background-sounds",
    platform: "ios",
    title: "Regen, Meer oder Rauschen ohne zusätzliche App abspielen",
    summary: "Das iPhone bringt eigene Hintergrundgeräusche mit, die Umgebungsgeräusche überdecken und für Ruhe oder Konzentration sorgen können.",
    aliases: ["white noise", "rain sounds", "ocean sound", "sleep sounds", "weißes rauschen", "regen geräusche", "hintergrundgeräusche"],
    category: "wellbeing",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: [
      "Öffne das Kontrollzentrum",
      "Füge Hintergrundgeräusche hinzu, falls die Funktion dort noch fehlt",
      "Halte die Steuerung für Hintergrundgeräusche gedrückt",
      "Wähle Geräusch und Lautstärke"
    ],
    settings: {
      path: ["Kontrollzentrum", "Hintergrundgeräusche"],
      openMode: "manual-system"
    },
    sources: [
      { label: "Apple Support — Hintergrundgeräusche", url: "https://support.apple.com/de-de/109346" }
    ]
  },
  {
    id: "ios-sound-recognition",
    platform: "ios",
    title: "Wichtige Geräusche vom iPhone erkennen lassen",
    summary: "Die Geräuscherkennung kann ausgewählte Töne wie Türklingel, Sirene oder Babyweinen erkennen und dich benachrichtigen.",
    aliases: ["doorbell notification", "hear alarm", "baby crying alert", "türklingel erkennen", "geräusch erkennen", "alarm erkennen"],
    category: "accessibility",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "howto"],
    requirements: ["Nicht als sicherheitskritisches Notfall-Erkennungssystem gedacht"],
    steps: [
      "Öffne die Einstellungen",
      "Gehe zu Bedienungshilfen → Geräuscherkennung",
      "Aktiviere die Geräuscherkennung",
      "Wähle die Geräusche aus, die dein iPhone erkennen soll"
    ],
    settings: {
      path: ["Einstellungen", "Bedienungshilfen", "Geräuscherkennung"],
      openMode: "manual-system"
    },
    sources: [
      { label: "Apple Support — Geräuscherkennung", url: "https://support.apple.com/guide/iphone/use-sound-recognition-iphf2dc33312/ios" }
    ]
  },
  {
    id: "ios-leave-location-automation",
    platform: "ios",
    title: "Beim Ankommen oder Verlassen eines Ortes etwas automatisch ausführen",
    summary: "Persönliche Automationen in Kurzbefehle können auf Ankunft oder Verlassen reagieren. Auch WLAN, Bluetooth, NFC oder Akkustand können Auslöser sein.",
    aliases: ["message when leaving work", "when i leave home", "location automation", "wenn ich arbeit verlasse nachricht", "ankunft automation", "ort verlassen automation", "beim losfahren navigation starten"],
    category: "automation",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 4,
    intents: ["automation", "howto"],
    entities: ["shortcuts"],
    voice: {
      route: "shortcut",
      note: "Kurzbefehle sind auch eine wichtige Brücke für Siri-Aktionen, die eine App nicht direkt per Sprache anbietet."
    },
    steps: [
      "Öffne Kurzbefehle",
      "Öffne Automation",
      "Erstelle eine persönliche Automation",
      "Wähle Ankunft oder Verlassen",
      "Wähle den gewünschten Ort",
      "Füge die gewünschte Aktion hinzu und prüfe die Datenschutzoptionen"
    ],
    sources: [
      { label: "Apple Support — Automationen in Kurzbefehle", url: "https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios" }
    ]
  }
];
