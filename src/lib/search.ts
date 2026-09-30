import { QueryIntent, Solution } from "../types";

const STOP = new Set([
  // English function words
  "i", "a", "an", "the", "to", "my", "me", "can", "how", "do", "please", "it", "is", "of", "for", "with", "in", "on",
  // German function words. These must never create a capability match on their own.
  "wie", "ich", "du", "mir", "dir", "mein", "meine", "dein", "deine", "das", "die", "der", "den", "dem", "des",
  "ein", "eine", "einer", "einem", "einen", "und", "oder", "mit", "auf", "bitte", "kann", "konnte", "könnte",
  "vom", "von", "aus", "fur", "für", "zu", "zur", "zum", "im", "am", "ist", "sind", "soll", "sollte", "was"
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
      let relevance = 0;

      for (const token of q) {
        if (hay.has(token)) relevance += 4;
        if (item.aliases.some((a) => a.toLowerCase().includes(token))) relevance += 2;
        if (item.title.toLowerCase().includes(token)) relevance += 2;
        if (item.entities?.some((entity) => entity.toLowerCase().includes(token))) relevance += 3;
      }

      for (const alias of item.aliases) {
        if (alias.length > 5 && raw.includes(alias.toLowerCase())) relevance += 9;
      }

      if (intent) {
        if (item.intents?.includes(intent.kind) && intent.kind !== "general") relevance += 6;
        if (intent.wantsSiri && item.voice && item.voice.route !== "none") relevance += 8;
        if (intent.wantsAppleIntelligence && item.entities?.includes("apple-intelligence")) relevance += 12;
        if (intent.wantsAppleIntelligence && item.voice?.route === "siri-ai") relevance += 10;
        for (const entity of intent.entities) {
          if (item.entities?.includes(entity)) relevance += 8;
        }
      }

      // Ranking preferences must never create a match by themselves.
      // They only break ties after the query has real semantic/lexical relevance.
      const preferenceBonus = relevance > 0
        ? (item.builtIn ? 0.5 : 0) + (item.setupMinutes <= 2 ? 0.15 : 0)
        : 0;

      return { item, relevance, score: relevance + preferenceBonus };
    })
    .filter((entry) => entry.relevance > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
