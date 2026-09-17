import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import type { Solution } from "../types";

export type AIResolution = {
  solutionId: string | null;
  used: boolean;
  available: boolean;
  reason: string;
};

function parseSolutionId(raw: string, allowed: Set<string>): string | null {
  const cleaned = raw.trim().replace(/["'`]/g, "");
  if (allowed.has(cleaned)) return cleaned;

  const token = cleaned.split(/\s+/).find((part) => allowed.has(part));
  return token ?? null;
}

/**
 * Optional on-device semantic fallback.
 * The model is never allowed to invent setup instructions. It can only select one
 * ID from the verified capability catalogue that CanMyPhone already ships with.
 */
export async function resolveWithOnDeviceAI(
  query: string,
  candidates: Solution[]
): Promise<AIResolution> {
  if (!CanMyPhoneNative || !query.trim() || !candidates.length) {
    return { solutionId: null, used: false, available: false, reason: "native-model-unavailable" };
  }

  try {
    const status = await CanMyPhoneNative.foundationModelStatus();
    if (!status.available) {
      return { solutionId: null, used: false, available: false, reason: status.reason };
    }

    const compactCatalogue = candidates
      .slice(0, 36)
      .map((item) => `${item.id} | ${item.title} | ${item.summary} | ${item.aliases.slice(0, 6).join(", ")}`)
      .join("\n");

    const prompt = [
      "Ordne die Nutzerfrage genau einer verifizierten CanMyPhone-Lösung zu, falls eine wirklich passt.",
      "Antworte ausschließlich mit der exakten ID aus dem Katalog oder mit NONE.",
      "Erfinde keine Funktion, keinen Menüpfad und keine neue ID.",
      `Nutzerfrage: ${query}`,
      "Verifizierter Katalog:",
      compactCatalogue
    ].join("\n");

    const response = await CanMyPhoneNative.askFoundationModel(prompt);
    const allowed = new Set(candidates.map((item) => item.id));
    const solutionId = parseSolutionId(response, allowed);

    return {
      solutionId,
      used: true,
      available: true,
      reason: solutionId ? "verified-catalogue-match" : "no-verified-match"
    };
  } catch {
    return { solutionId: null, used: false, available: false, reason: "native-model-error" };
  }
}
