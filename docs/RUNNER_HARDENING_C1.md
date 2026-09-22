# C.1 Native Runner Verification

## EAS project and build

CanMyPhone is linked to the existing Expo project `@studiobonventre/canmyphone` with project ID `be352517-4c42-444d-830e-e68dd8f5bacd`. The configured bundle identifiers and App Group remain unchanged:

- `com.studiobonventre.canmyphone`
- `com.studiobonventre.canmyphone.widgets`
- `group.com.studiobonventre.canmyphone`

The successful iOS development build is tracked in EAS as `c1ae28f2-2f59-4478-80d7-7ef48be67f94`. Its IPA contains the compiled native module, signed App Group entitlement, and App Intents metadata.

## App Intents verification

The final IPA contains these discoverable intents:

- `OpenCanMyPhoneIntent`
- `SetCanMyPhoneBrightnessIntent`
- `RunCanMyPhoneAutomationIntent` with the `automationId` parameter
- `OpenCanMyPhoneAutomationIntent`

`CanMyPhoneAppShortcuts` is included in the host binary with shortcuts for opening CanMyPhone, setting brightness, and running an automation. The package discovery bridge is available on iOS 17+, while the individual intents retain their iOS 16 availability.

## Runner safety contract

Stored automations use schema version 2 and carry a `safetyApproval` record. Sensitive execution requires an approval fingerprint derived from the exact automation ID, schema version, risk level, integrations, conditions, actions, capability IDs, and parameters. Any safety-relevant edit invalidates the previous approval. Native execution revalidates the definition, parameters, entitlement, disabled/deleted state, and fingerprint before running.

The native runner writes only execution state to the App Group store: `lastRunAt`, `lastRunStatus`, `lastErrorCode`, and `executionCount`. No tokens, VINs, coordinates, or secrets are mirrored.

## Free/Pro decision

Direct display brightness is intentionally free because it is a single-step public iOS action. Pro remains required for advanced integrations and multi-step/third-party automation paths. Native StoreKit entitlements are checked per run, including restore and expiry transitions; a stale local flag cannot keep a Pro automation executable.

## Device test matrix

The IPA is provisioned for the registered development iPhone. The following still require a physical-device pass in Shortcuts: discoverability, `automationId` parameter presentation, valid brightness execution, disabled/deleted/invalid definitions, entitlement blocking, approval mismatch, and approval success followed by provider execution. Build-time metadata confirms registration but cannot replace those interaction tests.
