# Conversation Engine

CanMyPhone is problem-first. Users should not need to know the product name of a setting or feature.

## Supported request shapes in the pre-alpha

The resolver currently detects these high-level intents:

- `enable` — “Wie mach ich Siri an?” / “Turn on Bluetooth”
- `howto` — “Wie kann ich Text aus einem Foto kopieren?”
- `voice-control` — “Wie kann ich meinen Tesla über Siri öffnen?”
- `automation` — “Mach das automatisch, wenn ich die Arbeit verlasse.”
- `availability` — “Geht Siri AI in Europa?”
- `general` — fallback for normal problem descriptions

## Resolver pipeline

```text
natural-language query
        ↓
intent + entity extraction
        ↓
device / OS / region context
        ↓
verified capability ranking
        ↓
availability filter
        ↓
Siri route selection
        ↓
answer or one targeted follow-up
```

The current implementation is deterministic and bilingual DE/EN-first. Later versions can add a semantic model, but the semantic layer must only choose among verified records. It must never invent a settings path, Siri action or app capability.

## Clarification policy

Ask at most one question when the missing detail materially changes the answer.

Good:

> User: “Wie mach ich das an?”
>
> CanMyPhone: “Was genau möchtest du einschalten oder aktivieren?”

Do not ask when the entity is already clear:

> User: “Wie mach ich Siri an?”
>
> Answer directly.

## Region-aware answers

Availability belongs in the capability record, not in prose hidden inside the UI. The same user query may resolve differently depending on region, OS version, hardware and language.

Example: in the EU, a Siri-AI request should explain the current limitation and route the user to classic Siri + Shortcuts when those can accomplish the goal.
