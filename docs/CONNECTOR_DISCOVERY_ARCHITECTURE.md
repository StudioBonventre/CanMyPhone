# Connector registry — Phase 2

## Implemented data flow

User goal → universal capability plan → shared ConnectorRegistry → discovered device capabilities → execution-path resolution → installation plan → guarded runtime.

The semantic interpreter, provider resolution, connector planning, installation planning and runtime query the same registry. The old PROVIDER_REGISTRY export is a compatibility snapshot only. Legacy Tesla graphs also check the registry at planning and execution. Built-ins and server records expose the same interface. Adapter implementations remain deliberately shipped, allow-listed code; manifests never supply executable code or arbitrary request endpoints.

The on-device Foundation Models planner receives available providers, lifecycle/commercial status and actual minimal device inventory. Household names, rooms and inventory are NOT added to the cloud planner request. Its existing connected-provider list is filtered by the registry; server output remains untrusted and is resolved/validated locally.

## Universal capabilities and compatibility

The portable universal-capabilities module is shared by the app and semantic Edge Function. It describes light, cover, climate, lock, sensor, vehicle, energy, charger, media and appliance operations. A vocabulary entry is not an execution permission: only operations present in an executable manifest and shipped adapter can run.

Existing smart-home and Tesla IDs normalize to universal operations at the boundary. Parameters, ranges, risks and confirmation rules remain enforced. The saved original definition and approval fingerprint are not rewritten in the native runner.

## Registry lifecycle, provenance and commercial gate

Discovery requests carry provider hints, requested capabilities, optional device hints, locale and region. Results carry identity, official documentation, candidate manifest, authentication/transport, events, commercial status, verification and blockers. The contract is implemented; an autonomous web-research agent is NOT implemented or running.

DISCOVERED → CANDIDATE → VALIDATING → VERIFIED → READY.

Discovery results can only register candidates. Promotion requires all eight verification gates, a shipped trusted adapter, ALLOWED commercial status and per-capability official provenance: source URL/type, provider-owned flag and retrieved/verified timestamps. Actions reference their sources; triggers/conditions require event schemas and source references. Unknown verification fields, schema extensions, arbitrary endpoints and risk downgrades are rejected. Other commercial states do not grant execution. Disabling a provider prevents subsequent executions, including legacy plans.

Built-in Apple Home, Tesla, Homematic IP and the Home Assistant action connector describe existing shipped implementations. Their exact local release snapshots are explicitly trusted, with empty external verification claims. This is NOT evidence of hardware testing or a legal certification. Remote replacements do not inherit this exception: they must pass the full dynamic gate.

## Device inventory and execution paths

Apple Home inventory derives capabilities from writable light/cover/climate characteristics and event-capable sensors. Older native builds lacking capability metadata produce no inferred device capabilities. Homematic inventory derives cover, switch/dimmer and heating-group support from HCU state. No brand name confers a capability.

A physical device may carry multiple provider paths. Resolution filters capability, lifecycle, commercial gate, online/credential state, connected provider, region and requested background/event support. It then scores explicit user preference, locality, reliability, background support, privacy and latency, with stable tie-breaking. Multiple physical targets remain ambiguous rather than being guessed. Results include provider-specific device ID, host, reason, confidence and alternative providers; alternatives are not blindly retried after a potentially non-idempotent command.

Connected HomeKit/HCU/Home Assistant inventory refreshes locally at startup, foreground return and connection. Home Assistant first attempts an authenticated one-shot WebSocket discovery of states, areas, devices and the display entity registry, then falls back to REST states if registry discovery is unavailable. No cross-ecosystem identity deduplication or persistent universal device inventory is claimed. If inventory is unavailable, existing adapters still perform their real target discovery and must report failure rather than invent success.

## Runtime and native boundary

ConnectorRuntime always has a registry, including default construction. It checks readiness, schema, actual inventory when available, approval and provider-confirmed result schema. The native runner receives an allow-listed registry projection with versions and expiry, persisted in the app group. It checks this before connector actions and translates universal operations to shipped native adapters. No URLs or credentials are present in that projection. Invalid or missing policy fails closed. Sensitive actions still require approval of the exact stored definition.

HomeKit installation supports a single light action with a HomeKit time or motion/contact trigger and no extra conditions. CanMyPhone installs this in Apple Home; the Home hub owns subsequent execution. This is not a general background callback into CanMyPhone, and cross-provider HomeKit event chains remain unavailable. Existing installed HomeKit automations are independently owned by the Home hub: registry revocation prevents new CanMyPhone dispatch/installation, but is not a remote kill switch for an already installed HomeKit automation.

## Autonomous triggers: actual limits

- Named-location enter/exit: Core Location monitoring and native runner are implemented, subject to Always authorization, valid saved coordinates, system delivery and background restrictions. Force-quit, permission changes or unavailable provider/network access can prevent execution. No exact-time guarantee.
- Time: exact arbitrary background execution on iOS is not available through a general timer. Current personal time triggers use Apple Shortcuts; the supported HomeKit daily-light installation runs in Apple Home instead.
- HomeKit motion/contact: the supported HomeKit-only light automation is installed in Apple Home without Personal Automation.
- Provider/connector events: event dispatcher/contracts exist, but no persistent authenticated external event subscription is installed by current direct connectors. Home Assistant WebSocket use is currently one-shot discovery only; it is deliberately not advertised as an always-on iOS background transport. These trigger plans are not presented as ready.
- Other iOS-only personal triggers (such as app-open, focus and charging): Apple Personal Automation remains the system-trigger fallback. Action-specific public API limitations still apply.

A new iOS development build is necessary for the changed bridge; JavaScript reload alone cannot install Swift changes.

## Supabase registry and offline repository

Migration: supabase/migrations/20260926210000_connector_registry.sql.

Tables: connector_providers (published metadata), connector_manifests (versioned JSONB capability schemas), connector_sources (official provenance), connector_verification_runs (append-only audit). Capabilities are embedded in immutable manifest versions, not duplicated into a separate table.

RLS is enabled everywhere. Authenticated clients may read provider metadata and published active READY/ALLOWED manifests; candidate manifests and verification audits remain private. Client writes are not granted. Trusted service processes must follow lifecycle/version/provenance checks and supply successful verification evidence. Registry tables contain no provider credentials. Credentials stay in Keychain or existing secure backend stores.

The app repository hydrates versioned AsyncStorage cache once, coalesces refreshes, checks snapshot consistency and monotonic provider versions, preserves revocations and rejects missing-record/rollback snapshots. Verified server data is usable offline for at most 24 hours; expired entries cannot authorize new executions. Revocation is learned at refresh, not instantaneously while offline. Built-in release snapshots are the initial offline baseline. Runs do not refetch the complete registry.

The native policy shares the same expiry and server version. JSON null expiry is removed before UserDefaults storage because null is not a property-list value. Concurrent consumers wait for the same cache hydration.

## Verification and remaining work

Implemented and locally tested: registry/core integration, multiple paths, discovery-only candidates, commercial/provenance gates, device mismatch, sensitive approval, legacy revocation, offline cache, and migration security. The migration is executed against embedded PostgreSQL (PGlite), with actual role/RLS/grant checks, not SQL-text assertions.

No Supabase project was returned by the available project connection. Therefore the migration has NOT been deployed remotely; remote Security Advisors, production RLS and Edge Function deployment are NOT verified. No iOS build or real HomeKit/Homematic/Tesla hardware/account execution was performed in this Windows task. Unit tests and Expo Doctor are not substitutes for those checks.

Home Assistant actions are now a shipped READY ecosystem adapter after OAuth: supported light, switch, cover, climate, lock and media actions can execute against discovered entity IDs. Home Assistant background sensor events remain disabled until a reliable authenticated background transport is implemented and verified. Matter, Google Home, SmartThings, openHAB and Tuya remain informational ECOSYSTEM candidates, not live adapters. Dynamic discovery does not auto-install arbitrary adapters.

Home Assistant OAuth additionally requires `EXPO_PUBLIC_HOME_ASSISTANT_CLIENT_ID` to be a public HTTPS application website. Because CanMyPhone uses the native callback `canmyphone://home-assistant`, that client website must publish `<link rel="redirect_uri" href="canmyphone://home-assistant">` within the HTML scanned by Home Assistant. The app fails closed when this client ID is absent.

Next: deploy the migration to the intended Supabase project, run Security Advisors, publish reviewed registry records, configure and verify the Home Assistant OAuth client website, then build iOS and validate one real Home Assistant command, one HomeKit sensor→light installation and one geofence→provider execution with the user's hardware. A reliable provider-event transport and the research/review service remain separate subsequent integrations.
