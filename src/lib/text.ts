/**
 * Small, dependency-free German/English text helpers used by search and Need Radar.
 * Deterministic on purpose: the same question always produces the same answer.
 */

const STOPWORDS = new Set([
  // German
  "ich", "mich", "mir", "mein", "meine", "meinen", "meinem", "meiner", "du", "dein", "deine", "er", "sie", "es", "wir", "ihr",
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "und", "oder", "aber", "mit", "auf",
  "bei", "fur", "von", "vom", "zu", "zum", "zur", "im", "in", "an", "am", "ab", "bis", "ob", "wenn", "dass", "da",
  "wie", "was", "wer", "wo", "wann", "warum", "welche", "welcher", "welches", "kann", "konnen", "will", "mochte", "soll",
  "ist", "sind", "bin", "war", "habe", "hab", "hat", "haben", "wird", "werden", "immer", "so", "sehr", "ganz", "schon",
  "noch", "nur", "auch", "mal", "bitte", "einfach", "jetzt", "gerade", "dann", "doch", "denn", "etwas", "alles", "man",
  "nicht", "kein", "keine", "mehr", "viel", "viele", "zu", "uber", "unter", "nach", "vor", "ohne", "gibt", "geht", "tun",
  "mache", "machen", "mach", "macht", "stelle", "stellen", "lassen", "lasst", "bekomme", "bekommen", "dauernd", "standig",
  "einen", "sich", "uns", "euch", "hier", "dort", "heute", "morgen",
  // English
  "i", "a", "an", "the", "to", "my", "me", "can", "how", "do", "does", "please", "is", "are", "it", "of", "for", "and",
  "or", "on", "in", "with", "what", "when", "where", "why", "want", "keep", "always"
]);

/**
 * Words that describe the device itself. They never create a match on their own,
 * otherwise "mein Handy" would match half of the catalogue.
 */
const GENERIC = new Set([
  "handy", "iphone", "phone", "smartphone", "telefon", "geraet", "gerat", "app", "apps", "funktion", "einstellung",
  "einstell", "einstellungen", "problem", "hilfe", "help", "ding", "sache", "richtig", "schnell", "besser", "neu", "neues"
]);

/** Concept groups: any member of a group also matches the others. */
const SYNONYM_GROUPS: string[][] = [
  ["akku", "batterie", "battery", "strom", "aufladen", "ladung", "ladelimit"],
  ["kind", "kinder", "sohn", "tochter", "enkel", "kinderschutz", "kindersicherung", "jugendschutz", "child", "parental"],
  ["geklaut", "gestohlen", "diebstahl", "verloren", "verlegt", "lost", "stolen"],
  ["messen", "ausmessen", "lang", "lange", "breit", "hoch", "masse", "massband", "zollstock", "measure"],
  ["dunkel", "dunkelmodus", "nachtmodus", "dark", "blaulicht", "nightshift"],
  ["benachrichtigung", "mitteilung", "notification", "push", "hinweis"],
  ["foto", "fotos", "bild", "bilder", "photo", "photos", "picture"],
  ["abo", "abos", "abonnement", "abonniert", "abonniere", "subscription", "netflix", "spotify"],
  ["schrift", "text", "buchstabe", "buchstaben", "font", "lesen"],
  ["sms", "nachricht", "nachrichten", "imessage", "message", "chat"],
  ["anruf", "anrufe", "telefonat", "gesprach", "call", "calls", "anrufer"],
  ["spam", "werbung", "werbeanruf", "betrug", "scam", "fake", "fremde", "unbekannt"],
  ["tabletten", "pille", "pillen", "medikament", "medikamente", "medizin", "medication"],
  ["wlan", "wifi", "internet", "netz"],
  ["schlafen", "schlaf", "einschlafen", "nachts", "nacht", "schlafenszeit", "bett"],
  ["senioren", "oma", "opa", "eltern", "mutter", "vater", "alter", "seniorenmodus"],
  ["speicher", "speicherplatz", "platz", "storage", "voll"],
  ["kopieren", "abtippen", "abschreiben", "tippen"],
  ["sicherung", "backup", "sichern"],
  ["auto", "fahren", "autofahren", "car", "carplay", "fahrzeug"],
  ["klingel", "turklingel", "doorbell", "klingeln"],
  ["laut", "lauter", "lautstarke", "volume"],
  ["leise", "stumm", "lautlos", "mute"],
  ["geparkt", "parken", "parkplatz", "parked"],
  ["wecker", "alarm", "aufwachen", "wecken"],
  ["umrechnen", "waehrung", "wahrung", "dollar", "euro", "pfund", "currency"],
  ["notfall", "notruf", "sos", "emergency", "unfall"],
  ["verstecken", "ausblenden", "verbergen", "geheim", "privat", "hide"]
];

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SUFFIXES = ["ungen", "ung", "chen", "en", "er", "es", "em", "e", "n", "s"];

/** Very light suffix stripping so "Benachrichtigungen" and "Benachrichtigung" meet. */
export function stem(token: string): string {
  let current = token;
  for (let round = 0; round < 2; round += 1) {
    const suffix = SUFFIXES.find((candidate) => current.endsWith(candidate) && current.length - candidate.length >= 4);
    if (!suffix) break;
    current = current.slice(0, -suffix.length);
  }
  return current;
}

const SYNONYMS = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const stems = group.map((word) => stem(fold(word)));
  for (const member of stems) {
    const existing = SYNONYMS.get(member) ?? new Set<string>();
    stems.forEach((other) => other !== member && existing.add(other));
    SYNONYMS.set(member, existing);
  }
}

export function contentTokens(value: string): string[] {
  return fold(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function stems(value: string): string[] {
  return contentTokens(value).map(stem);
}

export function isGeneric(stemmed: string): boolean {
  return GENERIC.has(stemmed);
}

export function synonymsOf(stemmed: string): string[] {
  return Array.from(SYNONYMS.get(stemmed) ?? []);
}
