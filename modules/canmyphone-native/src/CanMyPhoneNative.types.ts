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

export type ShortcutDescriptionHandoffResult = {
  opened: boolean;
  copied: boolean;
  message: string;
};

export type StoreProductInfo = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  type: string;
  subscriptionPeriodValue?: number;
  subscriptionPeriodUnit?: string;
};

export type StorePurchaseStatus = "purchased" | "pending" | "cancelled" | "failed";

export type StorePurchaseResult = {
  status: StorePurchaseStatus;
  productId: string;
  message: string;
};

export type StoreEntitlementResult = {
  pro: boolean;
  activeProductIds: string[];
};

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
  prepareShortcutDescription(description: string): Promise<ShortcutDescriptionHandoffResult>;
  syncAutomationDefinition(json: string): Promise<boolean>;
  deleteAutomationDefinition(automationId: string): Promise<void>;
  runStoredAutomation(automationId: string): Promise<Record<string, unknown>>;
  automationRunnerSnapshots(): Promise<string>;
  storeProducts(productIds: string[]): Promise<StoreProductInfo[]>;
  purchaseProduct(productId: string): Promise<StorePurchaseResult>;
  currentStoreEntitlements(productIds: string[]): Promise<StoreEntitlementResult>;
  restorePurchases(productIds: string[]): Promise<StoreEntitlementResult>;
};
