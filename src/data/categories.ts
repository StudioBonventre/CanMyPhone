import type { Solution } from "../types";

export type CategoryInfo = {
  id: string;
  label: string;
  /** One short line that tells people what they find inside. */
  hint: string;
  symbol: string;
};

/** Display order in Discover. Categories without solutions on the current platform are hidden. */
export const categories: CategoryInfo[] = [
  { id: "battery", label: "Akku", hint: "Länger durchhalten, Akku schonen", symbol: "⚡︎" },
  { id: "security", label: "Sicherheit", hint: "Verlorenes finden, Daten schützen", symbol: "◈" },
  { id: "safety", label: "Notfall", hint: "Hilfe rufen, sicher ankommen", symbol: "✚" },
  { id: "communication", label: "Anrufe & Nachrichten", hint: "Spam stoppen, Nachrichten zurückholen", symbol: "✉︎" },
  { id: "photos", label: "Fotos & Bildschirm", hint: "Screenshots, Freistellen, Teilen", symbol: "◐" },
  { id: "productivity", label: "Alltagshelfer", hint: "Unterschreiben, diktieren, messen", symbol: "✓" },
  { id: "wellbeing", label: "Ruhe & Fokus", hint: "Weniger Ablenkung, weniger Handyzeit", symbol: "☾" },
  { id: "family", label: "Familie", hint: "Kinder schützen, Standort teilen", symbol: "♡" },
  { id: "accessibility", label: "Besser sehen & hören", hint: "Große Schrift, Lupe, einfacher Modus", symbol: "◎" },
  { id: "display", label: "Display", hint: "Dunkelmodus, StandBy, automatische Sperre", symbol: "▣" },
  { id: "sound", label: "Töne", hint: "Klingelton, Vibration, Gehörschutz", symbol: "♪" },
  { id: "controls", label: "Tasten & Steuerung", hint: "Kontrollzentrum, Aktionstaste", symbol: "◉" },
  { id: "connectivity", label: "WLAN & Daten", hint: "Hotspot, Datenvolumen, AirDrop", symbol: "≋" },
  { id: "storage", label: "Speicher & Backup", hint: "Platz schaffen, Daten sichern", symbol: "▤" },
  { id: "assistant", label: "Siri", hint: "Siri einrichten und nutzen", symbol: "✦" },
  { id: "automation", label: "Automationen", hint: "Kurzbefehle, die mitdenken", symbol: "↻" },
  { id: "travel", label: "Unterwegs", hint: "Parken, Offline-Karten", symbol: "➤" },
  { id: "car", label: "Auto", hint: "Fahren ohne Ablenkung", symbol: "◆" },
  { id: "health", label: "Gesundheit", hint: "Medikamente, Schlaf", symbol: "✚" },
  { id: "home", label: "Zuhause", hint: "Smart Home automatisieren", symbol: "⌂" },
  { id: "personalize", label: "Personalisieren", hint: "Hintergrund, Standard-Apps", symbol: "✎" },
  { id: "money", label: "Abos & Käufe", hint: "Abos finden und kündigen", symbol: "€" },
  { id: "permissions", label: "CanMyPhone", hint: "Berechtigungen dieser App", symbol: "•" }
];

const byId = new Map(categories.map((category) => [category.id, category]));

export function categoryLabel(id: string): string {
  return byId.get(id)?.label ?? id;
}

export function categoriesWithSolutions(items: Solution[], platform: "ios" | "android"): (CategoryInfo & { count: number })[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.platform !== platform && item.platform !== "both") continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return categories
    .filter((category) => (counts.get(category.id) ?? 0) > 0 && category.id !== "permissions")
    .map((category) => ({ ...category, count: counts.get(category.id) ?? 0 }));
}

export function solutionsInCategory(items: Solution[], categoryId: string, platform: "ios" | "android"): Solution[] {
  return items
    .filter((item) => item.category === categoryId && (item.platform === platform || item.platform === "both"))
    .sort((a, b) => a.setupMinutes - b.setupMinutes || a.title.localeCompare(b.title, "de"));
}
