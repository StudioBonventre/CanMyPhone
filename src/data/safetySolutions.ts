import type { Solution } from "../types";
import { article, guide, settingsPath } from "./sourceHelpers";

/** Safety, security, finding lost things and family protection. */
export const safetySolutions: Solution[] = [
  {
    id: "ios-find-my-iphone",
    platform: "ios",
    title: "Verlorenes iPhone finden",
    summary: "Mit „Wo ist?“ siehst du dein iPhone auf der Karte, lässt es klingeln oder markierst es als verloren – auch von einem anderen Gerät aus.",
    aliases: [
      "handy verloren", "iphone verloren", "iphone finden", "handy finden", "wo ist mein handy", "find my",
      "handy gestohlen", "iphone gestohlen", "handy klingeln lassen", "lost my phone", "wo ist"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "enable"],
    entities: ["find-my"],
    requirements: ["„Mein iPhone suchen“ muss vorher aktiviert sein"],
    steps: [
      "Prüfe vorab: Einstellungen → dein Name → Wo ist? → Mein iPhone suchen ist an",
      "Im Ernstfall: Öffne „Wo ist?“ auf einem anderen Apple-Gerät oder icloud.com/find",
      "Wähle dein iPhone und tippe auf Ton abspielen oder Route",
      "Ist es weg: Tippe auf Als verloren markieren"
    ],
    settings: settingsPath("Dein Name", "Wo ist?", "Mein iPhone suchen"),
    sources: [
      guide("iph09b087eda", "Gerät suchen"),
      guide("iph7cc193cfc", "Gerät als verloren markieren")
    ]
  },
  {
    id: "ios-left-behind-alert",
    platform: "ios",
    title: "Erinnerung, wenn du etwas liegen lässt",
    summary: "„Wo ist?“ warnt dich, wenn du AirPods, ein AirTag-Objekt oder ein anderes Gerät irgendwo zurücklässt.",
    aliases: [
      "vergesse schlüssel", "schlüssel vergessen", "airpods liegen lassen", "warnung zurückgelassen", "liegen lassen",
      "left behind", "vergesse dinge", "rucksack vergessen"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "howto", "automation"],
    entities: ["find-my"],
    requirements: ["Ein Gerät oder AirTag, das in „Wo ist?“ eingetragen ist"],
    steps: [
      "Öffne die App „Wo ist?“",
      "Tippe auf Geräte oder Objekte und wähle das gewünschte",
      "Tippe auf Mitteilung beim Zurücklassen und aktiviere sie",
      "Lege bei Bedarf Ausnahmen fest, z. B. dein Zuhause"
    ],
    sources: [
      guide("iph5f53aeae0", "Mitteilung beim Zurücklassen eines Geräts"),
      guide("iphf666e9559", "AirTag hinzufügen")
    ]
  },
  {
    id: "ios-stolen-device-protection",
    platform: "ios",
    title: "Schutz, falls jemand dein iPhone und deinen Code stiehlt",
    summary: "Der Schutz für gestohlene Geräte verlangt Face ID statt Code für sensible Änderungen, wenn du nicht an vertrauten Orten bist.",
    aliases: [
      "schutz für gestohlene geräte", "diebstahlschutz", "handy diebstahl", "code ausgespäht", "stolen device protection",
      "iphone sicherer machen", "sicherheit erhöhen"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Face ID & Code",
      "Gib deinen Code ein",
      "Tippe auf Schutz für gestohlene Geräte und aktiviere ihn"
    ],
    settings: settingsPath("Face ID & Code", "Schutz für gestohlene Geräte"),
    sources: [guide("iph17105538b", "Schutz für gestohlene Geräte verwenden")]
  },
  {
    id: "ios-weak-passwords",
    platform: "ios",
    title: "Unsichere oder gehackte Passwörter finden",
    summary: "Die App Passwörter warnt dich vor wiederverwendeten, schwachen oder in Datenlecks aufgetauchten Passwörtern.",
    aliases: [
      "passwort gehackt", "passwort unsicher", "passwörter prüfen", "datenleck", "kompromittiertes passwort",
      "weak password", "passwort vergessen", "passwörter verwalten"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 5,
    intents: ["howto"],
    steps: [
      "Öffne die App Passwörter",
      "Tippe auf Sicherheit",
      "Wähle einen Eintrag und tippe auf Passwort auf Website ändern"
    ],
    sources: [guide("iphd5d8daf4f", "Schwache oder kompromittierte Passwörter ändern")]
  },
  {
    id: "ios-sms-code-autofill",
    platform: "ios",
    title: "SMS-Codes automatisch ausfüllen",
    summary: "Bestätigungscodes aus SMS und Mail werden über der Tastatur vorgeschlagen und können danach automatisch gelöscht werden.",
    aliases: [
      "sms code", "bestätigungscode", "code abtippen", "verification code", "einmalcode", "2fa code",
      "sms codes löschen"
    ],
    category: "security",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "discover"],
    steps: [
      "Tippe in ein Code-Feld – der Code erscheint über der Tastatur",
      "Tippe darauf, um ihn einzufügen",
      "Optional: Einstellungen → Allgemein → Automatisch ausfüllen & Passwörter → Nach Verwendung löschen"
    ],
    sources: [guide("iphc89a3a3af", "SMS-Codes automatisch ausfüllen")]
  },
  {
    id: "ios-hide-my-email",
    platform: "ios",
    title: "Echte E-Mail-Adresse verbergen",
    summary: "„E-Mail-Adresse verbergen“ erstellt zufällige Adressen, die an dein Postfach weiterleiten – gut gegen Spam bei Anmeldungen.",
    aliases: [
      "email verbergen", "spam vermeiden", "wegwerf email", "e-mail adresse verstecken", "hide my email",
      "zu viel spam", "anonyme email"
    ],
    category: "security",
    builtIn: true,
    cost: "Mit iCloud+",
    setupMinutes: 2,
    intents: ["howto"],
    requirements: ["iCloud+ Abo"],
    steps: [
      "Öffne die Einstellungen und tippe auf deinen Namen",
      "Tippe auf iCloud und dann auf E-Mail-Adresse verbergen",
      "Tippe auf Neue Adresse erstellen"
    ],
    settings: settingsPath("Dein Name", "iCloud", "E-Mail-Adresse verbergen"),
    sources: [guide("iphf277f837e", "E-Mail-Adresse verbergen verwenden")]
  },
  {
    id: "ios-silence-unknown-callers",
    platform: "ios",
    title: "Spam-Anrufe und unbekannte Nummern filtern",
    summary: "Das iPhone kann Anrufe von unbekannten Nummern prüfen oder stummschalten – Kontakte klingeln weiterhin normal.",
    aliases: [
      "spam anrufe", "werbeanrufe", "unbekannte anrufer", "unbekannte nummern blockieren", "nervige anrufe",
      "spam calls", "anrufe filtern", "fake anrufe", "betrugsanrufe"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["enable", "howto"],
    steps: [
      "Öffne die Einstellungen und tippe auf Apps",
      "Tippe auf Telefon",
      "Wähle unter Anrufe überprüfen bzw. Unbekannte Anrufer, ob sie stummgeschaltet oder geprüft werden",
      "Einzelne Nummer blockieren: In der Anrufliste auf ⓘ tippen → Anrufer blockieren"
    ],
    settings: settingsPath("Apps", "Telefon"),
    sources: [guide("iphe4b3f7823", "Anrufe überprüfen und blockieren")]
  },
  {
    id: "ios-block-spam-messages",
    platform: "ios",
    title: "Spam-Nachrichten melden und Absender blockieren",
    summary: "Unbekannte Absender lassen sich herausfiltern, und Spam kannst du direkt melden und blockieren.",
    aliases: [
      "spam sms", "spam nachrichten", "absender blockieren", "nachrichten blockieren", "betrugs sms",
      "paket sms betrug", "block sender", "unbekannte absender filtern"
    ],
    category: "communication",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto"],
    steps: [
      "Öffne die Konversation in Nachrichten",
      "Tippe auf Junk melden bzw. auf den Namen oben → Anrufer blockieren",
      "Filter für Unbekannte: Einstellungen → Apps → Nachrichten → Unbekannte Absender"
    ],
    sources: [guide("iph3f94d910d", "Spam melden und Absender blockieren")]
  },
  {
    id: "ios-emergency-sos",
    platform: "ios",
    title: "Im Notfall schnell Hilfe rufen",
    summary: "Notruf SOS wählt per Tastenkombination den Notruf und informiert deine Notfallkontakte mit deinem Standort.",
    aliases: [
      "notruf", "notfall", "sos", "hilfe rufen", "notfallkontakt", "emergency sos", "notruf schnell",
      "112 anrufen", "wenn mir was passiert"
    ],
    category: "safety",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["howto", "enable"],
    steps: [
      "Halte die Seitentaste und eine Lautstärketaste gedrückt, bis der Notruf-Regler erscheint",
      "Ziehe den Regler oder halte weiter gedrückt für den automatischen Notruf",
      "Einstellungen prüfen: Einstellungen → Notruf SOS",
      "Notfallkontakte legst du in der App Health im Notfallpass fest"
    ],
    settings: settingsPath("Notruf SOS"),
    sources: [guide("iph3c99374c", "Notruf SOS verwenden")]
  },
  {
    id: "ios-medical-id",
    platform: "ios",
    title: "Notfallpass für Retter einrichten",
    summary: "Der Notfallpass zeigt Rettungskräften Notfallkontakte und wichtige Gesundheitsinfos – auch bei gesperrtem iPhone.",
    aliases: [
      "notfallpass", "medical id", "notfallinfos", "allergien hinterlegen", "notfallkontakt hinzufügen",
      "blutgruppe im handy", "info für rettungsdienst"
    ],
    category: "safety",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 5,
    intents: ["howto", "enable"],
    steps: [
      "Öffne die App Health",
      "Tippe oben rechts auf dein Profilbild und dann auf Notfallpass",
      "Tippe auf Bearbeiten und trage Infos und Notfallkontakte ein",
      "Aktiviere Im Sperrzustand zeigen"
    ],
    sources: [guide("iph08022b192", "Notfallpass einrichten"), article("105072", "Notfallpass in Health")]
  },
  {
    id: "ios-crash-detection",
    platform: "ios",
    title: "Unfallerkennung im Auto",
    summary: "Erkennt das iPhone einen schweren Autounfall, ruft es automatisch Hilfe, wenn du nicht reagierst.",
    aliases: ["unfallerkennung", "autounfall", "crash detection", "unfall automatisch notruf", "unfall erkennen"],
    category: "safety",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 1,
    intents: ["howto", "enable"],
    entities: ["car"],
    requirements: ["iPhone 14 oder neuer"],
    steps: [
      "Unfallerkennung ist standardmäßig aktiv",
      "Prüfen: Einstellungen → Notruf SOS → Anruf nach schwerem Unfall"
    ],
    settings: settingsPath("Notruf SOS", "Anruf nach schwerem Unfall"),
    sources: [article("104959", "Unfallerkennung verwenden")]
  },
  {
    id: "ios-check-in",
    platform: "ios",
    title: "Automatisch Bescheid geben, dass du gut angekommen bist",
    summary: "Mit Check-in in Nachrichten erfährt eine vertraute Person automatisch, wenn du sicher angekommen bist – oder wenn nicht.",
    aliases: [
      "sicher angekommen", "bescheid geben angekommen", "check in", "heimweg", "nachts allein nach hause",
      "melden wenn zuhause", "arrived safely"
    ],
    category: "safety",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    requirements: ["Beide nutzen ein iPhone mit aktuellem iOS"],
    steps: [
      "Öffne in Nachrichten die Konversation mit der Person",
      "Tippe auf + und dann auf Mehr → Check-in",
      "Wähle Ziel oder Zeit und tippe auf Senden"
    ],
    sources: [guide("iphc143bb7e9", "Check-in verwenden")]
  },
  {
    id: "ios-share-location",
    platform: "ios",
    title: "Standort mit Familie oder Freunden teilen",
    summary: "In „Wo ist?“ teilst du deinen Standort dauerhaft oder für eine Stunde – und kannst dich benachrichtigen lassen, wenn jemand ankommt.",
    aliases: [
      "standort teilen", "wo ist mein kind", "standort von familie sehen", "location sharing", "standort freigeben",
      "benachrichtigung wenn angekommen", "wo ist meine frau", "wo ist mein mann"
    ],
    category: "family",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 2,
    intents: ["howto", "enable"],
    entities: ["find-my"],
    steps: [
      "Öffne die App „Wo ist?“ und tippe auf Personen",
      "Tippe auf + und dann auf Meinen Standort teilen",
      "Wähle die Person und die Dauer",
      "Optional: Person antippen → Mitteilen, wenn sie ankommt oder geht"
    ],
    sources: [
      guide("iph01954dc44", "Standort teilen"),
      guide("iph843dd79b6", "Mitteilungen bei Standortänderungen")
    ]
  },
  {
    id: "ios-screen-time-child",
    platform: "ios",
    title: "Bildschirmzeit für Kinder begrenzen",
    summary: "Mit Bildschirmzeit legst du Auszeiten, App-Limits und Inhaltsbeschränkungen fest – auch per Familienfreigabe vom eigenen iPhone aus.",
    aliases: [
      "kindersicherung", "bildschirmzeit", "kind zu viel handy", "app limit", "jugendschutz", "screen time",
      "parental controls", "kind handy begrenzen", "auszeit handy"
    ],
    category: "family",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 10,
    intents: ["howto", "enable"],
    steps: [
      "Öffne die Einstellungen und tippe auf Bildschirmzeit",
      "Wähle unter Familie dein Kind oder tippe auf Dieses iPhone gehört meinem Kind",
      "Lege Auszeit, App-Limits und Beschränkungen fest",
      "Setze einen Bildschirmzeit-Code, den das Kind nicht kennt"
    ],
    settings: settingsPath("Bildschirmzeit"),
    sources: [
      guide("ipha200da319", "Bildschirmzeit für ein Kind einrichten"),
      article("108806", "Bildschirmzeit für Kinder")
    ]
  },
  {
    id: "ios-screen-time-self",
    platform: "ios",
    title: "Weniger am Handy hängen",
    summary: "Bildschirmzeit zeigt dir, wie viel du am iPhone bist, und kann ablenkende Apps nach einem Limit sperren.",
    aliases: [
      "zu viel am handy", "handysucht", "weniger handy", "social media limit", "instagram limit", "tiktok begrenzen",
      "zeit am handy", "app limits", "less screen time"
    ],
    category: "wellbeing",
    builtIn: true,
    cost: "Kostenlos",
    setupMinutes: 3,
    intents: ["howto", "enable"],
    steps: [
      "Öffne die Einstellungen und tippe auf Bildschirmzeit",
      "Aktiviere App- & Website-Aktivität, um deine Nutzung zu sehen",
      "Tippe auf App-Limits → Limit hinzufügen und wähle z. B. Soziale Netze"
    ],
    settings: settingsPath("Bildschirmzeit"),
    sources: [guide("iphbfa595995", "Bildschirmzeit für dich einrichten")]
  }
];
