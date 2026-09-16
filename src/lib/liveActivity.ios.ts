import { Platform } from "react-native";
import type { LiveActivity } from "expo-widgets";
import DropGuideActivity, { DropGuideActivityProps } from "../widgets/DropGuideLiveActivity";
import { GuideSession } from "../types";

let instance: LiveActivity<DropGuideActivityProps> | null = null;

function propsFor(session: GuideSession): DropGuideActivityProps {
  return {
    title: session.title,
    currentStep: session.currentStep + 1,
    totalSteps: session.steps.length,
    instruction: session.steps[session.currentStep] ?? "Weiter in Einstellungen",
    status: "guiding"
  };
}

async function recoverInstance(): Promise<LiveActivity<DropGuideActivityProps> | null> {
  if (instance) return instance;
  if (Platform.OS !== "ios") return null;
  try {
    const active = DropGuideActivity.getInstances();
    instance = active[0] ?? null;
    return instance;
  } catch {
    return null;
  }
}

export function liveActivityAvailable(): boolean {
  return Platform.OS === "ios";
}

export async function startGuideLiveActivity(session: GuideSession): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const existing = await recoverInstance();
    if (existing) {
      await existing.update(propsFor(session));
      return true;
    }
    instance = DropGuideActivity.start(propsFor(session), "canmyphone://guide");
    return true;
  } catch {
    instance = null;
    return false;
  }
}

export async function updateGuideLiveActivity(session: GuideSession): Promise<void> {
  const active = await recoverInstance();
  if (!active) return;
  try {
    await active.update(propsFor(session));
  } catch {
    // The in-app guide remains the source of truth if the system activity was dismissed.
  }
}

export async function endGuideLiveActivity(message = "Fertig"): Promise<void> {
  const active = await recoverInstance();
  if (!active) return;
  instance = null;
  try {
    await active.end(
      "immediate",
      {
        title: "CanMyPhone",
        currentStep: 1,
        totalSteps: 1,
        instruction: message,
        status: "done"
      },
      new Date()
    );
  } catch {
    // User/system may already have dismissed it.
  }
}
