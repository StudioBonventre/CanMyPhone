import { QueryIntent, Solution } from "../types";

const STOP = new Set([
  "i", "a", "an", "the", "to", "my", "me", "can", "how", "do", "please",
  "wie", "ich", "mein", "meine", "das", "die", "der", "und", "mit", "auf", "bitte", "kann", "vom", "aus"
]);

function normalize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß ]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

export function rankSolutions(
  query: string,
  items: Solution[],
  platform: "ios" | "android",
  intent?: QueryIntent
): Solution[] {
  const q = normalize(query);
  const raw = query.toLowerCase();
  if (!q.length) return [];

  return items
    .filter((item) => item.platform === platform || item.platform === "both")
    .map((item) => {
      const haystack = normalize([
        item.title,
        item.summary,
        item.category,
        ...(item.aliases ?? []),
        ...(item.entities ?? [])
      ].join(" "));
      const hay = new Set(haystack);
      let score = 0;

      for (const token of q) {
        if (hay.has(token)) score += 4;
        if (item.aliases.some((a) => a.toLowerCase().includes(token))) score += 2;
        if (item.title.toLowerCase().includes(token)) score += 2;
        if (item.entities?.some((entity) => entity.toLowerCase().includes(token))) score += 3;
      }

      for (const alias of item.aliases) {
        if (alias.length > 5 && raw.includes(alias.toLowerCase())) score += 9;
      }

      if (intent) {
        if (item.intents?.includes(intent.kind)) score += 6;
        if (intent.wantsSiri && item.voice && item.voice.route !== "none") score += 8;
        if (intent.wantsAppleIntelligence && item.entities?.includes("apple-intelligence")) score += 12;
        if (intent.wantsAppleIntelligence && item.voice?.route === "siri-ai") score += 10;
        for (const entity of intent.entities) {
          if (item.entities?.includes(entity)) score += 8;
        }
      }

      if (item.builtIn) score += 0.25;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
