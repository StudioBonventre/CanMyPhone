import { requireNativeModule } from "expo-modules-core";
import type { NativeModuleShape } from "./src/CanMyPhoneNative.types";

export type {
  BrightnessResult,
  FoundationModelStatus,
  HomeKitActionResult,
  HomeKitSnapshotResult,
  HomematicActionResult,
  LocationActionResult,
  LocationAuthorizationResult,
  NamedLocation,
  NativeModuleShape,
  PermissionKind,
  PermissionResult,
  PermissionStatus,
  ShortcutDescriptionHandoffResult,
  ShortcutsDestination,
  StoreEntitlementResult,
  StoreProductInfo,
  StorePurchaseResult,
  StorePurchaseStatus,
  TeslaNativeExecutionResult
} from "./src/CanMyPhoneNative.types";

function loadNativeModule(): NativeModuleShape | null {
  try {
    return requireNativeModule<NativeModuleShape>("CanMyPhoneNative");
  } catch {
    return null;
  }
}

export const CanMyPhoneNative = loadNativeModule();
