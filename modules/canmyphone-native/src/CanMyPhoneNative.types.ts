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

export type StorePeriod = { value: number; unit: "day" | "week" | "month" | "year" | "unknown" };

export type StoreProduct = {
  id: string;
  displayName: string;
  description: string;
  /** Localized price string from the App Store, e.g. „19,99 €“. Never format prices yourself. */
  displayPrice: string;
  price: number;
  period?: StorePeriod;
  introOffer?: {
    paymentMode: "freeTrial" | "payAsYouGo" | "payUpFront" | "unknown";
    displayPrice: string;
    period: StorePeriod;
    periodCount: number;
  };
};

export type StorePurchaseResult = {
  status: "purchased" | "cancelled" | "pending" | "unverified" | "notFound" | "unknown";
  activeProductIds: string[];
};

export type NativeModuleShape = {
  storeProducts(ids: string[]): Promise<StoreProduct[]>;
  storePurchase(id: string): Promise<StorePurchaseResult>;
  storeActiveProductIds(): Promise<string[]>;
  storeRestore(): Promise<string[]>;
  foundationModelStatus(): Promise<FoundationModelStatus>;
  askFoundationModel(prompt: string): Promise<string>;
  permissionStatus(kind: PermissionKind): Promise<PermissionResult>;
  requestPermission(kind: PermissionKind): Promise<PermissionResult>;
  openAppSettings(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
};
