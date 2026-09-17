import { requireNativeModule } from "expo-modules-core";
import type { NativeModuleShape } from "./src/CanMyPhoneNative.types";

export type {
  FoundationModelStatus,
  NativeModuleShape,
  PermissionKind,
  PermissionResult,
  PermissionStatus
} from "./src/CanMyPhoneNative.types";

function loadNativeModule(): NativeModuleShape | null {
  try {
    return requireNativeModule<NativeModuleShape>("CanMyPhoneNative");
  } catch {
    return null;
  }
}

export const CanMyPhoneNative = loadNativeModule();
