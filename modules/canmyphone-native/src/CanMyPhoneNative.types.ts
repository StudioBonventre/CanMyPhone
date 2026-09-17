export type FoundationModelStatus = {
  available: boolean;
  reason: string;
};

export type PermissionKind = "notifications" | "camera" | "microphone" | "photos";

export type PermissionStatus = "granted" | "denied" | "notDetermined" | "restricted" | "unsupported";

export type PermissionResult = {
  granted: boolean;
  status: PermissionStatus;
  canOpenSettings: boolean;
  message: string;
};

export type BrightnessResult = {
  success: boolean;
  requested: number;
  applied: number;
  message: string;
};

export type ShortcutsDestination = "app" | "create";

export type NativeModuleShape = {
  foundationModelStatus(): Promise<FoundationModelStatus>;
  askFoundationModel(prompt: string): Promise<string>;
  permissionStatus(kind: PermissionKind): Promise<PermissionResult>;
  requestPermission(kind: PermissionKind): Promise<PermissionResult>;
  setBrightness(level: number): Promise<BrightnessResult>;
  setPremiumEntitlement(enabled: boolean): Promise<void>;
  openAppSettings(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
  openShortcuts(destination: ShortcutsDestination): Promise<boolean>;
};
