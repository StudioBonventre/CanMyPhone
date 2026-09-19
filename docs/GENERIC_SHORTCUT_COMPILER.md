# Generic Shortcut Compiler B2

The compiler separates a scalable capability catalogue from natural-language matching. Its 39 capabilities cover Apple personal-automation triggers, system actions, media, navigation, communication, productivity, HomeKit, app handoffs, and Tesla as one third-party adapter.

Each capability declares role, provider, public-API status, execution modes, risk, Pro tier, background support, confirmation, permissions, integration, parameter schema, inputs, outputs, fallback, and availability. Model and deterministic output may reference only catalogue IDs.

The compiler produces a neutral `ShortcutDefinition`: trigger, conditions, ordered actions, variables, integrations, required setup, strategy, feasibility, and deterministically calculated confidence. Strategy order is direct API, App Intent, Shortcut, Personal Automation, third-party API, guided handoff, then unsupported.

Candidate selection sends only trigger metadata plus capabilities relevant to the current goal to the server prompt. Templates remain an inference-free fast path; ambiguous goals receive one concrete question.

## Current iOS boundary

Apple documents personal-automation triggers including time, arrive/leave, Bluetooth, NFC, app, battery, charger, and Focus. Many can run without asking after the user creates/configures the personal automation. Apple does not provide a general public API for a third-party app to silently create arbitrary personal automations. B2 therefore labels these plans as partial or one-time setup and never reports creation success. App Intents expose CanMyPhone actions to Shortcuts but do not grant control over private settings or arbitrary third-party actions.

## Materialization still required

B2 plans and validates; it does not reverse engineer Apple shortcut files. The next execution block needs a public App Intent/action library, supported parameter handoff into Shortcuts, setup-state tracking, and a guided final Apple-owned creation step wherever iOS requires it. Provider adapters must independently confirm their results.
