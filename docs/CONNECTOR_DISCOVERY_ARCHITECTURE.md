# Connector discovery architecture (foundation)

## Honest current status

The new `ProviderConnectorRegistry` accepts versioned declarative manifests for ecosystem, direct, and dynamic connectors. It does **not** fetch or interpret manufacturer documentation and does **not** create adapters. Existing Tesla and Homematic IP adapters remain the only provider adapters exercised by the TypeScript connector runtime; Apple Home uses its separate native HomeKit installation path. Matter, Google Home, SmartThings, Home Assistant, openHAB, Tuya and the broad manufacturer seed list are *discovery priorities*, not operational integrations. No brand in a seed catalogue implies device support.

The existing `PROVIDER_REGISTRY` is still a compatibility catalogue for the current planner. Migration of that planner and the native HomeKit path to the manifest registry is required before this is a single unified connector engine. Until then, callers of `ConnectorRuntime` must supply the registry to enforce its manifest gate; existing call sites without a registry retain the legacy adapter behaviour. This is a transitional boundary, not a claim that every execution path has been migrated.

## Unknown manufacturer to READY

1. An unknown provider is registered as `CANDIDATE_LEGAL_REVIEW_REQUIRED`, with no operations, endpoint or execution permission. Repeated discovery reuses its record.
2. A server-side discovery agent must retrieve current *official* developer docs, OpenAPI, SDK, official GitHub or platform manifest. Community material may be a lead only. Store source URL, kind and verification timestamp in `documentationSources`. An AI confidence number is informational, never a gate.
3. A reviewer records transport, authentication, device types, universal capabilities, parameter/result/event schemas, domain allowlist, rate limits, regions, background limits, risk and confirmation requirements, terms/commercial status, API and connector versions. `UNKNOWN`, `PERSONAL_USE_ONLY`, `PARTNER_APPROVAL_REQUIRED` or `BLOCKED` terms cannot become READY.
4. A *trusted, tested* adapter must be shipped and all eight verification gates completed. Only then can a new manifest version be promoted to READY. Version numbers must increase. Deprecation/blocking requires a newer version.
5. The deterministic runtime checks manifest lifecycle, operation and input schema before calling a registered adapter. High-risk/confirmation-required operations also need a caller-supplied trusted approval verifier and fail closed without one. The manifest cannot contain executable code or a request URL. Network hosts must be constrained inside each adapter as well; the current runtime does not itself make HTTP requests or prove adapter host enforcement.

This is intentionally not an AI-to-HTTP pipeline. No AI-generated JavaScript, Swift or URL is executed.

## Capability discovery and routing

Device inventory must be obtained from the connected provider, including a stable device identifier and the *observed* operations. `resolveDeviceCapability` filters to observed operations and executable manifests, asks when multiple devices remain, and prefers an available ecosystem route (Apple Home, Matter, Google Home, SmartThings, Home Assistant, openHAB, Tuya) over a direct route for the same device. It cannot infer RGB from a Hue brand or charging-current control from a wallbox brand. The current product has no universal persisted inventory or discovery refresh yet; this resolver is a foundation, not live multi-ecosystem routing.

Universal identifiers may include `light.power.set`, `light.brightness.set`, `light.color.set`, `cover.open`, `climate.temperature.set`, `lock.unlock`, `appliance.finished`, `charger.current.set`, `calendar.event.create` and many future operations. The manifest's operation list is data, not a closed TypeScript manufacturer switch. Sensitive operations must still pass the existing automation approval and safety fingerprint checks; a connector manifest does not replace those checks.

## Server registry boundary (not deployed)

A production registry needs server-owned immutable manifest versions and provenance records, private candidate/verification writes, and an authenticated read projection of READY manifests. It must validate manifests server-side and never grant client writes to lifecycle, verification or commercial fields. It also needs official-domain source retrieval with SSRF protection, an approval workflow and adapter release binding. Supabase RLS and grants need explicit allow/deny tests. This repository cannot currently run the Supabase CLI or a local database here, so no migration or server discovery agent is claimed as complete.

Hundreds of brands can be indexed as candidates and mapped to the same ecosystem adapter and universal operations. Their presence in the catalogue is not proof of API access, commercial permission or runtime support. New direct adapters are justified only for capabilities not available through connected ecosystems.

`DISCOVERY_SEEDS` supplies broad search hints across home, media, vehicles, energy, appliances, productivity and health. Unknown IDs outside these hints are accepted as candidates. `discoverConnectorPath` first checks a reusable READY connector, then connected ecosystem devices; otherwise it queues research beginning with an official local API. It does not fetch documents or infer that such an API exists.
