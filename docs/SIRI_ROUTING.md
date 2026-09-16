# Siri routing

Siri is a major capability bridge for CanMyPhone. The engine separates three routes instead of treating “Siri” as one feature.

## 1. Siri direct

The action is a normal Siri/system capability.

Examples:
- enable and configure Siri
- built-in Siri requests

## 2. Siri + Shortcuts

An Apple Shortcut or App Shortcut performs the action and Siri launches it by name.

This route is strategically important because it works with classic Siri and therefore can still solve many tasks in regions where Siri AI is unavailable.

Example:

```text
“Wie kann ich meinen Tesla über Siri öffnen?”
            ↓
Tesla App Shortcut
            ↓
Apple Shortcut named “Tesla öffnen”
            ↓
“Siri, Tesla öffnen”
```

A third-party app must expose a compatible App Shortcut/action for the requested operation. CanMyPhone should verify that support and describe any authentication/network requirements.

## 3. Siri AI

Siri AI is treated as a separate capability layer with its own requirements:

- supported iPhone hardware
- supported OS
- supported language
- regional availability

As of the September 2026 reference set used for this prototype, Siri AI is not initially available on iPhone/iPad in the European Union. CanMyPhone therefore needs a fallback-first policy rather than simply returning “not available.”

## Routing rule

```text
Can classic Siri do it directly?
        ↓ no
Does the app expose a Shortcut/App Shortcut?
        ↓ no
Would Siri AI add the missing capability, and is it available here?
        ↓ no
Show the best non-Siri path or say the capability is not verified.
```

## Trust rule

Never claim Siri can control an external product just because its app is installed. The capability database needs a verified source for the Siri/App Shortcut bridge.
