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

export type AutomationTriggerKind =
  | "time" | "alarm" | "sleep" | "arrive" | "leave" | "carplay" | "bluetooth" | "wifi"
  | "battery" | "charger" | "low-power" | "app" | "focus" | "nfc" | "message" | "email" | "sound";

export type AutomationAction = {
  /** Action name as shown in Kurzbefehle, e.g. „Stromsparmodus festlegen“. */
  label: string;
  /** What to type into the action search – robust even if Apple renames the action slightly. */
  search: string;
  /** Optional setting inside the action, e.g. „auf Ein stellen“. */
  detail?: string;
};

export type AutomationSpec = {
  trigger: {
    kind: AutomationTriggerKind;
    /** Plain-language „Wenn …“ line shown on the recipe card. */
    when: string;
    /** Exact trigger configuration in Kurzbefehle, e.g. „Fällt unter 20 %“. */
    setup: string;
  };
  /** Plain-language „Dann …“ line shown on the recipe card. */
  then: string;
  actions: AutomationAction[];
  /** Apps or accessories the person needs, e.g. „Tesla-App“. */
  needs?: string[];
  /** A sentence the person can paste into Apple Intelligence in Kurzbefehle (iOS 27+). */
  prompt: string;
  /** Shown prominently before setup when the automation moves things in the real world. */
  safety?: string;
  tier: "free" | "pro";
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
  /** Present on automation recipes: the „Wenn … dann …“ blueprint for Kurzbefehle. */
  automation?: AutomationSpec;
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
  /** True when the match rests on a single word – the UI asks "Meinst du …?" instead of asserting. */
  uncertain?: boolean;
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
  /** Product id of the active subscription, if known. */
  productId?: string;
  /** When StoreKit last confirmed the state (ms since epoch). */
  checkedAt?: number;
};
