import type { Top100Setting } from "../data/top100Settings";

export type Top100CapabilityLevel = "direct" | "shortcut" | "confirm";

export type Top100Capability = {
  level: Top100CapabilityLevel;
  label: string;
  shortLabel: string;
  detail: string;
};

// Keep this intentionally conservative: only advertise automation when CanMyPhone
// has a public iOS API or a documented Apple Shortcuts/App Intent route.
const DIRECT_IDS = new Set([
  "ios-set-brightness"
]);

const SHORTCUT_IDS = new Set([
  "ios-back-tap",
  "top-setting-dark-mode",
  "top-setting-low-power",
  "top-setting-dnd",
  "top-setting-driving-focus",
  "top-setting-work-focus",
  "top-setting-focus-schedule",
  "top-setting-wifi",
  "ios-enable-bluetooth",
  "top-setting-airplane-mode"
]);

const CAPABILITIES: Record<Top100CapabilityLevel, Top100Capability> = {
  direct: {
    level: "direct",
    label: "CanMyPhone erledigt es",
    shortLabel: "Direkt",
    detail: "Direkte öffentliche iOS-Aktion"
  },
  shortcut: {
    level: "shortcut",
    label: "CanMyPhone automatisiert es",
    shortLabel: "Automatisiert",
    detail: "Über Apple Kurzbefehle oder App Intent"
  },
  confirm: {
    level: "confirm",
    label: "Deine Bestätigung in iOS nötig",
    shortLabel: "Bestätigung",
    detail: "Apple schützt diesen Systemschritt"
  }
};

export function top100CapabilityFor(setting: Top100Setting): Top100Capability {
  if (DIRECT_IDS.has(setting.solutionId)) return CAPABILITIES.direct;
  if (SHORTCUT_IDS.has(setting.solutionId)) return CAPABILITIES.shortcut;
  return CAPABILITIES.confirm;
}

export function top100CapabilityCounts(settings: Top100Setting[]) {
  return settings.reduce(
    (counts, setting) => {
      counts[top100CapabilityFor(setting).level] += 1;
      return counts;
    },
    { direct: 0, shortcut: 0, confirm: 0 } as Record<Top100CapabilityLevel, number>
  );
}
