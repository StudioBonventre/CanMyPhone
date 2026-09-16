import { NeedRadarProfile, Solution, SolutionFeedback } from "../types";

const TOKEN_STOP = new Set([
  "i", "a", "an", "the", "to", "my", "me", "can", "and", "or", "is", "it", "of", "for",
  "wie", "ich", "mein", "meine", "das", "die", "der", "und", "mit", "auf", "fur", "für", "was"
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß ]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !TOKEN_STOP.has(token));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function adjustCategory(profile: NeedRadarProfile, category: string, delta: number): NeedRadarProfile {
  return {
    ...profile,
    categoryAffinity: {
      ...profile.categoryAffinity,
      [category]: Math.max(-8, Math.min(12, (profile.categoryAffinity[category] ?? 0) + delta))
    }
  };
}

export function createNeedRadarProfile(): NeedRadarProfile {
  return {
    enabled: true,
    interactionCount: 0,
    categoryAffinity: {},
    knownSolutionIds: [],
    dismissedSolutionIds: [],
    positiveSolutionIds: []
  };
}

export function learnFromProblem(
  profile: NeedRadarProfile,
  query: string,
  items: Solution[],
  platform: "ios" | "android"
): NeedRadarProfile {
  if (!profile.enabled || !query.trim()) return profile;

  const queryTokens = new Set(tokens(query));
  const scored = items
    .filter((item) => item.platform === platform || item.platform === "both")
    .map((item) => {
      const haystack = new Set(tokens([item.title, item.summary, item.category, ...item.aliases].join(" ")));
      let overlap = 0;
      queryTokens.forEach((token) => {
        if (haystack.has(token)) overlap += 1;
      });
      return { item, overlap };
    })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3);

  let next = { ...profile, interactionCount: profile.interactionCount + 1 };
  scored.forEach(({ item, overlap }, index) => {
    const weight = index === 0 ? 1.4 : 0.6;
    next = adjustCategory(next, item.category, Math.min(2, overlap) * weight);
  });
  return next;
}

export function learnFromOpen(profile: NeedRadarProfile, solution: Solution): NeedRadarProfile {
  if (!profile.enabled) return profile;
  const next = adjustCategory(profile, solution.category, 1);
  return { ...next, interactionCount: next.interactionCount + 1 };
}

export function learnFromFeedback(
  profile: NeedRadarProfile,
  solution: Solution,
  feedback: SolutionFeedback
): NeedRadarProfile {
  if (!profile.enabled) return profile;

  let next = { ...profile, interactionCount: profile.interactionCount + 1 };

  if (feedback === "worked") {
    next = adjustCategory(next, solution.category, 3);
    next.positiveSolutionIds = unique([...next.positiveSolutionIds, solution.id]);
  }

  if (feedback === "already_knew") {
    next = adjustCategory(next, solution.category, 0.5);
    next.knownSolutionIds = unique([...next.knownSolutionIds, solution.id]);
  }

  if (feedback === "not_relevant") {
    next = adjustCategory(next, solution.category, -3);
    next.dismissedSolutionIds = unique([...next.dismissedSolutionIds, solution.id]);
  }

  if (feedback === "didnt_work") {
    next = adjustCategory(next, solution.category, -1);
  }

  return next;
}

export function radarRecommendations(
  profile: NeedRadarProfile,
  items: Solution[],
  platform: "ios" | "android"
): Solution[] {
  if (!profile.enabled || profile.interactionCount === 0) return [];

  return items
    .filter((item) => item.platform === platform || item.platform === "both")
    .filter((item) => !profile.dismissedSolutionIds.includes(item.id))
    .map((item) => {
      const affinity = profile.categoryAffinity[item.category] ?? 0;
      const knownPenalty = profile.knownSolutionIds.includes(item.id) ? -6 : 0;
      const positivePenalty = profile.positiveSolutionIds.includes(item.id) ? -3 : 0;
      const nativeBonus = item.builtIn ? 1 : 0;
      const easyBonus = item.setupMinutes <= 2 ? 0.5 : 0;
      return { item, score: affinity + knownPenalty + positivePenalty + nativeBonus + easyBonus };
    })
    .filter((entry) => entry.score > 0.75)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

export function topLearnedCategories(profile: NeedRadarProfile): string[] {
  return Object.entries(profile.categoryAffinity)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
}
