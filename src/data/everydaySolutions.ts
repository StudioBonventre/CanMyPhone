import type { Solution } from "../types";
import { guide, settingsPath } from "./sourceHelpers";

/** Communication, photos, productivity, travel, health, home and accessibility. */
export const everydaySolutions: Solution[] = [
  // ── Communication ──────────────────────────────────────────────────────
  {
    id: "ios-unsend-edit-message",
    platform: "ios",
    title: "Nachricht bearbeiten oder zurückholen",
    summary: "iMessages kannst du kurz nach dem Senden noch bearbeiten oder widerrufen.",
    aliases: [
      "nachricht zurückholen", "nachricht löschen beim empfänger", "falsche nachricht geschickt", "nachricht bearbeiten",
      "imessage widerrufen", "unsend message", "tippfehler nachricht", "an falsche person geschickt"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    requirements: ["Gilt für iMessage, nicht für SMS", "Bearbeiten bis 15 Minuten, Widerrufen bis 2 Minuten nach dem Senden"],
    steps: [
      "Berühre die gesendete Nachricht lange",
      "Tippe auf Bearbeiten oder auf Senden widerrufen"
    ],
    sources: [guide("iphe67195653", "Nachrichten widerrufen oder bearbeiten")]
  },
  {
    id: "ios-send-later",
    platform: "ios",
    title: "Nachricht später senden",
    summary: "Schreib die Nachricht jetzt und lass sie zu einer festen Zeit automatisch verschicken – etwa einen Geburtstagsgruß um Mitternacht.",
    aliases: [
      "später senden", "nachricht planen", "nachricht zeitgesteuert", "geburtstagsnachricht um mitternacht",
      "send later", "schedule message", "nachricht morgen schicken"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "automation"],
    requirements: ["Gilt für iMessage"],
    steps: [
      "Öffne die Konversation in Nachrichten",
      "Tippe auf + und dann auf Mehr → Später senden",
      "Wähle Datum und Uhrzeit, schreibe die Nachricht und sende sie"
    ],
    sources: [guide("iph5ae9a7be6", "Späteres Senden festlegen")]
  },
  {
    id: "ios-recover-deleted-messages",
    platform: "ios",
    title: "Gelöschte Nachrichten wiederherstellen",
    summary: "Gelöschte Nachrichten liegen noch bis zu 30 Tage im Ordner „Zuletzt gelöscht“.",
    aliases: [
      "nachricht gelöscht", "sms wiederherstellen", "gelöschte nachrichten", "chat aus versehen gelöscht",
      "recover deleted messages", "zuletzt gelöscht nachrichten"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: [
      "Öffne Nachrichten und tippe oben auf Filter bzw. Bearbeiten",
      "Tippe auf Zuletzt gelöscht",
      "Wähle die Konversationen und tippe auf Wiederherstellen"
    ],
    sources: [guide("iph16ecebf48", "Gelöschte Nachrichten wiederherstellen")]
  },
  {
    id: "ios-read-receipts",
    platform: "ios",
    title: "Lesebestätigungen ein- oder ausschalten",
    summary: "Lege fest, ob andere sehen, dass du ihre iMessage gelesen hast – für alle oder nur für einzelne Personen.",
    aliases: ["lesebestätigung", "gelesen ausschalten", "read receipts", "gelesen anzeigen", "soll nicht sehen dass ich gelesen habe"],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "enable"],
    steps: [
      "Für alle: Einstellungen → Apps → Nachrichten → Lesebestätigungen",
      "Für eine Person: Konversation öffnen → Namen antippen → Lesebestätigungen senden"
    ],
    settings: settingsPath("Apps", "Nachrichten"),
    sources: [guide("iph5e713a045", "Lesebestätigungen aktivieren oder deaktivieren")]
  },
  {
    id: "ios-mute-group-chat",
    platform: "ios",
    title: "Nervigen Gruppenchat stummschalten",
    summary: "Einzelne Konversationen kannst du stummschalten, ohne sie zu verlassen.",
    aliases: [
      "gruppenchat stumm", "gruppe stummschalten", "konversation stumm", "mute group", "gruppe nervt",
      "hinweise ausblenden"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: ["Wische in der Nachrichtenliste auf der Konversation nach links", "Tippe auf das Glocken-Symbol"],
    sources: [guide("iph62faab6a4", "Mitteilungen stoppen und stummschalten")]
  },
  {
    id: "ios-unsend-email",
    platform: "ios",
    title: "E-Mail zurückholen",
    summary: "In der App Mail kannst du eine gerade gesendete E-Mail für ein paar Sekunden widerrufen.",
    aliases: ["email zurückholen", "mail widerrufen", "email zu früh gesendet", "unsend email", "senden widerrufen mail"],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: [
      "Tippe direkt nach dem Senden unten auf Senden widerrufen",
      "Die Wartezeit stellst du unter Einstellungen → Apps → Mail → Verzögerung für Senden widerrufen ein"
    ],
    sources: [guide("iph0e7288015", "E-Mails mit Senden widerrufen zurückrufen")]
  },
  {
    id: "ios-call-recording",
    platform: "ios",
    title: "Telefonat aufnehmen und abschreiben lassen",
    summary: "Das iPhone kann Anrufe aufzeichnen und automatisch transkribieren. Alle Teilnehmenden werden darüber informiert.",
    aliases: [
      "anruf aufnehmen", "telefonat aufnehmen", "gespräch aufzeichnen", "call recording", "anruf mitschneiden",
      "anruf transkribieren"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    requirements: ["Alle Gesprächspartner hören eine Ansage", "Verfügbarkeit hängt von Sprache und Region ab"],
    steps: [
      "Tippe während des Anrufs oben links auf die Aufnahme-Taste",
      "Die Aufnahme und das Transkript findest du danach in der App Notizen"
    ],
    sources: [guide("iph57c6590e9", "Anruf aufnehmen und transkribieren")]
  },
  {
    id: "ios-call-forwarding",
    platform: "ios",
    title: "Anrufe auf eine andere Nummer weiterleiten",
    summary: "Mit der Rufweiterleitung landen Anrufe auf einer anderen Nummer – etwa im Urlaub oder bei einem Zweithandy.",
    aliases: ["rufweiterleitung", "anrufe weiterleiten", "call forwarding", "anrufe umleiten", "weiterleitung einrichten"],
    category: "communication",
    builtIn: true,
    cost: "Je nach Mobilfunktarif",
    setupMinutes: 2,
    intents: ["howto", "enable"],
    steps: [
      "Öffne die Einstellungen und tippe auf Apps → Telefon",
      "Tippe auf Rufweiterleitung und aktiviere sie",
      "Gib die Zielnummer ein"
    ],
    settings: settingsPath("Apps", "Telefon", "Rufweiterleitung"),
    sources: [guide("iph7405291c4", "Rufweiterleitung einrichten")]
  },
  {
    id: "ios-voicemail",
    platform: "ios",
    title: "Mailbox einrichten und abhören",
    summary: "In der App Telefon richtest du die Mailbox ein und hörst Nachrichten in beliebiger Reihenfolge ab.",
    aliases: ["mailbox", "voicemail", "anrufbeantworter", "mailbox abhören", "visual voicemail", "mailbox einrichten"],
    category: "communication",
    builtIn: true,
    cost: "Je nach Mobilfunkanbieter",
    setupMinutes: 3,
    intents: ["howto"],
    requirements: ["Visuelle Voicemail muss vom Anbieter unterstützt werden"],
    steps: ["Öffne die App Telefon", "Tippe auf Voicemail bzw. Mailbox", "Tippe auf Jetzt einrichten und folge den Schritten"],
    sources: [guide("iph3c99490e", "Voicemail einrichten")]
  },
  {
    id: "ios-live-translation-calls",
    platform: "ios",
    title: "Telefonate und Nachrichten übersetzen lassen",
    summary: "Das iPhone kann fremdsprachige Telefonate, FaceTime-Gespräche und Nachrichten live übersetzen.",
    aliases: [
      "übersetzen", "übersetzung anruf", "live übersetzung", "fremdsprache telefonieren", "translate call",
      "verstehe die sprache nicht", "dolmetscher"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    requirements: ["Apple Intelligence-fähiges iPhone", "Unterstützte Sprachen und Regionen"],
    availability: { requiresAppleIntelligence: true },
    entities: ["apple-intelligence"],
    steps: [
      "Tippe während eines Anrufs auf die Taste Mehr bzw. auf Live-Übersetzung",
      "Wähle die Sprachen",
      "Die Übersetzung wird angezeigt bzw. vorgelesen"
    ],
    sources: [
      guide("ly3pl0v38sek", "Übersetzungen während Telefonanrufen"),
      guide("iphb41156356", "Live-Untertitel und Live-Übersetzung")
    ]
  },
  {
    id: "ios-namedrop",
    platform: "ios",
    title: "Kontakt austauschen durch Aneinanderhalten",
    summary: "Mit NameDrop haltet ihr zwei iPhones aneinander und tauscht so Telefonnummer und E-Mail aus.",
    aliases: ["namedrop", "nummer austauschen", "kontakt teilen", "kontakt austauschen", "visitenkarte teilen", "share contact"],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "discover"],
    steps: [
      "Haltet die Oberseiten beider entsperrter iPhones nah aneinander",
      "Wähle Teilen oder Nur empfangen",
      "Zum Abbrechen die iPhones auseinanderbewegen"
    ],
    sources: [guide("iph1b6c664b7", "NameDrop verwenden")]
  },
  {
    id: "ios-merge-duplicate-contacts",
    platform: "ios",
    title: "Doppelte Kontakte zusammenführen",
    summary: "Die App Kontakte erkennt Duplikate und führt sie auf Wunsch zusammen.",
    aliases: ["doppelte kontakte", "kontakte zusammenführen", "duplikate kontakte", "kontakte aufräumen", "duplicate contacts"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die App Kontakte",
      "Tippe oben auf Duplikate gefunden (erscheint, wenn es welche gibt)",
      "Tippe auf Alle zusammenführen oder prüfe sie einzeln"
    ],
    sources: [guide("iph2ab28320d", "Doppelte Kontakte zusammenführen")]
  },

  // ── Photos & camera ────────────────────────────────────────────────────
  {
    id: "ios-screenshot",
    platform: "ios",
    title: "Bildschirmfoto machen",
    summary: "Ein Screenshot speichert, was gerade auf dem Bildschirm ist – auch ganze Webseiten als PDF.",
    aliases: ["screenshot", "bildschirmfoto", "bildschirm fotografieren", "screen abfotografieren", "ganze seite screenshot"],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: [
      "Drücke die Seitentaste und die Lauter-Taste gleichzeitig kurz",
      "Tippe auf die Vorschau, um zu markieren oder zu teilen",
      "Für ganze Webseiten: In der Vorschau oben auf Ganze Seite tippen"
    ],
    sources: [guide("iphc872c0115", "Bildschirmfoto erstellen")]
  },
  {
    id: "ios-screen-recording",
    platform: "ios",
    title: "Bildschirm als Video aufnehmen",
    summary: "Die Bildschirmaufnahme zeichnet alles auf, was du tust – praktisch, um jemandem etwas zu zeigen.",
    aliases: ["bildschirmaufnahme", "bildschirm aufnehmen", "screen recording", "video vom bildschirm", "bildschirm filmen"],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: [
      "Öffne das Kontrollzentrum",
      "Tippe auf Bildschirmaufnahme (fehlt sie: Kontrollzentrum anpassen und hinzufügen)",
      "Nach dem Countdown läuft die Aufnahme – zum Beenden oben auf das rote Symbol tippen"
    ],
    sources: [guide("iph52f6e1987", "Bildschirmaufnahme erstellen")]
  },
  {
    id: "ios-lift-subject",
    platform: "ios",
    title: "Hintergrund aus einem Foto entfernen",
    summary: "Halte eine Person oder ein Objekt im Foto gedrückt – das iPhone löst es freigestellt heraus, z. B. als Sticker.",
    aliases: [
      "hintergrund entfernen", "freistellen", "motiv ausschneiden", "sticker aus foto", "remove background",
      "person ausschneiden", "foto ausschneiden"
    ],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "discover"],
    steps: [
      "Öffne das Foto in der App Fotos",
      "Berühre das Motiv lange, bis es hervorgehoben wird",
      "Wähle Kopieren, Teilen oder Sticker hinzufügen"
    ],
    sources: [guide("iphfe4809658", "Motiv vom Hintergrund ablösen")]
  },
  {
    id: "ios-hide-photos",
    platform: "ios",
    title: "Private Fotos ausblenden",
    summary: "Ausgeblendete Fotos verschwinden aus der Mediathek und landen in einem mit Face ID geschützten Album.",
    aliases: [
      "fotos verstecken", "fotos ausblenden", "private fotos", "geheimes album", "hide photos", "bilder verstecken",
      "versehentlich gelöschte fotos", "fotos wiederherstellen"
    ],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: [
      "Öffne das Foto und tippe auf die Taste Mehr (•••)",
      "Tippe auf Ausblenden",
      "Wiederfinden: Fotos → Sammlungen → Ausgeblendet (mit Face ID)",
      "Gelöschte Fotos liegen 30 Tage unter Zuletzt gelöscht"
    ],
    sources: [guide("iphb4defbde9", "Fotos und Videos löschen oder ausblenden")]
  },
  {
    id: "ios-find-photos",
    platform: "ios",
    title: "Bestimmte Fotos schnell finden",
    summary: "Die Fotos-Suche versteht Personen, Orte, Dinge und sogar Text im Bild – etwa „Hund am Strand“ oder „Kassenbon“.",
    aliases: [
      "foto finden", "bild suchen", "fotos durchsuchen", "kassenbon foto finden", "foto von hund finden",
      "search photos", "fotos nach ort", "personen in fotos"
    ],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "discover"],
    steps: [
      "Öffne die App Fotos und tippe auf Suchen",
      "Beschreibe, was du suchst – z. B. eine Person, einen Ort oder einen Gegenstand",
      "Für Belege oder QR-Codes: In Sammlungen unter Dienstprogramme schauen"
    ],
    sources: [guide("iph995007f21", "Belege, QR-Codes und mehr finden")]
  },
  {
    id: "ios-shared-photo-library",
    platform: "ios",
    title: "Familienfotos automatisch teilen",
    summary: "Mit der geteilten iCloud-Fotomediathek landen Fotos automatisch in einer gemeinsamen Mediathek mit bis zu fünf Personen.",
    aliases: [
      "fotos mit familie teilen", "geteilte fotomediathek", "gemeinsames fotoalbum", "familienfotos teilen",
      "shared photo library", "fotos automatisch teilen", "geteiltes album"
    ],
    category: "photos",
    builtIn: true,
    cost: "Mit iCloud-Speicher",
    setupMinutes: 5,
    intents: ["howto", "automation"],
    requirements: ["iCloud-Fotos aktiviert"],
    steps: [
      "Öffne die Einstellungen → Apps → Fotos",
      "Tippe auf Geteilte Mediathek und folge den Schritten",
      "Lade Teilnehmende ein und wähle, welche Fotos geteilt werden"
    ],
    settings: settingsPath("Apps", "Fotos", "Geteilte Mediathek"),
    sources: [guide("iph28ac9ea81", "Geteilte iCloud-Fotomediathek einrichten")]
  },
  {
    id: "ios-share-long-videos",
    platform: "ios",
    title: "Lange Videos verschicken",
    summary: "Zu große Videos teilst du als iCloud-Link statt als Anhang – ohne Qualitätsverlust.",
    aliases: ["video zu groß", "langes video senden", "video verschicken", "video teilen link", "share large video"],
    category: "photos",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: ["Öffne das Video und tippe auf Teilen", "Wähle die Option, einen iCloud-Link zu senden", "Wähle Nachricht oder Mail"],
    sources: [guide("iph1c81f302d", "Lange Videos teilen")]
  },
  {
    id: "ios-qr-code",
    platform: "ios",
    title: "QR-Code scannen",
    summary: "Die Kamera-App erkennt QR-Codes automatisch – eine Extra-App brauchst du nicht.",
    aliases: ["qr code", "qr code scannen", "qr scanner", "scan qr", "code scannen", "barcode scannen"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: ["Öffne die Kamera", "Richte sie auf den QR-Code", "Tippe auf den gelben Hinweis, der erscheint"],
    sources: [guide("iphe8bda8762", "QR-Code scannen")]
  },

  // ── Productivity & tools ───────────────────────────────────────────────
  {
    id: "ios-sign-documents",
    platform: "ios",
    title: "PDF unterschreiben und Formulare ausfüllen",
    summary: "Mit „Markieren“ füllst du PDFs aus und setzt deine Unterschrift – ohne Drucken und Scannen.",
    aliases: [
      "pdf unterschreiben", "dokument unterschreiben", "unterschrift", "formular ausfüllen", "sign pdf",
      "vertrag unterschreiben", "pdf ausfüllen"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne das PDF, z. B. in Mail oder Dateien",
      "Tippe auf Markieren (Stift-Symbol)",
      "Tippe auf + und dann auf Unterschrift hinzufügen",
      "Platziere die Unterschrift und tippe auf Fertig"
    ],
    sources: [guide("iph1d3607e5c", "Formulare ausfüllen und Dokumente signieren")]
  },
  {
    id: "ios-dictation",
    platform: "ios",
    title: "Text diktieren statt tippen",
    summary: "Tippe aufs Mikrofon in der Tastatur und sprich – das iPhone schreibt mit, auch Satzzeichen.",
    aliases: [
      "diktieren", "sprechen statt tippen", "spracheingabe", "dictation", "tippen ist mühsam", "voice typing",
      "nachricht sprechen"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: [
      "Tippe in ein Textfeld",
      "Tippe auf das Mikrofon-Symbol auf der Tastatur",
      "Sprich deinen Text, z. B. mit „Komma“ oder „Punkt“"
    ],
    sources: [guide("iph2c0651d2", "Text diktieren")]
  },
  {
    id: "ios-text-replacement",
    platform: "ios",
    title: "Häufige Texte mit Kürzeln schreiben",
    summary: "Mit Textersetzung wird z. B. „@@“ automatisch zu deiner E-Mail-Adresse.",
    aliases: [
      "textersetzung", "kürzel", "text shortcut", "adresse schnell tippen", "email immer wieder tippen",
      "textbausteine", "text replacement"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    steps: [
      "Öffne die Einstellungen → Allgemein → Tastatur",
      "Tippe auf Textersetzung und dann auf +",
      "Gib den vollständigen Text und ein kurzes Kürzel ein"
    ],
    settings: settingsPath("Allgemein", "Tastatur", "Textersetzung"),
    sources: [guide("iph6d01d862", "Abkürzungen für häufig verwendeten Text")]
  },
  {
    id: "ios-voice-memo-transcribe",
    platform: "ios",
    title: "Sprachnotiz aufnehmen und abschreiben lassen",
    summary: "In der App Notizen nimmst du Audio auf und bekommst automatisch ein Transkript.",
    aliases: [
      "sprachnotiz", "audio aufnehmen", "vortrag aufnehmen", "transkribieren", "meeting aufnehmen",
      "record audio", "vorlesung aufnehmen"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: ["Öffne eine Notiz", "Tippe auf das Büroklammer-Symbol und dann auf Audio aufnehmen", "Tippe auf die Aufnahme, um das Transkript zu sehen"],
    sources: [guide("iphbe11247b5", "Audio aufzeichnen und transkribieren")]
  },
  {
    id: "ios-lock-notes",
    platform: "ios",
    title: "Private Notizen schützen",
    summary: "Einzelne Notizen lassen sich mit Face ID oder Passwort sperren.",
    aliases: ["notiz sperren", "notizen schützen", "geheime notiz", "lock note", "notiz passwort"],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: ["Öffne die Notiz", "Tippe auf die Taste Mehr (•••)", "Tippe auf Sperren"],
    sources: [guide("iphf177bb154", "Notizen sperren")]
  },
  {
    id: "ios-alarm",
    platform: "ios",
    title: "Wecker stellen",
    summary: "Wecker stellst du in der App Uhr – oder per Siri, ohne das iPhone anzufassen.",
    aliases: ["wecker", "wecker stellen", "alarm", "aufwachen", "set alarm", "weckzeit", "wecker morgen früh"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "voice-control"],
    entities: ["siri"],
    voice: { route: "siri-direct", invocation: "„Siri, weck mich um 7 Uhr.“" },
    steps: ["Öffne die App Uhr", "Tippe auf Wecker und dann auf +", "Stelle die Zeit ein und tippe auf Sichern"],
    sources: [guide("iph2909d3a74", "Einen Wecker stellen")]
  },
  {
    id: "ios-timer",
    platform: "ios",
    title: "Timer stellen",
    summary: "Timer laufen in der App Uhr, im Kontrollzentrum oder per Siri – auch mehrere gleichzeitig.",
    aliases: ["timer", "eieruhr", "küchenwecker", "countdown", "set timer", "timer stellen"],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "voice-control"],
    entities: ["siri"],
    voice: { route: "siri-direct", invocation: "„Siri, stell einen Timer auf 10 Minuten.“" },
    steps: ["Öffne die App Uhr und tippe auf Timer", "Wähle die Dauer und tippe auf Start"],
    sources: [guide("iph8241d6b2a", "Timer einstellen")]
  },
  {
    id: "ios-unit-conversion",
    platform: "ios",
    title: "Währungen und Einheiten umrechnen",
    summary: "Der Rechner rechnet Währungen, Längen, Gewichte und mehr um – auch die Suche versteht „100 Dollar in Euro“.",
    aliases: [
      "währung umrechnen", "dollar in euro", "einheiten umrechnen", "umrechnen", "currency converter",
      "zoll in cm", "fahrenheit celsius"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto"],
    steps: [
      "Öffne den Rechner und tippe auf das Rechner-Symbol unten links",
      "Aktiviere Umrechnen und wähle die Einheiten",
      "Alternativ: Auf dem Home-Bildschirm nach unten wischen und z. B. „100 USD in EUR“ eingeben"
    ],
    sources: [guide("iph69d274dde", "Maßeinheiten oder Währungen konvertieren")]
  },
  {
    id: "ios-measure",
    platform: "ios",
    title: "Etwas ausmessen ohne Zollstock",
    summary: "Die App Maßband misst Längen mit der Kamera und dient auch als Wasserwaage.",
    aliases: [
      "messen", "ausmessen", "maßband", "zollstock", "länge messen", "wasserwaage", "measure", "level",
      "bild gerade aufhängen", "wie lang ist", "wie groß ist", "länge von", "wie breit ist"
    ],
    category: "productivity",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "discover"],
    steps: [
      "Öffne die App Maßband",
      "Richte die Kamera auf das Objekt und tippe auf +, um Start- und Endpunkt zu setzen",
      "Für die Wasserwaage unten auf Wasserwaage tippen"
    ],
    sources: [guide("iphd8ac2cfea", "Größenmessungen"), guide("iphbd435673d", "Wasserwaage verwenden")]
  },

  // ── Travel ─────────────────────────────────────────────────────────────
  {
    id: "ios-offline-maps",
    platform: "ios",
    title: "Karten offline nutzen",
    summary: "Lade Kartenbereiche vorab herunter und navigiere ohne Internet – ideal im Ausland oder in Funklöchern.",
    aliases: [
      "offline karten", "karte ohne internet", "navigation ohne netz", "offline maps", "urlaub karte",
      "kein empfang navigation"
    ],
    category: "travel",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["howto"],
    steps: [
      "Öffne Karten und tippe auf dein Profilbild",
      "Tippe auf Offline-Karten → Neue Karte laden",
      "Wähle den Bereich und tippe auf Laden"
    ],
    sources: [guide("iphcfb5f5bc6", "Offline-Karten laden")]
  },
  {
    id: "ios-share-eta",
    platform: "ios",
    title: "Ankunftszeit automatisch teilen",
    summary: "Während der Navigation bekommt eine Person automatisch deine voraussichtliche Ankunftszeit – inklusive Verspätungen.",
    aliases: [
      "ankunftszeit teilen", "bescheid geben wann ich komme", "share eta", "verspätung mitteilen",
      "wann bin ich da teilen"
    ],
    category: "travel",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "automation"],
    steps: ["Starte eine Route in Karten", "Tippe unten auf Ankunft teilen", "Wähle die Kontakte"],
    sources: [guide("iph65c86df8c", "Voraussichtliche Ankunftszeit teilen")]
  },

  // ── Health & home ──────────────────────────────────────────────────────
  {
    id: "ios-medication-reminders",
    platform: "ios",
    title: "An Medikamente erinnern lassen",
    summary: "In der App Health trägst du Medikamente ein und wirst zur richtigen Zeit erinnert.",
    aliases: [
      "medikamente vergessen", "tabletten erinnerung", "pille erinnerung", "medikamente erinnern",
      "medication reminder", "tabletten nicht vergessen"
    ],
    category: "health",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 5,
    intents: ["howto", "automation"],
    steps: [
      "Öffne die App Health und tippe auf Durchsuchen",
      "Tippe auf Medikamente → Medikament hinzufügen",
      "Lege Zeitplan und Erinnerungszeiten fest"
    ],
    sources: [guide("iph811670c81", "Medikamenteneinnahme protokollieren")]
  },
  {
    id: "ios-sleep-schedule",
    platform: "ios",
    title: "Regelmäßiger schlafen mit Schlafplan",
    summary: "Ein Schlafplan erinnert dich ans Schlafengehen, aktiviert den Fokus Schlafen und weckt dich zur festen Zeit.",
    aliases: [
      "schlafplan", "schlafenszeit", "besser schlafen", "zu spät ins bett", "sleep schedule", "schlaf erinnerung",
      "einschlafen erinnerung"
    ],
    category: "health",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["howto", "automation"],
    steps: ["Öffne die App Health", "Tippe auf Durchsuchen → Schlaf", "Tippe auf Los geht's bzw. Vollständiger Zeitplan und lege Zeiten fest"],
    sources: [guide("iphaf56dceb4", "Schlaf einrichten")]
  },
  {
    id: "ios-home-automation",
    platform: "ios",
    title: "Smart Home automatisch steuern",
    summary: "In der App Home schalten Automationen Licht und Geräte nach Uhrzeit, Ort oder Sensoren – z. B. Licht an, wenn du nach Hause kommst.",
    aliases: [
      "licht automatisch", "smart home", "home automation", "licht an wenn ich heimkomme", "homekit",
      "lampe automatisch einschalten", "heizung automatisch"
    ],
    category: "home",
    builtIn: true,
    cost: "Kostenlos (kompatible Geräte nötig)",
    setupMinutes: 5,
    intents: ["automation", "howto"],
    requirements: ["Home-kompatible Geräte (Matter/HomeKit)", "Für Automationen eine Steuerzentrale wie HomePod oder Apple TV"],
    steps: [
      "Öffne die App Home und tippe auf +",
      "Tippe auf Automation hinzufügen",
      "Wähle den Auslöser (z. B. Personen kommen an) und die Geräte"
    ],
    sources: [guide("iph6d50ec543", "Automationen verwenden")]
  },

  // ── Accessibility ──────────────────────────────────────────────────────
  {
    id: "ios-magnifier",
    platform: "ios",
    title: "Kleingedrucktes lesen mit der Lupe",
    summary: "Die App Lupe vergrößert alles, was die Kamera sieht – mit Licht und Kontrast für Speisekarten oder Beipackzettel.",
    aliases: [
      "lupe", "vergrößern", "kleingedrucktes lesen", "beipackzettel lesen", "speisekarte lesen", "magnifier",
      "brille vergessen", "kann nicht lesen klein"
    ],
    category: "accessibility",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 0,
    intents: ["howto", "discover"],
    steps: ["Öffne die App Lupe (über die Suche)", "Richte die Kamera auf den Text", "Zoome mit dem Regler und schalte bei Bedarf das Licht ein"],
    sources: [guide("iphe867dc99c", "Lupe verwenden")]
  },
  {
    id: "ios-read-text-aloud",
    platform: "ios",
    title: "Texte in der Umgebung vorlesen lassen",
    summary: "Die Lupe kann Schilder, Briefe und Etiketten erkennen und laut vorlesen.",
    aliases: [
      "text vorlesen", "brief vorlesen", "vorlesen lassen", "read aloud", "sehe schlecht", "schilder vorlesen"
    ],
    category: "accessibility",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto"],
    steps: ["Öffne die App Lupe", "Aktiviere die Erkennung bzw. den Lesemodus", "Richte die Kamera auf den Text"],
    sources: [guide("iph29dbe3fb6", "Text in der Umgebung erkennen und vorlesen")]
  },
  {
    id: "ios-assistive-access",
    platform: "ios",
    title: "Ein einfaches iPhone für Senioren oder Kinder",
    summary: "„Unterstützender Zugriff“ reduziert das iPhone auf wenige große Tasten und Apps – ideal für Menschen, die es einfach haben möchten.",
    aliases: [
      "seniorenmodus", "unterstützender zugriff", "einfaches iphone", "iphone für oma", "iphone für opa", "große tasten", "assistiver zugriff",
      "assistive access", "vereinfachte oberfläche", "iphone zu kompliziert", "senioren handy"
    ],
    category: "accessibility",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 15,
    intents: ["howto", "enable"],
    requirements: ["Am besten gemeinsam mit einer vertrauten Person einrichten"],
    steps: [
      "Öffne die Einstellungen → Bedienungshilfen",
      "Tippe auf Unterstützender Zugriff und dann auf Unterstützenden Zugriff einrichten",
      "Wähle Darstellung und die Apps, die verfügbar sein sollen",
      "Starte den Modus über Unterstützenden Zugriff starten"
    ],
    settings: settingsPath("Bedienungshilfen", "Unterstützender Zugriff"),
    sources: [{ label: "Apple Support — Unterstützenden Zugriff einrichten", url: "https://support.apple.com/de-de/guide/assistive-access-iphone/devcd5016d31/ios" }]
  }
];
