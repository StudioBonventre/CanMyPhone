import { QueryIntent, Solution } from "../types";
import { fold, isGeneric, stem, stems, synonymsOf } from "./text";

type IndexedSolution = {
  item: Solution;
  aliasPhrases: string[];
  aliasStemSets: Set<string>[];
  aliasStems: Set<string>;
  titleStems: Set<string>;
  summaryStems: Set<string>;
  tagStems: Set<string>;
  all: string[];
};

type CatalogueIndex = {
  entries: IndexedSolution[];
  idf: Map<string, number>;
};

const indexCache = new WeakMap<Solution[], CatalogueIndex>();

function buildIndex(items: Solution[]): CatalogueIndex {
  const entries = items.map((item) => {
    const aliasStems = new Set(item.aliases.flatMap((alias) => stems(alias)));
    const titleStems = new Set(stems(item.title));
    const summaryStems = new Set(stems(item.summary));
    const tagStems = new Set(stems([item.category, ...(item.entities ?? [])].join(" ")));
    const all = Array.from(new Set([...aliasStems, ...titleStems, ...summaryStems, ...tagStems]));
    return {
      item,
      aliasPhrases: item.aliases.map(fold).filter((phrase) => phrase.length > 3),
      aliasStemSets: item.aliases.map((alias) => new Set(stems(alias))),
      aliasStems,
      titleStems,
      summaryStems,
      tagStems,
      all
    };
  });

  const documentFrequency = new Map<string, number>();
  for (const entry of entries) {
    for (const token of entry.all) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  documentFrequency.forEach((count, token) => {
    idf.set(token, Math.log(1 + entries.length / count));
  });
  return { entries, idf };
}

function indexFor(items: Solution[]): CatalogueIndex {
  let index = indexCache.get(items);
  if (!index) {
    index = buildIndex(items);
    indexCache.set(items, index);
  }
  return index;
}

/** How strongly one query stem matches one solution, 0 if not at all. */
function stemWeight(queryStem: string, entry: IndexedSolution): number {
  if (entry.aliasStems.has(queryStem)) return 3;
  if (entry.titleStems.has(queryStem)) return 2.5;
  if (entry.tagStems.has(queryStem)) return 2;
  if (entry.summaryStems.has(queryStem)) return 1;
  return 0;
}

/** Compound words: "datenvolumen" ↔ "daten", "kinderschutz" ↔ "kinder". */
function compoundWeight(queryStem: string, entry: IndexedSolution): number {
  if (queryStem.length < 5) return 0;
  for (const candidate of entry.aliasStems) {
    if (candidate.length < 5) continue;
    if (candidate.startsWith(queryStem) || queryStem.startsWith(candidate)) return 1.4;
  }
  for (const candidate of entry.titleStems) {
    if (candidate.length < 5) continue;
    if (candidate.startsWith(queryStem) || queryStem.startsWith(candidate)) return 1.1;
  }
  return 0;
}

export type ScoredSolution = {
  item: Solution;
  relevance: number;
  score: number;
  /** False when only one of several meaningful words matched – worth a "Did you mean …?" check. */
  strong: boolean;
};

/** Minimum lexical relevance before something counts as an answer at all. */
export const MIN_RELEVANCE = 3.2;

export function scoreSolutions(
  query: string,
  items: Solution[],
  platform: "ios" | "android",
  intent?: QueryIntent
): ScoredSolution[] {
  const foldedQuery = ` ${fold(query)} `;
  const queryStems = Array.from(new Set(stems(query)));
  if (!queryStems.length) return [];

  const specificStems = queryStems.filter((token) => !isGeneric(token));
  if (!specificStems.length) return [];

  const { entries, idf } = indexFor(items);
  const maxIdf = Math.log(1 + entries.length);

  return entries
    .filter(({ item }) => item.platform === platform || item.platform === "both")
    .map((entry) => {
      let relevance = 0;
      let specificHits = 0;

      for (const token of specificStems) {
        const weight = idf.get(token) ?? maxIdf;
        let hit = stemWeight(token, entry) * weight;

        if (!hit) {
          // A synonym counts slightly less than the user's own word.
          for (const synonym of synonymsOf(token)) {
            const synonymHit = stemWeight(synonym, entry) * (idf.get(synonym) ?? maxIdf) * 0.75;
            hit = Math.max(hit, synonymHit);
          }
        }
        if (!hit) hit = compoundWeight(token, entry) * weight;

        if (hit > 0) {
          relevance += hit;
          specificHits += 1;
        }
      }

      // Whole alias phrases inside the question are the strongest signal we have.
      let phraseBonus = 0;
      for (const phrase of entry.aliasPhrases) {
        if (foldedQuery.includes(` ${phrase} `)) {
          phraseBonus = Math.max(phraseBonus, 6 + phrase.split(" ").length * 2);
        }
      }
      relevance += phraseBonus;

      // Several of the user's words inside the same alias: a strong, order-free phrase signal.
      let cooccurrence = 0;
      for (const aliasSet of entry.aliasStemSets) {
        const shared = queryStems.filter((token) => aliasSet.has(token)).length;
        if (shared >= 2) cooccurrence = Math.max(cooccurrence, (shared - 1) * 4);
      }
      relevance += cooccurrence;

      if (specificHits === 0 && phraseBonus === 0) {
        return { item: entry.item, relevance: 0, score: 0, strong: false };
      }

      // Reward covering more of what the person actually said.
      const coverage = specificHits / specificStems.length;
      relevance *= 0.6 + 0.4 * coverage;

      // One lucky word out of several is weak evidence ("backe brot" ≠ "back tap").
      if (specificStems.length >= 2 && specificHits === 1 && phraseBonus === 0 && cooccurrence === 0) {
        relevance *= 0.5;
      }

      if (intent && relevance > 0) {
        if (entry.item.intents?.includes(intent.kind) && intent.kind !== "general") relevance += 1.5;
        if (intent.wantsSiri && entry.item.voice && entry.item.voice.route !== "none") relevance += 4;
        if (intent.wantsAppleIntelligence && entry.item.entities?.includes("apple-intelligence")) relevance += 8;
        if (intent.wantsAppleIntelligence && entry.item.voice?.route === "siri-ai") relevance += 6;
        for (const entity of intent.entities) {
          if (entry.item.entities?.includes(entity)) relevance += 4;
        }
      }

      // Ranking preferences must never create a match by themselves.
      // They only break ties after the query has real lexical relevance.
      const preferenceBonus = relevance > 0
        ? (entry.item.builtIn ? 0.3 : 0) + (entry.item.setupMinutes <= 2 ? 0.1 : 0)
        : 0;

      const strong = phraseBonus > 0 || cooccurrence > 0 || specificHits >= 2 || specificStems.length === 1;
      return { item: entry.item, relevance, score: relevance + preferenceBonus, strong };
    })
    .filter((entry) => entry.relevance >= MIN_RELEVANCE)
    .sort((a, b) => b.score - a.score);
}

export function rankSolutions(
  query: string,
  items: Solution[],
  platform: "ios" | "android",
  intent?: QueryIntent
): Solution[] {
  const scored = scoreSolutions(query, items, platform, intent);
  if (!scored.length) return [];

  // Drop weak tail results: alternatives must be at least a third as relevant as the winner.
  const best = scored[0].score;
  return scored.filter((entry) => entry.score >= best * 0.33).map((entry) => entry.item);
}

export { stem };
