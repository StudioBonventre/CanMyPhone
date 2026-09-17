import type { Solution } from "../types";

/**
 * Solutions that CanMyPhone can partly or fully execute through documented public APIs.
 * They live separately from the editorial knowledge set so execution capabilities stay auditable.
 */
export const actionSolutions: Solution[] = [
  {
    id: "ios-set-brightness",
    platform: "ios",
    title: "Displayhelligkeit direkt einstellen",
    summary: "CanMyPhone kann die Helligkeit seiner aktuellen iPhone-Sitzung über die öffentliche iOS-Helligkeits-API setzen.",
    aliases: [
      "helligkeit einstellen",
      "helligkeit auf",
      "display heller",
      "display dunkler",
      "brightness",
      "set brightness",
      "mach mein display heller"
    ],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto", "general"],
    steps: ["Wähle die gewünschte Helligkeit", "CanMyPhone setzt sie direkt"],
    sources: [
      { label: "Expo Brightness — System brightness", url: "https://docs.expo.dev/versions/latest/sdk/brightness/" }
    ]
  },
  {
    id: "ios-canmyphone-notifications",
    platform: "ios",
    title: "Benachrichtigungen für CanMyPhone erlauben",
    summary: "CanMyPhone kann den echten iOS-Berechtigungsdialog direkt anzeigen. Wurde die Berechtigung schon abgelehnt, öffnet die App die passenden Benachrichtigungseinstellungen.",
    aliases: [
      "benachrichtigungen erlauben",
      "notifications erlauben",
      "canmyphone notifications",
      "mitteilungen erlauben",
      "benachrichtigung aktivieren"
    ],
    category: "permissions",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto"],
    steps: ["CanMyPhone prüft den aktuellen Status", "Bestätige bei Bedarf den iOS-Dialog"],
    settings: {
      path: ["Einstellungen", "Mitteilungen", "CanMyPhone"],
      openMode: "app-settings",
      permission: "notifications",
      note: "Beim ersten Mal zeigt iOS den Systemdialog. Nach einer Ablehnung führt CanMyPhone zu den offiziellen App-Einstellungen."
    },
    sources: [
      { label: "Apple — Asking permission to use notifications", url: "https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications" }
    ]
  },
  {
    id: "ios-canmyphone-camera",
    platform: "ios",
    title: "Kamerazugriff für CanMyPhone erlauben",
    summary: "Wenn eine CanMyPhone-Funktion die Kamera benötigt, kann die App den offiziellen iOS-Berechtigungsdialog anzeigen.",
    aliases: ["kamera erlauben", "kamerazugriff erlauben", "camera permission", "canmyphone kamera"],
    category: "permissions",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto"],
    steps: ["CanMyPhone prüft den aktuellen Status", "Bestätige bei Bedarf den iOS-Dialog"],
    settings: {
      path: ["Einstellungen", "CanMyPhone", "Kamera"],
      openMode: "app-settings",
      permission: "camera"
    },
    sources: [
      { label: "Apple — Requesting authorization to capture and save media", url: "https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media" }
    ]
  },
  {
    id: "ios-canmyphone-microphone",
    platform: "ios",
    title: "Mikrofonzugriff für CanMyPhone erlauben",
    summary: "CanMyPhone kann den offiziellen iOS-Mikrofon-Dialog genau dann anzeigen, wenn du eine passende Funktion startest.",
    aliases: ["mikrofon erlauben", "mikrofonzugriff", "microphone permission", "canmyphone mikrofon"],
    category: "permissions",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto"],
    steps: ["CanMyPhone prüft den aktuellen Status", "Bestätige bei Bedarf den iOS-Dialog"],
    settings: {
      path: ["Einstellungen", "CanMyPhone", "Mikrofon"],
      openMode: "app-settings",
      permission: "microphone"
    },
    sources: [
      { label: "Apple — Requesting authorization to capture and save media", url: "https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media" }
    ]
  },
  {
    id: "ios-canmyphone-photos",
    platform: "ios",
    title: "Fotozugriff für CanMyPhone erlauben",
    summary: "CanMyPhone kann den offiziellen iOS-Dialog für die Fotomediathek anzeigen, wenn eine ausdrücklich gestartete Funktion ihn benötigt.",
    aliases: ["fotos erlauben", "fotomediathek erlauben", "photo permission", "canmyphone fotos"],
    category: "permissions",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto"],
    steps: ["CanMyPhone prüft den aktuellen Status", "Wähle im iOS-Dialog den gewünschten Fotozugriff"],
    settings: {
      path: ["Einstellungen", "CanMyPhone", "Fotos"],
      openMode: "app-settings",
      permission: "photos"
    },
    sources: [
      { label: "Apple — PhotoKit authorization", url: "https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app" }
    ]
  }
];
