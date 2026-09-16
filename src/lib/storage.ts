import AsyncStorage from "@react-native-async-storage/async-storage";
import { GuideSession, NeedRadarProfile } from "../types";

const RADAR_KEY = "canmyphone.needRadar.v1";
const GUIDE_KEY = "canmyphone.guideSession.v1";

export async function loadNeedRadarProfile(): Promise<NeedRadarProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(RADAR_KEY);
    return raw ? JSON.parse(raw) as NeedRadarProfile : null;
  } catch {
    return null;
  }
}

export async function saveNeedRadarProfile(profile: NeedRadarProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(RADAR_KEY, JSON.stringify(profile));
  } catch {
    // Personalization persistence must never block normal Ask behavior.
  }
}

export async function clearNeedRadarProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RADAR_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function loadGuideSession(): Promise<GuideSession | null> {
  try {
    const raw = await AsyncStorage.getItem(GUIDE_KEY);
    return raw ? JSON.parse(raw) as GuideSession : null;
  } catch {
    return null;
  }
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
