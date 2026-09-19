# Block C — Runner and shortcut materialization

## Trust boundary

The planner and compiler only produce a `ShortcutDefinition`. They never invoke native code. A definition is schema- and capability-validated before it becomes a versioned `StoredAutomation`, again before it is mirrored to the App Group, and once more when the runner loads it. Unknown schema versions, capabilities, parameters, arbitrary selectors and arbitrary URLs are rejected.

The native runner currently executes only `system.brightness.set` through `UIScreen.brightness`. Apple-owned actions such as Focus, Low Power Mode and Apple Music remain visible Shortcuts actions. Provider actions remain blocked until their integration exists. A handoff is never recorded as successful execution.

## Storage and lifecycle

The React Native source of truth is AsyncStorage key `canmyphone.automations.v1`. The minimal nonsensitive runner record is mirrored to App Group `group.com.studiobonventre.canmyphone` with schema version 1. No token, exact location, contact, VIN or provider secret belongs in this store.

When the user opens Shortcuts, CanMyPhone stores only the pending automation ID and handoff time. On return it changes the setup state to `AWAITING_CONFIRMATION` and asks the user whether the Apple-owned setup was completed. It does not inspect or infer the private Shortcuts database.

## Public Apple handoff

CanMyPhone uses the documented `shortcuts://create-shortcut` URL only. Apple exposes an editor but no public URL that installs or preconfigures a personal automation trigger, its parameters, or a multi-action workflow. The installation assistant therefore displays the exact trigger, App Intent name, stable automation ID, and any Apple Shortcuts actions that must be added.

`RunCanMyPhoneAutomationIntent` exposes “CanMyPhone Automation ausführen” to Shortcuts with an `automationId` parameter. `OpenCanMyPhoneAutomationIntent` can bring the app forward for a selected ID. The runner returns one of the structured execution statuses and reports success only after every direct action confirms success.

## Action classification

- `EXECUTABLE_DIRECT`: currently display brightness.
- `EXECUTABLE_APP_INTENT`: reserved for app-owned, allow-listed intent actions.
- `REQUIRES_SHORTCUT_ACTION`: Apple-owned actions added in the Shortcuts editor.
- `REQUIRES_APPLE_AUTOMATION`: Apple personal triggers such as Bluetooth, app opened, battery, time, location, charger, NFC and Focus.
- `REQUIRES_PROVIDER`: authenticated third-party integration required.
- `GUIDED_ONLY`: public guided setup without deterministic execution.
- `UNSUPPORTED`: rejected; never approximated.

Multi-step execution is ordered. `STOP` is the safety default and mandatory for high-risk work. `BEST_EFFORT` may be used only for low-risk UX actions; results remain partial unless every required step succeeds.

## Device verification

After installing the development build on an iPhone:

1. Open Shortcuts and verify the CanMyPhone actions include “Automation ausführen”, “CanMyPhone öffnen” and “Helligkeit setzen”.
2. Create a personal automation, add “CanMyPhone Automation ausführen”, and paste the ID shown by CanMyPhone.
3. Run a stored brightness automation and verify the reported value matches the screen.
4. Test an Apple-owned action setup and confirm CanMyPhone never reports the handoff itself as execution success.
5. Disable or delete the automation in “Meine Automationen” and verify the runner refuses or no longer finds it.

## Privacy and analytics

Materialization, handoff, confirmation, enable/disable and run outcomes use the analytics boundary. Raw goals, prompt text, exact coordinates, contacts, tokens, VINs and Apple metadata are excluded.
