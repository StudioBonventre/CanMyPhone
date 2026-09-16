import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let enabled = true;

export function setDropHapticsEnabled(value: boolean) {
  enabled = value;
}

export function getDropHapticsEnabled() {
  return enabled;
}

async function safe(run: () => Promise<void>) {
  if (!enabled || Platform.OS === "web") return;
  try {
    await run();
  } catch {
    // Haptics are enhancement-only. Never break the guide if the engine is unavailable.
  }
}

export async function hapticDive() {
  await safe(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    await new Promise((resolve) => setTimeout(resolve, 55));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  });
}

export async function hapticEmerge() {
  await safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
}

export async function hapticAnswer() {
  await safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export async function hapticStep() {
  await safe(() => Haptics.selectionAsync());
}
