import type { SettingsGuide, Source } from "../types";

/** iPhone User Guide topic (German edition, always the current iOS version). */
export function guide(topicId: string, label: string): Source {
  return { label: `Apple Support — ${label}`, url: `https://support.apple.com/de-de/guide/iphone/${topicId}/ios` };
}

/** Apple Support knowledge-base article. */
export function article(articleId: string, label: string): Source {
  return { label: `Apple Support — ${label}`, url: `https://support.apple.com/de-de/${articleId}` };
}

/** A system Settings path the user follows manually (iOS offers no public deep link). */
export function settingsPath(...path: string[]): SettingsGuide {
  return { path: ["Einstellungen", ...path], openMode: "manual-system" };
}
