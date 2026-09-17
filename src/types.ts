export type Platform = "ios" | "android" | "both";
export type Region = "eu" | "outside_eu" | "unknown";
export type VoiceRoute = "siri-direct" | "shortcut" | "siri-ai" | "none";
export type MotionPhase = "idle" | "listening" | "diving" | "searching" | "answer" | "guiding" | "submerged" | "emerging" | "success";
/** Kept for compatibility with older modules. */
export type DropPhase = MotionPhase;

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

export type PermissionKind = "notifications" | "camera" | "microphone" | "photos";

export type SettingsGuide = {
  /** Human-readable public path the user can follow in Settings. */
  path: string[];
  /** Public iOS APIs only. Never use private App-Prefs/prefs URLs. */
  openMode?: "app-settings" | "manual-system";
  /** Optional app-owned permission CanMyPhone can request through the real iOS system sheet. */
  permission?: PermissionKind;
  note?: string;
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
  settings?: SettingsGuide;
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

export type GuideSessionStatus = "active" | "background" | "completed";

export type GuideSession = {
  id: string;
  solutionId: string;
  title: string;
  steps: string[];
  currentStep: number;
  status: GuideSessionStatus;
  startedAt: number;
  updatedAt: number;
};

export type EntitlementState = {
  pro: boolean;
  credits: number;
  freeAutomaticActionUsed: boolean;
};
