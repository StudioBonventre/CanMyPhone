import type { Solution } from "../types";

export type Top100Setting = {
  rank: number;
  solutionId: string;
  title: string;
  category: string;
  query: string;
};

type Definition = readonly [
  rank: number,
  solutionId: string,
  title: string,
  categoryLabel: string,
  query: string,
  path: readonly string[]
];

const APPLE_SETTINGS_SOURCE = "https://support.apple.com/guide/iphone/find-settings-iph079e1fe9d/27/ios/27";
const EXISTING_SOLUTION_IDS = new Set([
  "ios-set-brightness",
  "ios-enable-bluetooth",
  "ios-back-tap",
  "ios-sound-recognition"
]);

const categoryKey: Record<string, string> = {
  "Display": "display",
  "Batterie": "battery",
  "Mitteilungen": "notifications",
  "Ton & Haptik": "sound",
  "Fokus": "focus",
  "Verbindungen": "connectivity",
  "Datenschutz": "privacy",
  "Sicherheit": "security",
  "Bedienungshilfen": "accessibility",
  "Bedienung": "controls",
  "Personalisierung": "personalization",
  "Apps": "apps",
  "Tastatur": "keyboard",
  "Kamera": "camera",
  "Fotos": "photos",
  "Safari": "safari",
  "Passwörter": "passwords",
  "iCloud": "icloud",
  "App Store": "apps",
  "Bildschirmzeit": "screen-time"
};

const definitions: Definition[] = [
  [1, "ios-set-brightness", "Helligkeit einstellen", "Display", "Helligkeit auf 25 Prozent stellen", ["Einstellungen", "Anzeige & Helligkeit"]],
  [2, "top-setting-dark-mode", "Dunkelmodus aktivieren", "Display", "Dunkelmodus aktivieren", ["Einstellungen", "Anzeige & Helligkeit", "Erscheinungsbild"]],
  [3, "top-setting-auto-lock", "Automatische Sperre ändern", "Display", "Automatische Sperre auf 2 Minuten stellen", ["Einstellungen", "Anzeige & Helligkeit", "Automatische Sperre"]],
  [4, "top-setting-night-shift", "Night Shift einrichten", "Display", "Night Shift einrichten", ["Einstellungen", "Anzeige & Helligkeit", "Night Shift"]],
  [5, "top-setting-true-tone", "True Tone ein- oder ausschalten", "Display", "True Tone einschalten", ["Einstellungen", "Anzeige & Helligkeit", "True Tone"]],
  [6, "top-setting-text-size", "Textgröße ändern", "Display", "Text größer machen", ["Einstellungen", "Anzeige & Helligkeit", "Textgröße"]],
  [7, "top-setting-bold-text", "Fetten Text aktivieren", "Display", "Fetten Text aktivieren", ["Einstellungen", "Anzeige & Helligkeit", "Fetter Text"]],
  [8, "top-setting-reduce-white-point", "Weißpunkt reduzieren", "Display", "Weißpunkt reduzieren", ["Einstellungen", "Bedienungshilfen", "Anzeige & Textgröße", "Weißpunkt reduzieren"]],
  [9, "top-setting-always-on", "Always-On-Display einstellen", "Display", "Always On Display einstellen", ["Einstellungen", "Anzeige & Helligkeit", "Immer eingeschaltet"]],
  [10, "top-setting-raise-to-wake", "Beim Anheben aktivieren", "Display", "Beim Anheben aktivieren einschalten", ["Einstellungen", "Anzeige & Helligkeit", "Beim Anheben aktivieren"]],
  [11, "top-setting-battery-percentage", "Batterieanzeige in Prozent", "Batterie", "Batterie Prozent anzeigen", ["Einstellungen", "Batterie", "Batterieladung in %"]],
  [12, "top-setting-low-power", "Stromsparmodus aktivieren", "Batterie", "Stromsparmodus einschalten", ["Einstellungen", "Batterie", "Stromsparmodus"]],
  [13, "top-setting-adaptive-power", "Adaptiven Stromverbrauch aktivieren", "Batterie", "Adaptiven Stromverbrauch aktivieren", ["Einstellungen", "Batterie", "Strommodus", "Adaptiv"]],
  [14, "top-setting-charge-limit", "Ladelimit festlegen", "Batterie", "Ladelimit auf 80 Prozent stellen", ["Einstellungen", "Batterie", "Laden", "Ladelimit"]],
  [15, "top-setting-optimized-charging", "Optimiertes Laden aktivieren", "Batterie", "Optimiertes Laden aktivieren", ["Einstellungen", "Batterie", "Laden", "Optimiertes Laden"]],
  [16, "top-setting-background-refresh", "Hintergrundaktualisierung verwalten", "Batterie", "Hintergrundaktualisierung ausschalten", ["Einstellungen", "Allgemein", "Hintergrundaktualisierung"]],
  [17, "top-setting-app-notifications", "Mitteilungen einer App einstellen", "Mitteilungen", "Mitteilungen für eine App ändern", ["Einstellungen", "Mitteilungen"]],
  [18, "top-setting-scheduled-summary", "Geplante Übersicht einrichten", "Mitteilungen", "Geplante Übersicht einrichten", ["Einstellungen", "Mitteilungen", "Geplante Übersicht"]],
  [19, "top-setting-notification-previews", "Mitteilungsvorschau ändern", "Mitteilungen", "Mitteilungsvorschau nur entsperrt anzeigen", ["Einstellungen", "Mitteilungen", "Vorschauen zeigen"]],
  [20, "top-setting-notification-badges", "Kennzeichen an App-Symbolen ändern", "Mitteilungen", "App Kennzeichen ausschalten", ["Einstellungen", "Mitteilungen"]],
  [21, "top-setting-notification-sounds", "Mitteilungstöne ändern", "Mitteilungen", "Mitteilungston ändern", ["Einstellungen", "Mitteilungen"]],
  [22, "top-setting-haptics", "Haptik einstellen", "Ton & Haptik", "Haptik einstellen", ["Einstellungen", "Töne & Haptik", "Haptik"]],
  [23, "top-setting-ringtone", "Klingelton ändern", "Ton & Haptik", "Klingelton ändern", ["Einstellungen", "Töne & Haptik", "Klingelton"]],
  [24, "top-setting-keyboard-sounds", "Tastaturfeedback ändern", "Ton & Haptik", "Tastaturklicks ausschalten", ["Einstellungen", "Töne & Haptik", "Tastaturfeedback"]],
  [25, "top-setting-lock-sound", "Sperrton ein- oder ausschalten", "Ton & Haptik", "Sperrton ausschalten", ["Einstellungen", "Töne & Haptik", "Sperrton"]],
  [26, "top-setting-dnd", "Nicht stören einrichten", "Fokus", "Nicht stören einrichten", ["Einstellungen", "Fokus", "Nicht stören"]],
  [27, "top-setting-sleep-focus", "Schlafen-Fokus einrichten", "Fokus", "Schlafen Fokus einrichten", ["Einstellungen", "Fokus", "Schlafen"]],
  [28, "top-setting-driving-focus", "Fahren-Fokus automatisch aktivieren", "Fokus", "Fahren Fokus automatisch aktivieren", ["Einstellungen", "Fokus", "Fahren"]],
  [29, "top-setting-work-focus", "Arbeitsfokus einrichten", "Fokus", "Arbeitsfokus einrichten", ["Einstellungen", "Fokus", "Arbeit"]],
  [30, "top-setting-focus-schedule", "Fokus-Zeitplan festlegen", "Fokus", "Fokus Zeitplan festlegen", ["Einstellungen", "Fokus"]],
  [31, "top-setting-wifi", "WLAN verbinden und verwalten", "Verbindungen", "WLAN einschalten", ["Einstellungen", "WLAN"]],
  [32, "ios-enable-bluetooth", "Bluetooth einschalten", "Verbindungen", "Bluetooth einschalten", ["Einstellungen", "Bluetooth"]],
  [33, "top-setting-cellular-data", "Mobile Daten ein- oder ausschalten", "Verbindungen", "Mobile Daten einschalten", ["Einstellungen", "Mobilfunk", "Mobile Daten"]],
  [34, "top-setting-data-roaming", "Datenroaming einstellen", "Verbindungen", "Datenroaming einschalten", ["Einstellungen", "Mobilfunk", "Datenoptionen", "Datenroaming"]],
  [35, "top-setting-hotspot", "Persönlichen Hotspot aktivieren", "Verbindungen", "Persönlichen Hotspot aktivieren", ["Einstellungen", "Persönlicher Hotspot"]],
  [36, "top-setting-airplane-mode", "Flugmodus aktivieren", "Verbindungen", "Flugmodus einschalten", ["Einstellungen", "Flugmodus"]],
  [37, "top-setting-wifi-assist", "WLAN-Unterstützung einstellen", "Verbindungen", "WLAN Unterstützung ausschalten", ["Einstellungen", "Mobilfunk", "WLAN-Unterstützung"]],
  [38, "top-setting-vpn", "VPN konfigurieren", "Verbindungen", "VPN konfigurieren", ["Einstellungen", "Allgemein", "VPN & Geräteverwaltung", "VPN"]],
  [39, "top-setting-airdrop", "AirDrop-Empfang einstellen", "Verbindungen", "AirDrop nur für Kontakte einstellen", ["Einstellungen", "Allgemein", "AirDrop"]],
  [40, "top-setting-namedrop", "NameDrop ein- oder ausschalten", "Verbindungen", "NameDrop ausschalten", ["Einstellungen", "Allgemein", "AirDrop", "Geräte aneinanderhalten"]],
  [41, "top-setting-location-services", "Ortungsdienste verwalten", "Datenschutz", "Ortungsdienste ändern", ["Einstellungen", "Datenschutz & Sicherheit", "Ortungsdienste"]],
  [42, "top-setting-tracking", "App-Tracking-Anfragen verwalten", "Datenschutz", "Tracking Anfragen ausschalten", ["Einstellungen", "Datenschutz & Sicherheit", "Tracking"]],
  [43, "top-setting-camera-privacy", "Kamerazugriff für Apps verwalten", "Datenschutz", "Kamerazugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Kamera"]],
  [44, "top-setting-microphone-privacy", "Mikrofonzugriff für Apps verwalten", "Datenschutz", "Mikrofonzugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Mikrofon"]],
  [45, "top-setting-photos-privacy", "Fotozugriff für Apps verwalten", "Datenschutz", "Fotozugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Fotos"]],
  [46, "top-setting-contacts-permission", "Kontaktzugriff verwalten", "Datenschutz", "Kontaktzugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Kontakte"]],
  [47, "top-setting-local-network", "Lokales Netzwerk verwalten", "Datenschutz", "Lokales Netzwerk Zugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Lokales Netzwerk"]],
  [48, "top-setting-motion-fitness", "Bewegung & Fitness verwalten", "Datenschutz", "Bewegung und Fitness Zugriff verwalten", ["Einstellungen", "Datenschutz & Sicherheit", "Bewegung & Fitness"]],
  [49, "top-setting-analytics", "Analyse & Verbesserungen verwalten", "Datenschutz", "iPhone Analyse ausschalten", ["Einstellungen", "Datenschutz & Sicherheit", "Analyse & Verbesserungen"]],
  [50, "top-setting-safety-check", "Sicherheitscheck verwenden", "Sicherheit", "Sicherheitscheck öffnen", ["Einstellungen", "Datenschutz & Sicherheit", "Sicherheitscheck"]],
  [51, "top-setting-face-id", "Face ID einrichten", "Sicherheit", "Face ID einrichten", ["Einstellungen", "Face ID & Code"]],
  [52, "top-setting-passcode", "iPhone-Code ändern", "Sicherheit", "iPhone Code ändern", ["Einstellungen", "Face ID & Code", "Code ändern"]],
  [53, "top-setting-attention", "Aufmerksamkeitserkennung einstellen", "Sicherheit", "Aufmerksamkeitserkennung einschalten", ["Einstellungen", "Face ID & Code", "Aufmerksamkeitssensible Funktionen"]],
  [54, "top-setting-unlock-watch", "Mit Apple Watch entsperren", "Sicherheit", "Mit Apple Watch entsperren aktivieren", ["Einstellungen", "Face ID & Code", "Mit Apple Watch entsperren"]],
  [55, "top-setting-emergency-sos", "Notruf SOS einstellen", "Sicherheit", "Notruf SOS einstellen", ["Einstellungen", "Notruf SOS"]],
  [56, "top-setting-crash-detection", "Unfallerkennung einstellen", "Sicherheit", "Unfallerkennung einstellen", ["Einstellungen", "Notruf SOS", "Nach schwerem Unfall anrufen"]],
  [57, "top-setting-emergency-contacts", "Notfallkontakte festlegen", "Sicherheit", "Notfallkontakte festlegen", ["Health", "Profil", "Notfallpass", "Bearbeiten"]],
  [58, "top-setting-medical-id", "Notfallpass einrichten", "Sicherheit", "Notfallpass einrichten", ["Health", "Profil", "Notfallpass"]],
  [59, "top-setting-stolen-device", "Schutz für gestohlene Geräte aktivieren", "Sicherheit", "Schutz für gestohlene Geräte aktivieren", ["Einstellungen", "Face ID & Code", "Schutz für gestohlene Geräte"]],
  [60, "top-setting-find-my", "Mein iPhone suchen aktivieren", "Sicherheit", "Mein iPhone suchen aktivieren", ["Einstellungen", "Apple Account", "Wo ist?", "Mein iPhone suchen"]],
  [61, "ios-back-tap", "Auf Rückseite tippen einrichten", "Bedienungshilfen", "Auf Rückseite tippen einrichten", ["Einstellungen", "Bedienungshilfen", "Tippen", "Auf Rückseite tippen"]],
  [62, "top-setting-assistive-touch", "AssistiveTouch aktivieren", "Bedienungshilfen", "AssistiveTouch aktivieren", ["Einstellungen", "Bedienungshilfen", "Tippen", "AssistiveTouch"]],
  [63, "top-setting-voiceover", "VoiceOver aktivieren", "Bedienungshilfen", "VoiceOver aktivieren", ["Einstellungen", "Bedienungshilfen", "VoiceOver"]],
  [64, "top-setting-zoom", "Bildschirmzoom aktivieren", "Bedienungshilfen", "Bedienungshilfen Zoom aktivieren", ["Einstellungen", "Bedienungshilfen", "Zoom"]],
  [65, "top-setting-reduce-motion", "Bewegung reduzieren", "Bedienungshilfen", "Bewegung reduzieren aktivieren", ["Einstellungen", "Bedienungshilfen", "Bewegung", "Bewegung reduzieren"]],
  [66, "ios-sound-recognition", "Geräuscherkennung einrichten", "Bedienungshilfen", "Geräuscherkennung einrichten", ["Einstellungen", "Bedienungshilfen", "Geräuscherkennung"]],
  [67, "top-setting-live-captions", "Live-Untertitel einstellen", "Bedienungshilfen", "Live Untertitel aktivieren", ["Einstellungen", "Bedienungshilfen", "Live-Untertitel"]],
  [68, "top-setting-hearing-devices", "Hörhilfen verbinden", "Bedienungshilfen", "Hörhilfen verbinden", ["Einstellungen", "Bedienungshilfen", "Hörhilfen"]],
  [69, "top-setting-accessibility-shortcut", "Bedienungshilfen-Kurzbefehl festlegen", "Bedienungshilfen", "Bedienungshilfen Kurzbefehl festlegen", ["Einstellungen", "Bedienungshilfen", "Kurzbefehl"]],
  [70, "top-setting-action-button", "Action Button belegen", "Bedienung", "Action Button einstellen", ["Einstellungen", "Action Button"]],
  [71, "top-setting-control-center", "Kontrollzentrum anpassen", "Bedienung", "Kontrollzentrum anpassen", ["Kontrollzentrum", "Steuerelement hinzufügen"]],
  [72, "top-setting-lock-screen", "Sperrbildschirm anpassen", "Personalisierung", "Sperrbildschirm anpassen", ["Sperrbildschirm", "Gedrückt halten", "Anpassen"]],
  [73, "top-setting-home-icons", "App-Symbole auf dem Home-Bildschirm ändern", "Personalisierung", "App Symbole groß oder dunkel einstellen", ["Home-Bildschirm", "Gedrückt halten", "Bearbeiten", "Anpassen"]],
  [74, "top-setting-app-library", "Neue Apps auf Home-Bildschirm oder App-Mediathek", "Personalisierung", "Neue Apps nur in App Mediathek", ["Einstellungen", "Home-Bildschirm & App-Mediathek"]],
  [75, "top-setting-default-browser", "Standardbrowser ändern", "Apps", "Standardbrowser ändern", ["Einstellungen", "Apps", "Standard-Apps", "Browser-App"]],
  [76, "top-setting-default-mail", "Standard-Mail-App ändern", "Apps", "Standard Mail App ändern", ["Einstellungen", "Apps", "Standard-Apps", "E-Mail"]],
  [77, "top-setting-keyboard-languages", "Tastaturen und Sprachen hinzufügen", "Tastatur", "Tastatur Sprache hinzufügen", ["Einstellungen", "Allgemein", "Tastatur", "Tastaturen"]],
  [78, "top-setting-autocorrect", "Autokorrektur ein- oder ausschalten", "Tastatur", "Autokorrektur ausschalten", ["Einstellungen", "Allgemein", "Tastatur", "Auto-Korrektur"]],
  [79, "top-setting-predictive-text", "Textvorschläge einstellen", "Tastatur", "Textvorschläge ausschalten", ["Einstellungen", "Allgemein", "Tastatur", "Vorschläge"]],
  [80, "top-setting-one-handed-keyboard", "Einhandtastatur aktivieren", "Tastatur", "Einhandtastatur aktivieren", ["Einstellungen", "Allgemein", "Tastatur", "Einhandtastatur"]],
  [81, "top-setting-dictation", "Diktierfunktion aktivieren", "Tastatur", "Diktierfunktion aktivieren", ["Einstellungen", "Allgemein", "Tastatur", "Diktierfunktion aktivieren"]],
  [82, "top-setting-camera-grid", "Kamera-Raster aktivieren", "Kamera", "Kamera Raster aktivieren", ["Einstellungen", "Kamera", "Raster"]],
  [83, "top-setting-camera-formats", "Kameraformat ändern", "Kamera", "Kamera Format ändern", ["Einstellungen", "Kamera", "Formate"]],
  [84, "top-setting-video-resolution", "Videoauflösung einstellen", "Kamera", "Video auf 4K 60 einstellen", ["Einstellungen", "Kamera", "Video aufnehmen"]],
  [85, "top-setting-preserve-camera", "Kameraeinstellungen beibehalten", "Kamera", "Kamera Einstellungen beibehalten", ["Einstellungen", "Kamera", "Einstellungen beibehalten"]],
  [86, "top-setting-live-photo", "Live Photos standardmäßig ein- oder ausschalten", "Kamera", "Live Photos standardmäßig ausschalten", ["Einstellungen", "Kamera", "Einstellungen beibehalten", "Live Photo"]],
  [87, "top-setting-macro-control", "Makro-Steuerung aktivieren", "Kamera", "Makro Steuerung aktivieren", ["Einstellungen", "Kamera", "Makro-Steuerung"]],
  [88, "top-setting-photographic-styles", "Fotografische Stile einstellen", "Kamera", "Fotografischen Stil ändern", ["Einstellungen", "Kamera", "Fotografische Stile"]],
  [89, "top-setting-icloud-photos", "iCloud-Fotos synchronisieren", "Fotos", "iCloud Fotos synchronisieren", ["Einstellungen", "Apple Account", "iCloud", "Fotos"]],
  [90, "top-setting-hidden-album", "Album Ausgeblendet ein- oder ausblenden", "Fotos", "Album Ausgeblendet verbergen", ["Einstellungen", "Apps", "Fotos", "Album Ausgeblendet anzeigen"]],
  [91, "top-setting-safari-search-engine", "Safari-Suchmaschine ändern", "Safari", "Safari Suchmaschine ändern", ["Einstellungen", "Apps", "Safari", "Suchmaschine"]],
  [92, "top-setting-safari-popups", "Pop-ups in Safari blockieren", "Safari", "Safari Popups blockieren", ["Einstellungen", "Apps", "Safari", "Pop-ups blockieren"]],
  [93, "top-setting-safari-tracking", "Cross-Site-Tracking verhindern", "Safari", "Cross Site Tracking verhindern", ["Einstellungen", "Apps", "Safari", "Cross-Site-Tracking verhindern"]],
  [94, "top-setting-safari-extensions", "Safari-Erweiterungen verwalten", "Safari", "Safari Erweiterungen verwalten", ["Einstellungen", "Apps", "Safari", "Erweiterungen"]],
  [95, "top-setting-password-autofill", "Passwörter automatisch ausfüllen", "Passwörter", "Passwörter automatisch ausfüllen", ["Einstellungen", "Allgemein", "AutoFill & Passwörter"]],
  [96, "top-setting-icloud-backup", "iCloud-Backup aktivieren", "iCloud", "iCloud Backup aktivieren", ["Einstellungen", "Apple Account", "iCloud", "iCloud-Backup"]],
  [97, "top-setting-icloud-sync", "iCloud-Synchronisierung pro App einstellen", "iCloud", "iCloud Synchronisierung für Apps ändern", ["Einstellungen", "Apple Account", "iCloud", "In iCloud gespeichert"]],
  [98, "top-setting-app-download-cellular", "App-Downloads über Mobilfunk erlauben", "App Store", "App Downloads über Mobilfunk erlauben", ["Einstellungen", "Apps", "App Store", "App-Downloads"]],
  [99, "top-setting-screen-time", "Bildschirmzeit einrichten", "Bildschirmzeit", "Bildschirmzeit einrichten", ["Einstellungen", "Bildschirmzeit"]],
  [100, "top-setting-content-restrictions", "Inhalts- & Datenschutzbeschränkungen einrichten", "Bildschirmzeit", "Inhalts und Datenschutzbeschränkungen einrichten", ["Einstellungen", "Bildschirmzeit", "Beschränkungen"]]
];

export const top100Settings: Top100Setting[] = definitions.map(
  ([rank, solutionId, title, category, query]) => ({ rank, solutionId, title, category, query })
);

export const top100GuideSolutions: Solution[] = definitions
  .filter(([, solutionId]) => !EXISTING_SOLUTION_IDS.has(solutionId))
  .map(([, solutionId, title, categoryLabel, query, path]) => {
    const first = path[0] ?? "Einstellungen";
    const remainder = path.slice(1);
    const steps = [
      first === "Einstellungen" ? "Öffne die Einstellungen" : `Öffne ${first}`,
      ...(remainder.length ? [`Gehe zu ${remainder.join(" → ")}`] : []),
      `Passe „${title}“ nach deinem Wunsch an`
    ];

    return {
      id: solutionId,
      platform: "ios",
      title,
      summary: "CanMyPhone führt dich auf dem kürzesten öffentlichen iOS-Weg zu dieser Einstellung.",
      aliases: [query, title, title.toLowerCase()],
      category: categoryKey[categoryLabel] ?? "settings",
      builtIn: true,
      cost: "Kostenlos",
      setupMinutes: 1,
      intents: ["enable", "howto"],
      steps,
      settings: {
        path: [...path],
        openMode: "manual-system",
        note: "CanMyPhone verwendet nur öffentliche iOS-Wege. Wenn Apple keinen Deep Link anbietet, bleibt dein Fortschritt im Guide erhalten."
      },
      sources: [
        { label: "Apple iPhone Benutzerhandbuch — Einstellungen finden", url: APPLE_SETTINGS_SOURCE }
      ]
    };
  });
