# Architecture

## v0.1

```text
User query
   ↓
Conversation Engine
   ├─ intent detection
   ├─ entity detection
   ├─ one-question clarification policy
   └─ Siri route detection
   ↓
Device context (platform / OS / region / AI capability)
   ↓
Verified capability dataset
   ↓
Availability filter + ranker
   ↓
Mobile UI
   ↓
Explicit feedback / opens / questions
   ↓
Local Need Radar preference profile
```

No backend is required for the first prototype. Need Radar v0.1 is an in-memory/local-first preference model; production persistence should remain on-device by default.

## Voice capability layer

CanMyPhone stores Siri as structured capability metadata rather than a generic “voice supported” flag:

- `siri-direct`
- `shortcut`
- `siri-ai`
- `none`

This lets the resolver answer differently when Siri AI is unavailable but classic Siri + Shortcuts still solve the problem.

See `SIRI_ROUTING.md`.

## Need Radar data flow

```text
problem / discovery answer / solution open / feedback
                 ↓
          signal normalizer
                 ↓
       compact preference weights
                 ↓
   suppress known/dismissed solutions
                 ↓
       proactive recommendation ranker
```

The preference layer stores compact intent signals instead of a detailed surveillance-style activity history.

## v0.2

Add a remote signed dataset so capability fixes can ship without waiting for an app-store release.

## v0.3

Add an optional semantic resolver:

```text
query → semantic intent extraction → deterministic filters → semantic ranker → verified records only
```

The model may understand language, but it must select from verified records rather than inventing setup steps.

## v1

Optional services:
- anonymous aggregate query analytics
- account sync
- personalized device profile
- optional Need Radar profile sync
- contribution workflow
- affiliate metadata kept separate from organic ranking

## Privacy

Prefer processing on device. A search query should not require contacts, photos, location history, app-usage history or broad system access.
