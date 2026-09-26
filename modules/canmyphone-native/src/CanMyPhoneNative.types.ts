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

export type HomeKitSnapshotResult = {
  authorized: boolean;
  determined: boolean;
  restricted: boolean;
  homes: Array<{
    id: string;
    name: string;
    primary: boolean;
    rooms: Array<{
      id: string;
      name: string;
      accessories: Array<{
        id: string;
        name: string;
        reachable: boolean;
        characteristics: string[];
      }>;
    }>;
  }>;
  message: string;
};

export type HomeKitActionResult = {
  success: boolean;
  code?: string;
  changed?: number;
  matched?: number;
  message: string;
};

export type TeslaNativeExecutionResult = {
  success: boolean;
  code?: string;
  message: string;
};

export type HomematicActionResult = {
  success: boolean;
  code?: string;
  host?: string;
  clientId?: string;
  state?: Record<string, unknown>;
  message: string;
};

export type LocationAuthorizationResult = {
  status: "always" | "whenInUse" | "denied" | "restricted" | "notDetermined" | "unknown";
  always: boolean;
  whenInUse: boolean;
  servicesEnabled: boolean;
};

export type NamedLocation = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  updatedAt: string;
};

export type LocationActionResult = {
  success: boolean;
  code?: string;
  name?: string;
  radius?: number;
  active?: number;
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
  homeKitSnapshot(): Promise<HomeKitSnapshotResult>;
  homeKitSetCover(room: string, device: string | null, position: number): Promise<HomeKitActionResult>;
  homeKitSetLight(room: string, device: string | null, value: string): Promise<HomeKitActionResult>;
  homeKitSetClimate(room: string, device: string | null, value: string): Promise<HomeKitActionResult>;
  homematicPair(lastFourSgtin: string, activationKey: string): Promise<HomematicActionResult>;
  homematicSnapshot(): Promise<HomematicActionResult>;
  homematicExecute(path: string, bodyJson: string): Promise<HomematicActionResult>;
  homematicDisconnect(): Promise<HomematicActionResult>;
  configureTeslaExecutionGrant(endpoint: string, token: string): Promise<TeslaNativeExecutionResult>;
  clearTeslaExecutionGrant(): Promise<TeslaNativeExecutionResult>;
  locationAuthorizationStatus(): Promise<LocationAuthorizationResult>;
  requestLocationAutomationPermission(): Promise<LocationAuthorizationResult>;
  saveCurrentLocationAs(name: string, radius: number): Promise<LocationActionResult>;
  namedLocationsSnapshot(): Promise<NamedLocation[]>;
  syncLocationAutomations(): Promise<LocationActionResult>;
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
