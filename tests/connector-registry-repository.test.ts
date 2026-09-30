import test from "node:test";
import assert from "node:assert/strict";
import { ConnectorRegistryRepository, type RegistryProviderRecord } from "../src/automation/connectorRegistryRepository";
import { ProviderConnectorRegistry } from "../src/automation/providerConnectorRegistry";
import { readyManifest } from "./helpers/connectorFixture";
function storage() { const map = new Map<string, string>(); return { map, getItem: async (key: string) => map.get(key) ?? null, setItem: async (key: string, value: string) => { map.set(key, value); } }; }
function records(): RegistryProviderRecord[] { return [{ provider_key: "example", display_name: "Example", status: "READY", commercial_status: "ALLOWED", version: 4, connector_manifests: [{ active: true, manifest: readyManifest() }] }]; }
const registry = () => new ProviderConnectorRegistry([], new Set(["example"]));

test("concurrent hydration waits for the same cached revocation before returning", async () => {
  const store = storage();
  const data: RegistryProviderRecord[] = [{ ...records()[0], version: 5, status: "BLOCKED", connector_manifests: [] }];
  await new ConnectorRegistryRepository(registry(), store, async () => data).refresh();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const instance = registry();
  const repository = new ConnectorRegistryRepository(instance, { ...store, getItem: async key => { await waiting; return store.getItem(key); } }, async () => []);
  let secondFinished = false;
  const first = repository.hydrate();
  const second = repository.hydrate().then(() => { secondFinished = true; });
  await Promise.resolve();
  assert.equal(secondFinished, false);
  release();
  await Promise.all([first, second]);
  assert.equal(instance.getProvider("example")?.lifecycle, "BLOCKED");
});

test("verified registry cache remains available offline while candidates never execute", async () => {
  const store = storage();
  const first = registry();
  const data: RegistryProviderRecord[] = [...records(), { provider_key: "candidate", display_name: "Candidate", status: "CANDIDATE", commercial_status: "UNKNOWN", version: 1, connector_manifests: [] }];
  assert.equal(await new ConnectorRegistryRepository(first, store, async () => data).refresh(), "server");
  const offline = registry();
  const repository = new ConnectorRegistryRepository(offline, store, async () => { throw new Error("offline"); });
  assert.equal(await repository.refresh(), "offline");
  assert.equal(offline.executable("example", "light.brightness.set"), true);
  assert.equal(offline.executable("candidate", "light.brightness.set"), false);
  assert.equal(offline.getProvider("candidate")?.lifecycle, "CANDIDATE");
});

test("revocation survives offline restart and rollback/missing-record snapshots", async () => {
  const store = storage(); const instance = registry(); let data = records();
  const repository = new ConnectorRegistryRepository(instance, store, async () => data);
  await repository.refresh();
  data = [{ ...data[0], version: 5, status: "BLOCKED", commercial_status: "BLOCKED", connector_manifests: [] }];
  await repository.refresh();
  assert.equal(instance.executable("example", "light.brightness.set"), false);
  data = records();
  assert.equal(await repository.refresh(), "offline");
  data = [];
  assert.equal(await repository.refresh(), "offline");
  const restarted = registry();
  await new ConnectorRegistryRepository(restarted, store, async () => { throw new Error("offline"); }).refresh();
  assert.equal(restarted.getProvider("example")?.lifecycle, "BLOCKED");
});

test("expired offline registry cannot grant execution and fresh server data restores it", async () => {
  const store = storage();
  await new ConnectorRegistryRepository(registry(), store, async () => records()).refresh();
  const [key, raw] = [...store.map][0];
  const cached = JSON.parse(raw); cached.fetchedAt = Date.now() - 25 * 60 * 60 * 1000; store.map.set(key, JSON.stringify(cached));
  const instance = registry(); const repository = new ConnectorRegistryRepository(instance, store, async () => records());
  await repository.hydrate(); assert.equal(instance.executable("example", "light.brightness.set"), false);
  assert.equal(await repository.refresh(), "server"); assert.equal(instance.executable("example", "light.brightness.set"), true);
});

test("server READY still requires a shipped adapter and schema/provenance verification", async () => {
  const instance = new ProviderConnectorRegistry();
  await new ConnectorRegistryRepository(instance, storage(), async () => records()).refresh();
  assert.equal(instance.getProvider("example")?.lifecycle, "VERIFIED");
  assert.equal(instance.listReadyProviders().length, 0);
  const bad = records();
  bad[0].connector_manifests[0].manifest = { ...readyManifest(), endpoint: "https://evil.example/command" } as never;
  const clean = registry();
  assert.equal(await new ConnectorRegistryRepository(clean, storage(), async () => bad).refresh(), "offline");
  assert.equal(clean.getProvider("example"), undefined);
});

test("concurrent refreshes share one request; automation runs do not fetch registry", async () => {
  let calls = 0; const instance = registry();
  const repository = new ConnectorRegistryRepository(instance, storage(), async () => { calls++; return records(); });
  await Promise.all([repository.refresh(), repository.refresh(), repository.refresh()]);
  assert.equal(calls, 1);
  for (let i = 0; i < 10; i++) assert.equal(instance.executable("example", "light.brightness.set"), true);
  assert.equal(calls, 1);
});
