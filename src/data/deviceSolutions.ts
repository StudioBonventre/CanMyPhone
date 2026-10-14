import type { Solution } from "../types";
import { article, guide, settingsPath } from "./sourceHelpers";

/**
 * Everyday device basics: battery, display, sound, controls and storage.
 * Every entry links to the matching topic in Apple's official iPhone User Guide.
 */
export const deviceSolutions: Solution[] = [
  // ── Battery ────────────────────────────────────────────────────────────
  {
    id: "ios-low-power-mode",
    platform: "ios",
    title: "Akku länger halten mit dem Stromsparmodus",
    summary: "Der Stromsparmodus reduziert Hintergrundaktivität und Effekte, damit der Akku deutlich länger durchhält.",
    aliases: [
      "akku hält nicht lange", "akku leer", "akku schnell leer", "batterie schnell leer", "akku sparen", "strom sparen",
      "stromsparmodus", "energiesparmodus", "low power mode", "battery drains fast", "save battery", "handy hält nicht durch"
    ],
    category: "battery",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: [
      "Öffne die Einstellungen",
      "Tippe auf Batterie",
      "Aktiviere Stromsparmodus",
      "Tipp: Du kannst den Schalter auch ins Kontrollzentrum legen, dann geht es mit einem Tipp"
    ],
    settings: settingsPath("Batterie", "Stromsparmodus"),
    sources: [guide("iphcab9aecd1", "Stromsparmodus verwenden")]
  },
  {
    id: "ios-battery-percentage",
    platform: "ios",
    title: "Akkustand in Prozent anzeigen",
    summary: "Statt nur des Batteriesymbols zeigt dein iPhone die genaue Prozentzahl in der Statusleiste.",
    aliases: [
      "akku prozent", "batterie prozent", "akkustand anzeigen", "wie viel akku", "battery percentage",
      "prozent anzeigen akku", "akkuanzeige"
    ],
    category: "battery",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: ["Öffne die Einstellungen", "Tippe auf Batterie", "Aktiviere Batterieladung in Prozent"],
    settings: settingsPath("Batterie", "Batterieladung in Prozent"),
    sources: [guide("iph4747a74a9", "Batterieladung in Prozent anzeigen")]
  },
  {
    id: "ios-charge-limit",
    platform: "ios",
    title: "Akku schonen: Ladelimit und optimiertes Laden",
    summary: "Dein iPhone kann das Laden bei einem Limit stoppen oder das Laden über 80 % hinauszögern, bis du es brauchst. Das schont die Batterie langfristig.",
    aliases: [
      "akku schonen", "batterie schonen", "ladelimit", "nur bis 80 laden", "80 prozent laden", "optimiertes laden",
      "akku geht kaputt", "akku altert", "charge limit", "optimized charging", "über nacht laden schädlich"
    ],
    category: "battery",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    requirements: ["Ladelimit: iPhone 15 oder neuer", "Optimiertes Laden: alle unterstützten Modelle"],
    steps: [
      "Öffne die Einstellungen",
      "Tippe auf Batterie und dann auf Ladevorgang",
      "Wähle ein Ladelimit (z. B. 80 %) oder aktiviere Optimiertes Laden"
    ],
    settings: settingsPath("Batterie", "Ladevorgang"),
    sources: [
      guide("iph0777c60aa", "Ladelimit festlegen"),
      guide("iph9202bbd07", "Ladevorgang der Batterie optimieren")
    ]
  },
  {
    id: "ios-battery-health",
    platform: "ios",
    title: "Batteriezustand und Akkufresser prüfen",
    summary: "Unter Batterie siehst du, welche Apps am meisten Strom verbrauchen und wie gut deine Batterie noch ist.",
    aliases: [
      "batteriezustand", "akkuzustand", "akku kaputt", "akku tauschen", "welche app frisst akku", "akkufresser",
      "battery health", "what drains my battery", "maximale kapazität"
    ],
    category: "battery",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "general"],
    steps: [
      "Öffne die Einstellungen und tippe auf Batterie",
      "Unter der Grafik siehst du, welche Apps wie viel verbraucht haben",
      "Tippe auf Batteriezustand, um Kapazität und Empfehlungen zu sehen"
    ],
    settings: settingsPath("Batterie"),
    sources: [guide("iphd453d043a", "Batterienutzung und Batteriezustand verstehen")]
  },

  // ── Display ────────────────────────────────────────────────────────────
  {
    id: "ios-dark-mode-night-shift",
    platform: "ios",
    title: "Augen schonen: Dunkelmodus und Night Shift",
    summary: "Der Dunkelmodus macht die Oberfläche dunkel, Night Shift macht die Farben abends wärmer. Beides lässt sich automatisch nach Uhrzeit schalten.",
    aliases: [
      "dunkelmodus", "dark mode", "nachtmodus display", "night shift", "blaulicht", "blaulichtfilter", "augen schonen",
      "bildschirm zu hell abends", "display gelblich", "dunkles design", "augen tun weh"
    ],
    category: "display",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "howto", "automation"],
    steps: [
      "Öffne die Einstellungen und tippe auf Anzeige & Helligkeit",
      "Wähle Dunkel – oder aktiviere Automatisch, damit es abends von selbst umschaltet",
      "Tippe auf Night Shift und wähle Geplant, damit die Farben abends wärmer werden"
    ],
    settings: settingsPath("Anzeige & Helligkeit"),
    sources: [guide("iph60ba71065", "Helligkeit und Farbbalance anpassen")]
  },
  {
    id: "ios-auto-lock",
    platform: "ios",
    title: "Bildschirm geht nicht so schnell aus",
    summary: "Mit der automatischen Sperre legst du fest, wie lange das Display an bleibt, bevor es sich ausschaltet.",
    aliases: [
      "bildschirm geht aus", "display geht zu schnell aus", "bildschirm bleibt nicht an", "automatische sperre",
      "auto lock", "screen turns off", "display länger an", "bildschirm sperrt sich"
    ],
    category: "display",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "enable"],
    steps: ["Öffne die Einstellungen", "Tippe auf Anzeige & Helligkeit", "Tippe auf Automatische Sperre und wähle eine längere Zeit"],
    settings: settingsPath("Anzeige & Helligkeit", "Automatische Sperre"),
    sources: [guide("iph7117338a8", "Display länger aktiviert lassen")]
  },
  {
    id: "ios-bigger-text",
    platform: "ios",
    title: "Größere Schrift auf dem iPhone",
    summary: "Du kannst die Schrift systemweit vergrößern und fett darstellen – das wirkt in allen Apps, die das unterstützen.",
    aliases: [
      "schrift größer", "schrift zu klein", "text größer", "größere schrift", "kann nichts lesen", "buchstaben größer",
      "textgröße", "fette schrift", "bigger text", "font size", "larger text", "schlecht lesen"
    ],
    category: "accessibility",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "enable"],
    steps: [
      "Öffne die Einstellungen und tippe auf Anzeige & Helligkeit",
      "Tippe auf Textgröße und ziehe den Regler nach rechts",
      "Für noch größere Schrift: Bedienungshilfen → Anzeige & Textgröße → Größerer Text",
      "Optional: Aktiviere Fetter Text für bessere Lesbarkeit"
    ],
    settings: settingsPath("Anzeige & Helligkeit", "Textgröße"),
    sources: [
      guide("iphd6804774e", "Display und Texteinstellungen anpassen"),
      article("102453", "Schriftgröße ändern")
    ]
  },
  {
    id: "ios-standby",
    platform: "ios",
    title: "iPhone als Nachttisch-Uhr: StandBy",
    summary: "Wenn das iPhone quer liegt und lädt, zeigt StandBy eine große Uhr, Fotos oder Widgets – ideal auf dem Nachttisch oder Schreibtisch.",
    aliases: [
      "standby", "nachttisch uhr", "wecker anzeige", "große uhr", "iphone als uhr", "uhr beim laden",
      "bedside clock", "nightstand mode"
    ],
    category: "display",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto", "discover"],
    requirements: ["iPhone muss laden und quer liegen"],
    steps: [
      "Öffne die Einstellungen und tippe auf StandBy",
      "Aktiviere StandBy",
      "Lege das iPhone quer auf ein Ladegerät und sperre es",
      "Wische nach links oder rechts, um zwischen Uhr, Fotos und Widgets zu wechseln"
    ],
    settings: settingsPath("StandBy"),
    sources: [guide("iph878d77632", "StandBy verwenden")]
  },
  {
    id: "ios-rotation-lock",
    platform: "ios",
    title: "Bildschirm dreht sich nicht (mehr)",
    summary: "Die Ausrichtungssperre im Kontrollzentrum verhindert, dass sich der Bildschirm dreht – oder ist der Grund, warum er es nicht tut.",
    aliases: [
      "bildschirm dreht sich nicht", "display dreht nicht", "querformat geht nicht", "bildschirm drehen",
      "ausrichtungssperre", "hochformatsperre", "rotation lock", "screen won't rotate", "drehsperre"
    ],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "enable"],
    steps: [
      "Streiche vom rechten oberen Bildschirmrand nach unten, um das Kontrollzentrum zu öffnen",
      "Tippe auf das Schloss-Symbol mit dem Pfeil (Ausrichtungssperre)",
      "Ist es hervorgehoben, ist die Drehung gesperrt – tippe erneut zum Entsperren"
    ],
    sources: [guide("iph3badf94ec", "iPhone-Bildschirm drehen")]
  },
  {
    id: "ios-wallpaper",
    platform: "ios",
    title: "Eigenen Sperrbildschirm und Hintergrund gestalten",
    summary: "Du kannst Fotos, Uhrstil und Widgets auf dem Sperrbildschirm anpassen und mehrere Varianten anlegen.",
    aliases: [
      "hintergrundbild ändern", "hintergrund ändern", "sperrbildschirm ändern", "wallpaper", "foto als hintergrund",
      "sperrbildschirm anpassen", "lock screen"
    ],
    category: "personalize",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["howto"],
    steps: [
      "Berühre den Sperrbildschirm lange, bis Anpassen erscheint",
      "Tippe auf + für einen neuen Hintergrund oder auf Anpassen",
      "Wähle ein Foto oder einen Stil und füge bei Bedarf Widgets hinzu",
      "Tippe auf Hinzufügen bzw. Fertig"
    ],
    sources: [
      guide("iph3d267104", "Hintergrundbild ändern"),
      guide("iphb8f1bf206", "Widgets hinzufügen, bearbeiten und entfernen")
    ]
  },

  // ── Sound & controls ───────────────────────────────────────────────────
  {
    id: "ios-flashlight",
    platform: "ios",
    title: "Taschenlampe einschalten",
    summary: "Die Taschenlampe ist mit einem Tipp im Kontrollzentrum oder auf dem Sperrbildschirm erreichbar – oder per Siri.",
    aliases: ["taschenlampe", "licht an", "lampe an", "flashlight", "torch", "handylampe", "licht vom handy"],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["enable", "howto", "voice-control"],
    entities: ["siri"],
    voice: { route: "siri-direct", invocation: "„Siri, mach die Taschenlampe an.“" },
    steps: [
      "Öffne das Kontrollzentrum (vom rechten oberen Rand nach unten streichen)",
      "Tippe auf das Taschenlampen-Symbol",
      "Alternativ: Auf dem Sperrbildschirm das Lampensymbol lange drücken"
    ],
    sources: [guide("iphf574afb44", "Taschenlampe ein- oder ausschalten")]
  },
  {
    id: "ios-control-center",
    platform: "ios",
    title: "Kontrollzentrum anpassen",
    summary: "Lege die Schalter, die du oft brauchst – etwa Bildschirmaufnahme, Timer oder Stromsparmodus – direkt ins Kontrollzentrum.",
    aliases: [
      "kontrollzentrum", "kontrollzentrum anpassen", "schnellzugriff", "control center", "schalter hinzufügen",
      "zu viele taps", "schneller erreichen"
    ],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "discover"],
    steps: [
      "Öffne das Kontrollzentrum",
      "Berühre eine freie Stelle lange oder tippe auf +",
      "Tippe auf Steuerelement hinzufügen und wähle, was du brauchst",
      "Ziehe Elemente an die gewünschte Stelle"
    ],
    sources: [guide("iph59095ec58", "Kontrollzentrum verwenden und anpassen")]
  },
  {
    id: "ios-action-button",
    platform: "ios",
    title: "Aktionstaste mit einer Funktion belegen",
    summary: "Die Aktionstaste an der Seite kann Taschenlampe, Kamera, Stummschalten, einen Kurzbefehl und mehr direkt starten.",
    aliases: [
      "aktionstaste", "action button", "seitentaste belegen", "taste an der seite", "stummschalter ersetzt",
      "knopf belegen"
    ],
    category: "controls",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    requirements: ["iPhone 15 Pro, iPhone 16 oder neuer mit Aktionstaste"],
    steps: [
      "Öffne die Einstellungen und tippe auf Aktionstaste",
      "Wische durch die Aktionen und wähle eine aus",
      "Für eigene Abläufe: Wähle Kurzbefehl und dann deinen Kurzbefehl"
    ],
    settings: settingsPath("Aktionstaste"),
    sources: [guide("iphe89d61d66", "Aktionstaste verwenden und anpassen")]
  },
  {
    id: "ios-sounds-ringtones",
    platform: "ios",
    title: "Klingelton, Vibration und Lautlos richtig einstellen",
    summary: "Unter Töne & Haptik stellst du Klingelton, Mitteilungstöne und Vibration ein – auch getrennt für Lautlos-Modus.",
    aliases: [
      "klingelton ändern", "klingelton", "höre mein handy nicht klingeln", "handy klingelt nicht", "vibration", "vibriert nicht", "höre anrufe nicht", "zu leise klingeln",
      "ringtone", "lautlos", "stumm", "vibration ausschalten", "töne ändern"
    ],
    category: "sound",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Töne & Haptik",
      "Stelle die Lautstärke für Klingelton und Hinweise ein",
      "Tippe auf Klingelton, um einen anderen Ton zu wählen",
      "Unter Haptik legst du fest, wann das iPhone vibriert"
    ],
    settings: settingsPath("Töne & Haptik"),
    sources: [
      guide("iph07c867f28", "Töne und Vibrationsverhalten ändern"),
      guide("iph37c04838", "Klingeltöne auswählen")
    ]
  },
  {
    id: "ios-headphone-safety",
    platform: "ios",
    title: "Gehör schützen: Kopfhörer-Lautstärke begrenzen",
    summary: "Das iPhone kann zu laute Kopfhörer-Wiedergabe automatisch reduzieren und zeigt dir deinen Audiopegel.",
    aliases: [
      "kopfhörer zu laut", "gehör schützen", "lautstärke begrenzen", "maximale lautstärke", "laute kopfhörer reduzieren",
      "headphone safety", "hörschutz", "kind hört zu laut"
    ],
    category: "sound",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Töne & Haptik",
      "Tippe auf Kopfhörersicherheit",
      "Aktiviere Laute Töne reduzieren und wähle einen Grenzwert"
    ],
    settings: settingsPath("Töne & Haptik", "Kopfhörersicherheit"),
    sources: [guide("iph0596a9152", "Audiopegel von Kopfhörern prüfen")]
  },
  {
    id: "ios-focus",
    platform: "ios",
    title: "Ruhe vor Mitteilungen: Fokus und Nicht stören",
    summary: "Ein Fokus stummschaltet Mitteilungen und Anrufe – bis auf die Personen und Apps, die du erlaubst. Er kann sich auch nach Zeit oder Ort automatisch einschalten.",
    aliases: [
      "nicht stören", "do not disturb", "fokus", "focus", "zu viele benachrichtigungen", "ständig benachrichtigungen",
      "ruhe haben", "handy stumm nachts", "nur wichtige anrufe", "arbeit fokus", "abgelenkt", "nervt mich das handy"
    ],
    category: "wellbeing",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["enable", "howto", "automation"],
    steps: [
      "Öffne die Einstellungen und tippe auf Fokus",
      "Wähle Nicht stören oder einen anderen Fokus (z. B. Arbeit, Schlafen)",
      "Lege fest, welche Personen und Apps dich trotzdem erreichen dürfen",
      "Füge unter Zeitplan eine Uhrzeit oder einen Ort hinzu, damit er automatisch startet"
    ],
    settings: settingsPath("Fokus"),
    sources: [guide("iphd6288a67f", "Fokus einrichten")]
  },
  {
    id: "ios-notification-settings",
    platform: "ios",
    title: "Nervige Mitteilungen einer App abschalten",
    summary: "Für jede App kannst du Mitteilungen ganz abschalten, leiser machen oder gesammelt zu festen Zeiten bekommen.",
    aliases: [
      "benachrichtigungen ausschalten", "mitteilungen ausschalten", "app nervt mit benachrichtigungen", "zu viele mitteilungen",
      "notifications off", "push ausschalten", "mitteilungsübersicht", "benachrichtigungen bündeln"
    ],
    category: "wellbeing",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Mitteilungen",
      "Wähle die App, die dich stört",
      "Deaktiviere Mitteilungen erlauben – oder wähle Zeitlich geplante Übersicht"
    ],
    settings: settingsPath("Mitteilungen"),
    sources: [guide("iph7c3d96bab", "Mitteilungseinstellungen ändern")]
  },
  {
    id: "ios-driving-focus",
    platform: "ios",
    title: "Keine Ablenkung beim Autofahren",
    summary: "Der Fokus Fahren schaltet sich automatisch ein, wenn du fährst oder mit CarPlay verbunden bist, und kann automatisch antworten.",
    aliases: [
      "beim autofahren nicht stören", "fokus fahren", "fahren nicht stören", "driving focus", "ablenkung auto",
      "automatisch antworten auto", "nachrichten beim fahren"
    ],
    category: "car",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "automation", "howto"],
    entities: ["car"],
    steps: [
      "Öffne die Einstellungen und tippe auf Fokus",
      "Tippe auf Fahren (oder + und dann Fahren)",
      "Wähle unter Automatisch aktivieren: Beim Fahren oder Mit CarPlay",
      "Aktiviere bei Bedarf Automatisch antworten"
    ],
    settings: settingsPath("Fokus", "Fahren"),
    sources: [guide("iphae754533b", "Konzentration beim Fahren erhalten")]
  },

  // ── Storage, apps & system ─────────────────────────────────────────────
  {
    id: "ios-free-storage",
    platform: "ios",
    title: "Speicher voll? Platz schaffen",
    summary: "Unter iPhone-Speicher siehst du, was Platz belegt, und bekommst Empfehlungen – etwa ungenutzte Apps auslagern, ohne Daten zu verlieren.",
    aliases: [
      "speicher voll", "kein speicherplatz", "speicherplatz", "handy voll", "iphone voll", "platz schaffen",
      "storage full", "free up space", "apps auslagern", "speicher freigeben", "kann keine fotos mehr machen"
    ],
    category: "storage",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 5,
    intents: ["howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Allgemein",
      "Tippe auf iPhone-Speicher",
      "Folge den Empfehlungen, z. B. Unbenutzte Apps auslagern",
      "Tippe auf große Apps, um deren Daten zu prüfen oder sie zu löschen"
    ],
    settings: settingsPath("Allgemein", "iPhone-Speicher"),
    sources: [guide("iph47c931112", "Speicher auf dem iPhone verwalten")]
  },
  {
    id: "ios-lock-hide-app",
    platform: "ios",
    title: "Eine App sperren oder ausblenden",
    summary: "Du kannst einzelne Apps mit Face ID schützen oder ganz verstecken, wenn jemand anderes dein iPhone benutzt.",
    aliases: [
      "app sperren", "app verstecken", "app ausblenden", "app mit face id schützen", "lock app", "hide app",
      "app passwort", "privatsphäre app"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "enable"],
    steps: [
      "Berühre das App-Symbol auf dem Home-Bildschirm lange",
      "Tippe auf Face ID erforderlich",
      "Wähle Face ID erforderlich (sperren) oder Ausblenden und Face ID erforderlich"
    ],
    sources: [guide("iph00f208d05", "App sperren oder ausblenden")]
  },
  {
    id: "ios-default-apps",
    platform: "ios",
    title: "Standard-Apps ändern",
    summary: "Lege fest, welcher Browser, welche Mail-App oder welche Navigations-App standardmäßig geöffnet wird.",
    aliases: [
      "standard app ändern", "standardbrowser", "chrome als standard", "default app", "standard mail app",
      "links öffnen in", "google maps als standard"
    ],
    category: "personalize",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: ["Öffne die Einstellungen", "Tippe auf Apps und dann auf Standard-Apps", "Wähle die Kategorie und die gewünschte App"],
    settings: settingsPath("Apps", "Standard-Apps"),
    sources: [guide("iphc57feab64", "Standard-Apps ändern")]
  },
  {
    id: "ios-subscriptions",
    platform: "ios",
    title: "Abos anzeigen und kündigen",
    summary: "Alle Abos, die über deinen Apple Account laufen, siehst und kündigst du an einer Stelle.",
    aliases: [
      "abo kündigen", "abonnement kündigen", "abos anzeigen", "was zahle ich", "app kostet monatlich",
      "cancel subscription", "probeabo kündigen", "abbuchung apple"
    ],
    category: "money",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die Einstellungen und tippe oben auf deinen Namen",
      "Tippe auf Abonnements",
      "Wähle ein Abo und tippe auf Abonnement kündigen"
    ],
    settings: settingsPath("Dein Name", "Abonnements"),
    sources: [guide("iph4e3e7324f", "Käufe und Abonnements anzeigen")]
  },
  {
    id: "ios-mobile-data",
    platform: "ios",
    title: "Mobile Daten sparen und pro App steuern",
    summary: "Unter Mobilfunk siehst du den Verbrauch pro App und kannst einzelnen Apps die mobilen Daten verbieten.",
    aliases: [
      "datenvolumen sparen", "mobile daten", "datenvolumen leer", "datenverbrauch", "app verbraucht daten",
      "mobile data", "roaming", "datenroaming", "internet unterwegs zu teuer"
    ],
    category: "connectivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Mobilfunk",
      "Scrolle zur Liste der Apps und sieh dir den Verbrauch an",
      "Schalte mobile Daten für einzelne Apps aus",
      "Unter Datenoptionen kannst du Datenroaming und den Datensparmodus einstellen"
    ],
    settings: settingsPath("Mobilfunk"),
    sources: [guide("iph3dd5f213", "Einstellungen für mobile Daten anzeigen oder ändern")]
  },
  {
    id: "ios-personal-hotspot",
    platform: "ios",
    title: "Internet mit Laptop oder Tablet teilen (Hotspot)",
    summary: "Mit dem persönlichen Hotspot wird dein iPhone zum WLAN für andere Geräte.",
    aliases: [
      "hotspot", "persönlicher hotspot", "internet teilen", "tethering", "laptop internet über handy",
      "personal hotspot", "wlan vom handy"
    ],
    category: "connectivity",
    builtIn: true,
    cost: "Kostenlos (je nach Mobilfunktarif)",
    setupMinutes: 2,
    intents: ["enable", "howto"],
    requirements: ["Mobilfunktarif mit Hotspot-Nutzung"],
    steps: [
      "Öffne die Einstellungen und tippe auf Persönlicher Hotspot",
      "Aktiviere Zugriff für andere erlauben",
      "Merke dir das WLAN-Passwort",
      "Verbinde das andere Gerät mit dem WLAN deines iPhone"
    ],
    settings: settingsPath("Persönlicher Hotspot"),
    sources: [guide("iph45447ca6", "Internetverbindung vom iPhone teilen")]
  },
  {
    id: "ios-share-wifi-password",
    platform: "ios",
    title: "WLAN-Passwort finden und teilen",
    summary: "Gespeicherte WLAN-Passwörter findest du in der App Passwörter – und kannst sie mit Freunden teilen.",
    aliases: [
      "wlan passwort", "wifi passwort", "wlan passwort vergessen", "wlan passwort teilen", "wifi password",
      "wlan schlüssel", "gäste wlan passwort"
    ],
    category: "connectivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: [
      "Öffne die App Passwörter",
      "Tippe auf WLAN",
      "Wähle das Netzwerk und tippe auf das Passwort, um es zu sehen oder zu kopieren",
      "Oder: Zeige den QR-Code, damit andere ihn scannen können"
    ],
    sources: [guide("iph96e6aa9bb", "WLAN-Passwort finden und teilen")]
  },
  {
    id: "ios-wifi-calling",
    platform: "ios",
    title: "Besserer Empfang zu Hause: WLAN-Anrufe",
    summary: "Bei schlechtem Mobilfunkempfang telefoniert dein iPhone über das WLAN – ohne zusätzliche App.",
    aliases: [
      "schlechter empfang", "kein netz zuhause", "wlan call", "wlan anrufe", "wifi calling", "telefonieren über wlan",
      "empfang im keller", "anrufe brechen ab"
    ],
    category: "connectivity",
    builtIn: true,
    cost: "Kostenlos (wenn dein Anbieter es unterstützt)",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    requirements: ["Dein Mobilfunkanbieter muss WLAN-Anrufe unterstützen"],
    steps: ["Öffne die Einstellungen und tippe auf Mobilfunk", "Tippe auf WLAN-Anrufe", "Aktiviere WLAN-Anrufe auf diesem iPhone"],
    settings: settingsPath("Mobilfunk", "WLAN-Anrufe"),
    sources: [guide("iph78f4697ca", "Anrufe über WLAN tätigen")]
  },
  {
    id: "ios-icloud-backup",
    platform: "ios",
    title: "Automatisches Backup aktivieren",
    summary: "Mit iCloud-Backup sichert sich dein iPhone automatisch, wenn es lädt, gesperrt ist und im WLAN hängt.",
    aliases: [
      "backup", "sicherung", "daten sichern", "icloud backup", "fotos sichern", "handy sichern",
      "angst daten zu verlieren", "back up iphone"
    ],
    category: "storage",
    builtIn: true,
    cost: "Kostenlos bis 5 GB, mehr mit iCloud+",
    setupMinutes: 2,
    intents: ["enable", "howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf deinen Namen",
      "Tippe auf iCloud und dann auf iCloud-Backup",
      "Aktiviere Backup dieses iPhone",
      "Tippe auf Backup jetzt erstellen für eine sofortige Sicherung"
    ],
    settings: settingsPath("Dein Name", "iCloud", "iCloud-Backup"),
    sources: [guide("iph3ecf67d29", "Backup des iPhone erstellen"), article("108366", "Backup mit iCloud")]
  },
  {
    id: "ios-transfer-new-iphone",
    platform: "ios",
    title: "Alles auf ein neues iPhone übertragen",
    summary: "Mit Schnellstart legst du dein altes iPhone neben das neue – Apps, Daten und Einstellungen werden direkt übertragen.",
    aliases: [
      "neues iphone", "daten übertragen", "auf neues handy übertragen", "handywechsel", "quick start", "schnellstart",
      "transfer data new iphone", "altes iphone neues iphone"
    ],
    category: "storage",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 30,
    intents: ["howto"],
    requirements: ["Beide Geräte geladen und nahe beieinander", "Bluetooth aktiviert"],
    steps: [
      "Schalte das neue iPhone ein und lege es neben dein altes",
      "Auf dem alten iPhone erscheint Schnellstart – tippe auf Fortfahren",
      "Scanne die Animation mit dem alten iPhone",
      "Folge den Anweisungen und wähle Vom iPhone übertragen"
    ],
    sources: [article("102659", "Schnellstart verwenden")]
  },
  {
    id: "ios-airdrop",
    platform: "ios",
    title: "Fotos und Dateien schnell an Apple-Geräte senden",
    summary: "AirDrop schickt Fotos, Videos und Dateien kabellos an iPhones, iPads und Macs in der Nähe – ohne Qualitätsverlust.",
    aliases: [
      "airdrop", "fotos senden an iphone", "dateien schicken", "fotos teilen ohne whatsapp", "bilder an mac schicken",
      "send files nearby", "fotos übertragen"
    ],
    category: "connectivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    requirements: ["WLAN und Bluetooth eingeschaltet", "Empfänger in der Nähe"],
    steps: [
      "Öffne das Foto oder die Datei",
      "Tippe auf Teilen (Quadrat mit Pfeil)",
      "Tippe auf AirDrop und wähle das Gerät"
    ],
    sources: [guide("iphcd8b9f0af", "AirDrop verwenden")]
  }
];
