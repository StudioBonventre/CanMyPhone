export type Platform = "ios" | "android" | "both";
export type Region = "eu" | "outside_eu" | "unknown";
export type VoiceRoute = "siri-direct" | "shortcut" | "siri-ai" | "none";

export type Source = {
  label: string;
  url: string;
};

export type Availability = {
  regions?: Region[];
  excludedRegions?: Region[];
  minOsMajor?: number;
  requiresAppleIntelligence?: boolean;
  languages?: string[];
};

export type VoiceIntegration = {
  route: VoiceRoute;
  invocation?: string;
  note?: string;
  fallback?: string;
};

export type Solution = {
  id: string;
  platform: Platform;
  title: string;
  summary: string;
  aliases: string[];
  category: string;
  builtIn: boolean;
  cost: string;
  setupMinutes: number;
  minOs?: string;
  requirements?: string[];
  steps: string[];
  sources: Source[];
  entities?: string[];
  intents?: QueryIntentKind[];
  availability?: Availability;
  voice?: VoiceIntegration;
};

export type SolutionFeedback = "worked" | "didnt_work" | "already_knew" | "not_relevant";

export type NeedRadarProfile = {
  enabled: boolean;
  interactionCount: number;
  categoryAffinity: Record<string, number>;
  knownSolutionIds: string[];
  dismissedSolutionIds: string[];
  positiveSolutionIds: string[];
};

export type QueryIntentKind =
  | "enable"
  | "howto"
  | "voice-control"
  | "automation"
  | "availability"
  | "discover"
  | "general";

export type QueryIntent = {
  raw: string;
  kind: QueryIntentKind;
  wantsSiri: boolean;
  wantsAppleIntelligence: boolean;
  wantsEnable: boolean;
  entities: string[];
  confidence: number;
};

export type DeviceContext = {
  platform: "ios" | "android";
  region: Region;
  osMajor?: number;
  appleIntelligenceCapable?: boolean;
  language?: string;
};

export type ConversationResult = {
  intent: QueryIntent;
  solutions: Solution[];
  followUp?: string;
  notice?: string;
};
