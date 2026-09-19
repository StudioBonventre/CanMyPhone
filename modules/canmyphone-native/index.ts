import { requireNativeModule } from "expo-modules-core";
import type { NativeModuleShape } from "./src/CanMyPhoneNative.types";

export type {
  BrightnessResult,
  FoundationModelStatus,
  NativeModuleShape,
  PermissionKind,
  PermissionResult,
  PermissionStatus,
  ShortcutsDestination,
  StoreEntitlementResult,
  StoreProductInfo,
  StorePurchaseResult,
  StorePurchaseStatus
} from "./src/CanMyPhoneNative.types";

function loadNativeModule(): NativeModuleShape | null {
  try {
    return requireNativeModule<NativeModuleShape>("CanMyPhoneNative");
  } catch {
    return null;
  }
}

export const CanMyPhoneNative = loadNativeModule();
