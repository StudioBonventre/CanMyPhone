import { CAPABILITY_CATALOG_V2, capabilityV2 } from "./capabilityCatalogV2";
import { resolveStrategy, type ShortcutDefinition, type ShortcutStep } from "./shortcutCompiler";
import { validateShortcutDefinition } from "./shortcutValidation";
import { compactProviderCatalogue } from "./providerRegistry";

export type AutomationSuggestion = {
  title: string;
  message: string;
  proposedGoal?: string;
};

export type SemanticAutomationResult =
  | { kind: "understood"; definition: ShortcutDefinition; suggestion?: AutomationSuggestion }
  | { kind: "clarification"; question: string }
  | { kind: "not-automation" }
  | { kind: "unavailable" };

type ModelStep = {
  capabilityId: string;
  parameters: Record<string, string | number | boolean>;
};

type ModelEnvelope = {
  kind: "automation" | "clarification" | "not_automation";
  confidence: number;
  trigger: ModelStep | null;
  actions: ModelStep[];
  clarificationQuestion: string | null;
  suggestion: {
    title: string;
    message: string;
    proposedGoal: string | null;
  } | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJSON(raw: string): unknown {
  const trimmed = raw.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
  }
}

function parseStep(value: unknown): ModelStep | null {
  if (!isObject(value) || typeof value.capabilityId !== "string" || !isObject(value.parameters)) return null;
  const parameters: Record<string, string | number | boolean> = {};
  for (const [key, parameter] of Object.entries(value.parameters)) {
    if (!["string", "number", "boolean"].includes(typeof parameter)) return null;
    parameters[key] = parameter as string | number | boolean;
  }
  return { capabilityId: value.capabilityId, parameters };
}

function parseEnvelope(value: unknown): ModelEnvelope | null {
  if (!isObject(value)) return null;
  if (!["automation", "clarification", "not_automation"].includes(String(value.kind))) return null;
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) return null;

  if (value.kind === "clarification") {
    if (typeof value.clarificationQuestion !== "string" || !value.clarificationQuestion.trim()) return null;
    return {
      kind: "clarification",
      confidence: value.confidence,
      trigger: null,
      actions: [],
      clarificationQuestion: value.clarificationQuestion.trim(),
      suggestion: null
    };
  }

  if (value.kind === "not_automation") {
    return {
      kind: "not_automation",
      confidence: value.confidence,
      trigger: null,
      actions: [],
      clarificationQuestion: null,
      suggestion: null
    };
  }

  const trigger = parseStep(value.trigger);
  if (!trigger || !Array.isArray(value.actions) || value.actions.length === 0) return null;
  const actions = value.actions.map(parseStep);
  if (actions.some((item) => !item)) return null;

  let suggestion: ModelEnvelope["suggestion"] = null;
  if (value.suggestion !== null && value.suggestion !== undefined) {
    if (!isObject(value.suggestion) || typeof value.suggestion.title !== "string" || typeof value.suggestion.message !== "string") return null;
    const proposedGoal = typeof value.suggestion.proposedGoal === "string" && value.suggestion.proposedGoal.trim()
      ? value.suggestion.proposedGoal.trim()
      : null;
    suggestion = {
      title: value.suggestion.title.trim().slice(0, 80),
      message: value.suggestion.message.trim().slice(0, 240),
      proposedGoal
    };
  }

  return {
    kind: "automation",
    confidence: value.confidence,
    trigger,
    actions: actions as ModelStep[],
    clarificationQuestion: null,
    suggestion
  };
}

function buildDefinition(goal: string, envelope: ModelEnvelope): ShortcutDefinition | null {
  if (envelope.kind !== "automation" || !envelope.trigger || !envelope.actions.length) return null;

  const trigger = envelope.trigger as ShortcutStep;
  const actions = envelope.actions as ShortcutStep[];
  const steps = [trigger, ...actions];
  const caps = steps.map((step) => capabilityV2(step.capabilityId));
  if (caps.some((cap) => !cap)) return null;
  const known = caps.filter((cap): cap is NonNullable<typeof cap> => Boolean(cap));
  if (capabilityV2(trigger.capabilityId)?.role !== "trigger") return null;
  if (actions.some((action) => capabilityV2(action.capabilityId)?.role !== "action")) return null;

  const strategy = resolveStrategy(steps);
  const integrations = [...new Set(known.map((cap) => cap.integration).filter((value): value is string => Boolean(value)))];
  const requiredSetup = [...new Set(known.flatMap((cap) => cap.permissions).concat(integrations))];
  const riskRank = { low: 0, medium: 1, high: 2 } as const;
  const riskByRank = ["low", "medium", "high"] as const;
  const risk = riskByRank[Math.max(0, ...known.map((cap) => riskRank[cap.risk]))];
  const confirmationRequired = known.some((cap) => cap.confirmation);
  const background = known.every((cap) => cap.background);

  let feasibility: ShortcutDefinition["feasibility"] = "FULLY_AUTOMATIC";
  const reasons: string[] = [];
  if (strategy === "UNSUPPORTED") {
    feasibility = "UNSUPPORTED";
    reasons.push("Mindestens ein Schritt wird nicht unterstützt.");
  } else if (integrations.length) {
    feasibility = "REQUIRES_THIRD_PARTY";
    reasons.push("Eine externe Integration muss verbunden werden.");
  } else if (known.some((cap) => !cap.background || cap.confirmation)) {
    feasibility = "PARTIALLY_AUTOMATIC";
    reasons.push("Mindestens ein Schritt benötigt Nutzerinteraktion oder Vordergrund.");
  } else if (strategy === "PERSONAL_AUTOMATION" || requiredSetup.length) {
    feasibility = "ONE_TIME_SETUP";
    reasons.push("Die persönliche Automation oder Berechtigung muss einmalig eingerichtet werden.");
  } else {
    reasons.push("Alle Schritte können nach Aktivierung ohne weitere Interaktion laufen.");
  }

  const definition: ShortcutDefinition = {
    name: goal.slice(0, 80),
    trigger,
    conditions: [],
    actions,
    variables: known.some((cap) => cap.requiresPro) ? { entitlement: "pro" } : {},
    integrations,
    requiredSetup,
    executionStrategy: strategy,
    feasibility,
    reasons,
    confidence: Math.max(0.82, Math.min(0.98, envelope.confidence)),
    risk,
    confirmationRequired,
    background
  };

  const validated = validateShortcutDefinition(definition);
  return validated.ok ? validated.definition : null;
}

function compactCatalogue(): string {
  return CAPABILITY_CATALOG_V2
    .filter((cap) => cap.role === "trigger" || cap.role === "action")
    .map((cap) => {
      const params = Object.entries(cap.parameters)
        .map(([name, rule]) => `${name}:${rule.type}${rule.required ? "!" : ""}${rule.min !== undefined ? `[${rule.min}..${rule.max}]` : ""}`)
        .join(",");
      return `${cap.id} | ${cap.role} | ${cap.description} | params ${params || "none"}`;
    })
    .join("\n");
}

export function acceptSemanticAutomationOutput(goal: string, raw: string): SemanticAutomationResult {
  const envelope = parseEnvelope(parseJSON(raw));
  if (!envelope) return { kind: "unavailable" };
  if (envelope.kind === "not_automation") return { kind: "not-automation" };
  if (envelope.kind === "clarification") return { kind: "clarification", question: envelope.clarificationQuestion ?? "Was genau soll wann passieren?" };
  if (envelope.confidence < 0.72) return { kind: "clarification", question: "Ich glaube, ich verstehe die Idee, aber noch nicht sicher genug. Was soll wann passieren?" };

  const definition = buildDefinition(goal, envelope);
  if (!definition) return { kind: "unavailable" };

  const suggestion = envelope.suggestion?.title && envelope.suggestion.message
    ? {
        title: envelope.suggestion.title,
        message: envelope.suggestion.message,
        ...(envelope.suggestion.proposedGoal ? { proposedGoal: envelope.suggestion.proposedGoal } : {})
      }
    : undefined;

  return { kind: "understood", definition, ...(suggestion ? { suggestion } : {}) };
}

export async function interpretAutomationWithOnDeviceAI(goal: string): Promise<SemanticAutomationResult> {
  if (!goal.trim()) return { kind: "unavailable" };

  try {
    // Keep the native Expo/React Native bridge out of the pure parser module
    // until the on-device interpreter is actually invoked. This keeps the
    // validation helpers runnable in Node-based unit tests.
    const { CanMyPhoneNative } = await import("../../modules/canmyphone-native");
    if (!CanMyPhoneNative) return { kind: "unavailable" };

    const status = await CanMyPhoneNative.foundationModelStatus();
    if (!status.available) return { kind: "unavailable" };

    const prompt = [
      "Du bist der semantische Automation-Interpreter von CanMyPhone.",
      "Verstehe die Absicht des Nutzers unabhängig von Wortwahl, Grammatik, Umgangssprache oder Tippfehlern.",
      "Unterscheide zwischen einer einmaligen Aktion und einer Automation mit Auslöser.",
      "CanMyPhone soll die gleiche Art von Automationswünschen verstehen, die Nutzer in Apple Kurzbefehle formulieren: Zeit, Alarm, Schlaf, Orte, CarPlay, Mail, Nachrichten, Transaktionen, WLAN, Bluetooth, Apple Watch, NFC, Apps, Flugmodus, Fokus, Stromsparmodus, Batterie, Ladegerät und Geräuscherkennung.",
      "Für Automationen darfst du ausschließlich Capability-IDs aus dem Katalog verwenden. Erfinde niemals IDs oder Parameter.",
      "Fehlt eine für die Ausführung notwendige Angabe, stelle genau eine kurze Rückfrage.",
      "Bei Prozentangaben darfst du eindeutige natürliche Begriffe normalisieren: 'voll', 'ganz hoch', 'maximal' => 100; 'halb' => 50; 'Minimum', 'minimal', 'ganz dunkel' oder 'aus' bei Helligkeit => 0.",
      "App-Namen werden als freie Zeichenkette im Parameter value von trigger.app-opened übernommen. Erfinde aber keine konkrete installierte App.",
      "Der Nutzer darf mehrere Hersteller, Apps und Geräte in einer Automation kombinieren. Zerlege den Wunsch in EINEN Trigger und mehrere unabhängige Aktionen.",
      "Nutze provider-neutrale Capability-IDs für Herstellergeräte: vehicle.lock / vehicle.unlock sowie smart-home.cover.open / close, smart-home.light.set und smart-home.climate.set. Bewahre genannte Marken, Anbieter und Räume in den Parametern.",
      "Beispiel: 'Wenn ich heim komme, Tesla zusperren und Homematic-IP-Rollläden im Wohnzimmer hoch' => trigger.location-enter(home), vehicle.lock {brand:'Tesla'}, smart-home.cover.open {provider:'Homematic IP', room:'Wohnzimmer'}.",
      "Erfinde niemals eine API oder behaupte nicht, dass ein Anbieter schon verbunden ist. Du beschreibst nur die gewünschte Operation; der Provider-Router entscheidet später über die echte Schnittstelle.",
      "Optional darfst du EINEN sinnvollen Verbesserungsvorschlag machen. Ändere den Nutzerwunsch niemals heimlich.",
      "Beispiel: Bei 'TikTok öffnen -> Helligkeit 100%' darfst du vorschlagen, dieselbe Regel auch auf weitere Social-Media-Apps auszuweiten. Sage dabei klar, dass der Nutzer das erst übernehmen muss.",
      "Antworte ausschließlich als JSON ohne Markdown im folgenden Format:",
      '{"kind":"automation|clarification|not_automation","confidence":0.0,"trigger":{"capabilityId":"...","parameters":{}},"actions":[{"capabilityId":"...","parameters":{}}],"clarificationQuestion":null,"suggestion":{"title":"...","message":"...","proposedGoal":"..."} }',
      "Bei clarification: trigger=null, actions=[], suggestion=null. Bei not_automation ebenso.",
      "Capability-Katalog:",
      compactCatalogue(),
      "Bekannte Connectoren (Status ist nur Routing-Metadaten, niemals als bereits verbunden annehmen):",
      compactProviderCatalogue(),
      `Nutzerwunsch: ${goal}`
    ].join("\n");

    const raw = await CanMyPhoneNative.askFoundationModel(prompt);
    return acceptSemanticAutomationOutput(goal, raw);
  } catch {
    return { kind: "unavailable" };
  }
}
