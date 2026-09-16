import { ConversationResult, DeviceContext, QueryIntent, QueryIntentKind, Solution } from "../types";
import { rankSolutions } from "./search";

const ENTITY_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "tesla", pattern: /\btesla\b/i },
  { name: "siri", pattern: /\b(siri|hey siri)\b/i },
  { name: "apple-intelligence", pattern: /\b(apple intelligence|siri ai|siri-ai|ki siri|siri ki)\b/i },
  { name: "bluetooth", pattern: /\bbluetooth\b/i },
  { name: "shortcuts", pattern: /\b(shortcuts?|kurzbefehl|kurzbefehle|automation)\b/i },
  { name: "car", pattern: /\b(auto|car|fahrzeug|wagen)\b/i }
];

function detectKind(query: string): QueryIntentKind {
  const q = query.toLowerCase();
  if (/\b(verfügbar|verfuegbar|available|geht.*(eu|europa)|funktioniert.*(eu|europa))\b/.test(q)) return "availability";
  if (/\b(wie (mach|mache|schalt|schalte|aktivier|aktiviere)|einschalten|anschalten|aktivieren|turn on|switch on|enable|activate)\b/.test(q)) return "enable";
  if (/\b(automatisch|automation|automatisieren|shortcut|shortcuts|kurzbefehl|kurzbefehle)\b/.test(q)) return "automation";
  if (/\b(siri|hey siri|sprachbefehl|voice command|per sprache)\b/.test(q)) return "voice-control";
  if (/\b(wie kann ich|wie mache ich|wie geht|how do i|how can i)\b/.test(q)) return "howto";
  return "general";
}

export function analyzeQuery(query: string): QueryIntent {
  const trimmed = query.trim();
  const entities = ENTITY_PATTERNS.filter((entry) => entry.pattern.test(trimmed)).map((entry) => entry.name);
  const kind = detectKind(trimmed);
  const wantsSiri = /\b(siri|hey siri|sprachbefehl|voice command)\b/i.test(trimmed);
  const wantsAppleIntelligence = /\b(apple intelligence|siri ai|siri-ai|ki siri|siri ki)\b/i.test(trimmed);
  const wantsEnable = kind === "enable" || /\b(an|ein|on|aktiv)\b/i.test(trimmed);
  const confidence = Math.min(1, 0.35 + entities.length * 0.18 + (kind !== "general" ? 0.25 : 0));

  return {
    raw: trimmed,
    kind,
    wantsSiri,
    wantsAppleIntelligence,
    wantsEnable,
    entities,
    confidence
  };
}

function isAvailable(solution: Solution, context: DeviceContext): boolean {
  const rule = solution.availability;
  if (!rule) return true;
  if (rule.regions && !rule.regions.includes(context.region)) return false;
  if (rule.excludedRegions?.includes(context.region)) return false;
  if (rule.minOsMajor && context.osMajor && context.osMajor < rule.minOsMajor) return false;
  if (rule.requiresAppleIntelligence && context.appleIntelligenceCapable === false) return false;
  return true;
}

function needsClarification(query: string, matches: Solution[], intent: QueryIntent): string | undefined {
  const compact = query.trim().toLowerCase();
  if (!compact) return undefined;

  const genericEnable = /^(wie\s+)?(mach|mache|schalt|schalte|aktivier|aktiviere).{0,10}(an|ein)[?.! ]*$/i.test(compact)
    || /^(how do i )?(turn|switch) (it )?on[?.! ]*$/i.test(compact);
  if (genericEnable && intent.entities.length === 0) return "Was genau möchtest du einschalten oder aktivieren?";

  if (!matches.length && compact.split(/\s+/).length <= 4 && /\b(wie|how|an|ein|aktivieren|siri)\b/i.test(compact)) {
    return "Was genau möchtest du auf deinem Smartphone machen oder steuern?";
  }
  return undefined;
}

export function resolveConversation(query: string, items: Solution[], context: DeviceContext): ConversationResult {
  const intent = analyzeQuery(query);
  const ranked = rankSolutions(query, items, context.platform, intent);
  const available = ranked.filter((solution) => isAvailable(solution, context));
  const followUp = needsClarification(query, available, intent);

  let notice: string | undefined;
  if (context.platform === "ios" && context.region === "eu" && intent.wantsAppleIntelligence) {
    notice = "Siri AI is not currently available on iPhone in the EU. CanMyPhone will prefer classic Siri, App Shortcuts and Shortcuts automations when they can solve the same task.";
  } else if (intent.wantsSiri) {
    const voiceMatch = available.find((solution) => solution.voice && solution.voice.route !== "none");
    if (voiceMatch?.voice?.route === "shortcut") {
      notice = "This works through Siri + Apple Shortcuts, so it does not require Siri AI.";
    }
  }

  return { intent, solutions: available, followUp, notice };
}
