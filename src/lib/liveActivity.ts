import { Platform } from "react-native";
import DropGuideActivity, { type DropGuideActivityProps } from "../widgets/DropGuideLiveActivity";
import type { GuideSession } from "../types";

function propsForSession(session: GuideSession, status: "guiding" | "done" = "guiding"): DropGuideActivityProps {
  const totalSteps = Math.max(1, session.steps.length);
  const stepIndex = Math.max(0, Math.min(totalSteps - 1, session.currentStep));
  return {
    title: session.title,
    currentStep: status === "done" ? totalSteps : stepIndex + 1,
    totalSteps,
    instruction: status === "done"
      ? "Einrichtung abgeschlossen"
      : session.steps[stepIndex] ?? "Weiter",
    status
  };
}

export function liveActivityAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  try {
    DropGuideActivity.getInstances();
    return true;
  } catch {
    return false;
  }
}

export async function startGuideLiveActivity(session: GuideSession): Promise<boolean> {
  if (!liveActivityAvailable()) return false;
  const props = propsForSession(session);

  try {
    const active = DropGuideActivity.getInstances();
    if (active.length) {
      await Promise.all(active.map((instance) => instance.update(props)));
      return true;
    }

    DropGuideActivity.start(props, "canmyphone://guide");
    return true;
  } catch {
    return false;
  }
}

export async function updateGuideLiveActivity(session: GuideSession): Promise<void> {
  if (!liveActivityAvailable()) return;
  try {
    const props = propsForSession(session);
    const active = DropGuideActivity.getInstances();
    await Promise.all(active.map((instance) => instance.update(props)));
  } catch {
    // Live Activity is enhancement-only. The locally persisted guide remains authoritative.
  }
}

export async function endGuideLiveActivity(_message = "Einrichtung abgeschlossen"): Promise<void> {
  if (!liveActivityAvailable()) return;
  try {
    const active = DropGuideActivity.getInstances();
    await Promise.all(active.map((instance) => instance.end("default")));
  } catch {
    // Ending the Live Activity must never block completing the guide in-app.
  }
}
