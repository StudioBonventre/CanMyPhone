import type { Solution } from "../types";

export type CategoryInfo = {
  id: string;
  label: string;
  /** One short line that tells people what they find inside. */
  hint: string;
  symbol: string;
  /** "automation" categories hold recipes, "tip" categories hold one-off how-tos. */
  group: "automation" | "tip";
};

/** Display order in Discover. Categories without solutions on the current platform are hidden. */
export const categories: CategoryInfo[] = [
  { id: "auto-home", label: "Zuhause", hint: "Ankommen, losgehen, Licht", symbol: "🏠", group: "automation" },
  { id: "auto-car", label: "Auto & unterwegs", hint: "CarPlay, Tesla, Heimweg", symbol: "🚗", group: "automation" },
  { id: "auto-morning", label: "Morgens & abends", hint: "Wecker, Schlafen, Laden", symbol: "🌙", group: "automation" },
  { id: "auto-battery", label: "Akku", hint: "Nie wieder leer überrascht", symbol: "🔋", group: "automation" },
  { id: "auto-focus", label: "Fokus & Freizeit", hint: "Büro, Kopfhörer, Social Media", symbol: "🎧", group: "automation" },
  { id: "auto-family", label: "Familie & Sicherheit", hint: "Ankunft, Notfall, Akku", symbol: "💛", group: "automation" },
  { id: "battery", label: "Akku", hint: "Länger durchhalten, Akku schonen", symbol: "⚡︎", group: "tip" },
  { id: "security", label: "Sicherheit", hint: "Verlorenes finden, Daten schützen", symbol: "◈", group: "tip" },
  { id: "safety", label: "Notfall", hint: "Hilfe rufen, sicher ankommen", symbol: "✚", group: "tip" },
  { id: "communication", label: "Anrufe & Nachrichten", hint: "Spam stoppen, Nachrichten zurückholen", symbol: "✉︎", group: "tip" },
  { id: "photos", label: "Fotos & Bildschirm", hint: "Screenshots, Freistellen, Teilen", symbol: "◐", group: "tip" },
  { id: "productivity", label: "Alltagshelfer", hint: "Unterschreiben, diktieren, messen", symbol: "✓", group: "tip" },
  { id: "wellbeing", label: "Ruhe & Fokus", hint: "Weniger Ablenkung, weniger Handyzeit", symbol: "☾", group: "tip" },
  { id: "family", label: "Familie", hint: "Kinder schützen, Standort teilen", symbol: "♡", group: "tip" },
  { id: "accessibility", label: "Besser sehen & hören", hint: "Große Schrift, Lupe, einfacher Modus", symbol: "◎", group: "tip" },
  { id: "display", label: "Display", hint: "Dunkelmodus, StandBy, automatische Sperre", symbol: "▣", group: "tip" },
  { id: "sound", label: "Töne", hint: "Klingelton, Vibration, Gehörschutz", symbol: "♪", group: "tip" },
  { id: "controls", label: "Tasten & Steuerung", hint: "Kontrollzentrum, Aktionstaste", symbol: "◉", group: "tip" },
  { id: "connectivity", label: "WLAN & Daten", hint: "Hotspot, Datenvolumen, AirDrop", symbol: "≋", group: "tip" },
  { id: "storage", label: "Speicher & Backup", hint: "Platz schaffen, Daten sichern", symbol: "▤", group: "tip" },
  { id: "assistant", label: "Siri", hint: "Siri einrichten und nutzen", symbol: "✦", group: "tip" },
  { id: "automation", label: "Automationen", hint: "Kurzbefehle, die mitdenken", symbol: "↻", group: "tip" },
  { id: "travel", label: "Unterwegs", hint: "Parken, Offline-Karten", symbol: "➤", group: "tip" },
  { id: "car", label: "Auto", hint: "Fahren ohne Ablenkung", symbol: "◆", group: "tip" },
  { id: "health", label: "Gesundheit", hint: "Medikamente, Schlaf", symbol: "✚", group: "tip" },
  { id: "home", label: "Zuhause", hint: "Smart Home automatisieren", symbol: "⌂", group: "tip" },
  { id: "personalize", label: "Personalisieren", hint: "Hintergrund, Standard-Apps", symbol: "✎", group: "tip" },
  { id: "money", label: "Abos & Käufe", hint: "Abos finden und kündigen", symbol: "€", group: "tip" },
  { id: "permissions", label: "CanMyPhone", hint: "Berechtigungen dieser App", symbol: "•", group: "tip" }
];

const byId = new Map(categories.map((category) => [category.id, category]));

export function categoryLabel(id: string): string {
  return byId.get(id)?.label ?? id;
}

export function categoriesWithSolutions(
  items: Solution[],
  platform: "ios" | "android",
  group: CategoryInfo["group"] = "tip"
): (CategoryInfo & { count: number })[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.platform !== platform && item.platform !== "both") continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return categories
    .filter((category) => category.group === group && (counts.get(category.id) ?? 0) > 0 && category.id !== "permissions")
    .map((category) => ({ ...category, count: counts.get(category.id) ?? 0 }));
}

export function solutionsInCategory(items: Solution[], categoryId: string, platform: "ios" | "android"): Solution[] {
  return items
    .filter((item) => item.category === categoryId && (item.platform === platform || item.platform === "both"))
    .sort((a, b) =>
      tierRank(a) - tierRank(b) || a.setupMinutes - b.setupMinutes || a.title.localeCompare(b.title, "de"));
}

/** Free recipes first, so people can always start without paying. */
function tierRank(item: Solution): number {
  return item.automation?.tier === "pro" ? 1 : 0;
}
