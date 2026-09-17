import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EntitlementState, GuideSession, NeedRadarProfile } from "../types";

const RADAR_KEY = "canmyphone.needRadar.v1";
const GUIDE_KEY = "canmyphone.guideSession.v1";
const ENTITLEMENTS_KEY = "canmyphone.entitlements.v1";

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence must never block the product's core Ask flow.
  }
}

export function loadNeedRadarProfile(): Promise<NeedRadarProfile | null> {
  return readJson<NeedRadarProfile>(RADAR_KEY);
}

export function saveNeedRadarProfile(profile: NeedRadarProfile): Promise<void> {
  return writeJson(RADAR_KEY, profile);
}

export async function clearNeedRadarProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RADAR_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function loadGuideSession(): Promise<GuideSession | null> {
  return readJson<GuideSession>(GUIDE_KEY);
}

export async function saveGuideSession(session: GuideSession | null): Promise<void> {
  try {
    if (!session) {
      await AsyncStorage.removeItem(GUIDE_KEY);
      return;
    }
    await AsyncStorage.setItem(GUIDE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory guide continues even if persistence fails.
  }
}

export function loadEntitlementState(): Promise<EntitlementState | null> {
  return readJson<EntitlementState>(ENTITLEMENTS_KEY);
}

export function saveEntitlementState(state: EntitlementState): Promise<void> {
  return writeJson(ENTITLEMENTS_KEY, state);
}
