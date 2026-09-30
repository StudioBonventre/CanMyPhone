export type SuggestionSignal = {
  id: string;
  kind: "accepted" | "rejected" | "used" | "integration" | "context";
  capabilityId: string;
  at: number;
};

export type PersonalizationProfile = {
  proactiveSuggestions: boolean;
  signals: SuggestionSignal[];
};

export const EMPTY_PERSONALIZATION_PROFILE: PersonalizationProfile = {
  proactiveSuggestions: true,
  signals: []
};

export function recordSignal(profile: PersonalizationProfile, signal: SuggestionSignal): PersonalizationProfile {
  return { ...profile, signals: [...profile.signals, signal].slice(-250) };
}

export function suggestionsAllowed(profile: PersonalizationProfile): boolean {
  return profile.proactiveSuggestions;
}

export function clearPersonalization(profile: PersonalizationProfile): PersonalizationProfile {
  return { ...profile, signals: [] };
}
