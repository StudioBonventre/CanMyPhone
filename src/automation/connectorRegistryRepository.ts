import { ProviderConnectorRegistry, validateConnectorManifest, type ConnectorLifecycle, type CommercialUseStatus, type ProviderConnectorManifest } from "./providerConnectorRegistry";
export type RegistryProviderRecord = {
  provider_key: string; display_name: string; status: ConnectorLifecycle; commercial_status: CommercialUseStatus; version: number;
  connector_manifests: Array<{ manifest: ProviderConnectorManifest; active: boolean }>;
};
export type RegistryStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const CACHE_KEY = "canmyphone.verified-connector-registry.v1";
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;
function validRecords(value: unknown): value is RegistryProviderRecord[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  const ids = new Set<string>();
  return value.every(row => {
    if (!row || typeof row !== "object" || typeof row.provider_key !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.provider_key) ||
      ids.has(row.provider_key) || typeof row.display_name !== "string" || !Number.isInteger(row.version) || row.version < 1 ||
      !["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED", "VALIDATING", "VERIFIED", "READY", "DEPRECATED", "BLOCKED"].includes(row.status) ||
      !["ALLOWED", "PARTNER_APPROVAL_REQUIRED", "PERSONAL_USE_ONLY", "UNKNOWN", "BLOCKED"].includes(row.commercial_status) || !Array.isArray(row.connector_manifests)) return false;
    ids.add(row.provider_key);
    return row.connector_manifests.length <= 1 && row.connector_manifests.every((entry: { manifest: unknown; active: unknown }) =>
      entry.active === true && validateConnectorManifest(entry.manifest) && entry.manifest.providerId === row.provider_key &&
      entry.manifest.lifecycle === "READY" && row.status === "READY" && row.commercial_status === "ALLOWED" && entry.manifest.commercialUseStatus === "ALLOWED");
  });
}
export class ConnectorRegistryRepository {
  private readonly versions = new Map<string, number>();
  private inFlight?: Promise<"server" | "offline">;
  private hydrated = false;
  private hydration?: Promise<void>;
  constructor(readonly registry: ProviderConnectorRegistry, private readonly storage: RegistryStorage,
    private readonly fetchRecords: () => Promise<unknown>, private readonly now: () => number = Date.now) {}
  serverVersion(providerId: string): number | undefined { return this.versions.get(providerId); }
  private apply(records: RegistryProviderRecord[], fresh: boolean, fetchedAt: number): void {
    for (const row of records) {
      if ((this.versions.get(row.provider_key) ?? 0) > row.version) continue;
      const old = this.registry.getProvider(row.provider_key);
      this.registry.setProviderExpiry(row.provider_key, fetchedAt + MAX_CACHE_AGE);
      const base = row.connector_manifests[0]?.manifest ?? old ?? new ProviderConnectorRegistry().discover(row.provider_key, row.display_name);
      const lifecycle = !fresh && row.status === "READY" ? "BLOCKED" : row.status;
      const manifest: ProviderConnectorManifest = { ...base, displayName: row.display_name, lifecycle, commercialUseStatus: row.commercial_status,
        connectorVersion: Math.max(base.connectorVersion, (old?.connectorVersion ?? 0) + 1) };
      try { this.registry.upsert(manifest); }
      catch {
        // Server READY is informational until this app release has a trusted adapter and full provenance.
        this.registry.upsert({ ...manifest, lifecycle: lifecycle === "READY" ? "VERIFIED" : "BLOCKED" });
      }
      this.versions.set(row.provider_key, row.version);
    }
  }
  async hydrate(): Promise<void> {
    if (this.hydration) return this.hydration;
    this.hydration = this.loadCache();
    return this.hydration;
  }
  private async loadCache(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const raw = await this.storage.getItem(CACHE_KEY);
      if (!raw || raw.length > 4_000_000) return;
      const cache = JSON.parse(raw) as { schemaVersion?: number; fetchedAt?: number; records?: unknown };
      if (cache.schemaVersion !== 1 || typeof cache.fetchedAt !== "number" || !validRecords(cache.records)) return;
      this.apply(cache.records, this.now() >= cache.fetchedAt && this.now() - cache.fetchedAt <= MAX_CACHE_AGE, cache.fetchedAt);
    } catch { /* A broken cache grants no execution permission. Built-in release remains available. */ }
  }
  async refresh(): Promise<"server" | "offline"> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = (async () => {
      await this.hydrate();
      try {
        const records = await this.fetchRecords();
        if (!validRecords(records)) throw new Error("INVALID_REGISTRY_SNAPSHOT");
        // Retain newer cached revocations when an older server snapshot is encountered.
        if (records.some(row => row.version < (this.versions.get(row.provider_key) ?? 0))) throw new Error("REGISTRY_ROLLBACK");
        if ([...this.versions.keys()].some(id => !records.some(row => row.provider_key === id))) throw new Error("INCOMPLETE_REGISTRY_SNAPSHOT");
        this.apply(records, true, this.now());
        await this.storage.setItem(CACHE_KEY, JSON.stringify({ schemaVersion: 1, fetchedAt: this.now(), records }));
        return "server" as const;
      } catch { return "offline" as const; }
    })();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }
}
