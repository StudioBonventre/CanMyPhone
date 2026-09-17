import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFERENCES_KEY = "canmyphone.preferences.v1";

export type UserPreferences = {
  beginnerMode: boolean;
  useOnDeviceAI: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  beginnerMode: false,
  useOnDeviceAI: true
};

export async function loadUserPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultUserPreferences;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      beginnerMode: parsed.beginnerMode ?? defaultUserPreferences.beginnerMode,
      useOnDeviceAI: parsed.useOnDeviceAI ?? defaultUserPreferences.useOnDeviceAI
    };
  } catch {
    return defaultUserPreferences;
  }
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are convenience state. Core Ask behavior must keep working if persistence fails.
  }
}
