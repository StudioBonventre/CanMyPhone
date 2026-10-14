# CanMyPhone

> **Was kann mein iPhone für mich automatisieren – und wie bekomme ich das hin?**
>
> Describe what should happen ("Wenn ich heimkomme, Licht an"). CanMyPhone finds a tested automation recipe,
> shows it as a simple *Wenn → Dann* card and walks you through Kurzbefehle one step at a time.

CanMyPhone is an open-source, device-aware capability engine for smartphones. It is **not a catalog of random tips**. It starts with the user's real problem, asks a short follow-up when necessary, and finds the simplest relevant solution — preferably a capability already built into the phone.

## Why this exists

Modern phones already contain hundreds of useful features, automations and accessibility tools, but people often do not know the feature name, where it lives, or that it exists at all.

Typical questions are not technical:

- "Wie mach ich Siri an?"
- "Wie kann ich meinen Tesla vom iPhone aus über Siri öffnen?"
- "I always forget where I parked."
- "I do the same thing every time I leave work."
- "I keep typing text from paper into my phone."

CanMyPhone translates that **human problem** into a verified device capability.

## The interaction model

```text
problem
  ↓
clarify only if needed
  ↓
understand device + context
  ↓
recommend the best solution
  ↓
guide the setup
  ↓
Did it work?
  ↓
learn explicit preferences
```

There are two direct interaction modes plus an opt-in personalization layer:

1. **Ask** — describe a problem right now.
2. **Discover for me** — answer a few friction-focused questions and receive a small set of genuinely relevant capabilities instead of generic tips.
3. **Need Radar** — quietly learns from questions, opened solutions and explicit feedback, then surfaces a few proactive recommendations. It can be paused or cleared at any time.

See [`docs/DIFFERENTIATION.md`](docs/DIFFERENTIATION.md), [`docs/NEED_RADAR.md`](docs/NEED_RADAR.md), [`docs/CONVERSATION_ENGINE.md`](docs/CONVERSATION_ENGINE.md), and [`docs/SIRI_ROUTING.md`](docs/SIRI_ROUTING.md).

## Ranking principle

1. **Built in first** — use a native phone feature when possible.
2. **Automation second** — use Shortcuts / routines when that solves the problem.
3. **Free existing tool third** — recommend a trustworthy app or website only when necessary.
4. **Paid option last** — only when it meaningfully improves the result.

## Example

User asks:

> "I always forget where I parked my car."

CanMyPhone answers:

- **Best solution:** Apple Maps can already remember the parked-car location.
- **Why this fits:** it solves the stated problem without installing another app.
- **Cost:** Free / built in.
- **Setup:** Settings → Apps → Maps → Show Parked Location.
- **Requirements:** Location Services and a Bluetooth/CarPlay connection to the car.
- **Source:** Apple Support.

## MVP

The first release intentionally stays small:

- conversational problem input, including natural “Wie mach ich … an?” requests
- deterministic intent/entity extraction with one-question clarification
- iOS / Android awareness plus device/OS/region context
- Siri direct vs Siri + Shortcuts vs Siri AI routing
- EU-aware Siri AI fallback behavior
- curated, source-backed capability database
- one recommended solution plus alternatives
- clear setup steps
- compatibility notes
- "Worked / Didn't work / Already knew this / Not relevant" feedback
- Discover mode for personalized suggestions
- Need Radar preference learning from in-app interactions
- proactive "Picked for you" suggestions
- visible Need Radar On/Off and Clear controls
- no account required for the basic experience

The MVP does **not** automatically change system settings and does not need broad device permissions.


## Drop Experience

CanMyPhone now has a visual assistant called **Drop**. On supported iPhones it renders with the native iOS Liquid Glass effect and falls back gracefully on older/unsupported devices.

When a user starts a setup guide:

1. Drop gives a small haptic cue.
2. The current setup step is saved locally.
3. An iOS Live Activity starts for the Lock Screen / Dynamic Island.
4. The user can switch to Settings without losing the current step.
5. Returning to CanMyPhone resumes the guide and Drop reappears with a soft haptic.

CanMyPhone intentionally avoids private iOS settings URL schemes. Where Apple does not offer a public deep link to a system page, the guide keeps the exact Settings breadcrumb visible instead.

See [`docs/DROP_EXPERIENCE.md`](docs/DROP_EXPERIENCE.md) and [`docs/LIVE_ACTIVITY.md`](docs/LIVE_ACTIVITY.md).

## Tech stack

- React Native + Expo SDK 57
- Expo Widgets for Live Activities / Dynamic Island
- Expo GlassEffect + Blur fallback for Drop
- Expo Haptics
- AsyncStorage for local guide / Need Radar persistence
- TypeScript
- local JSON/TypeScript knowledge base for v0.1
- local deterministic matching for v0.1
- semantic/AI resolver later for intent understanding and clarification
- backend optional until we need remote dataset updates, opt-in profiles or anonymous aggregate search analytics

Stable target when this starter was created: **Expo SDK 57 / React Native 0.86**.

## Run locally

```bash
npm install
npx expo start
```

## Repository layout

```text
CanMyPhone/
├── App.tsx
├── src/
│   ├── components/
│   ├── data/
│   └── lib/
├── schema/
├── docs/
├── .github/
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Open-source model

The app code and the public capability dataset are licensed under MIT for the initial project. The long-term goal is to make the capability graph community-maintained while keeping recommendations transparent and verifiable.

## Core product rules

- Never hide a built-in/free solution because a paid partner exists.
- Sponsored results must be clearly labeled.
- Every factual setup guide should link to an authoritative source.
- Compatibility must be explicit when a feature depends on OS version, hardware or region.
- Ask a follow-up only when it materially changes the answer.
- The system should say "I don't know" rather than invent a setting or feature.

## Status

**Pre-alpha / v0.13 Automations & Pro.** CanMyPhone is now an automation assistant:

- **24 automation recipes** (6 free) in six situations – Zuhause, Auto & unterwegs (incl. Tesla), Morgens & abends,
  Akku, Fokus & Freizeit, Familie & Sicherheit. Each recipe is a *Wenn → Dann* blueprint from which the exact
  German Kurzbefehle taps are generated (`src/data/automationRecipes.ts`, `src/lib/automationSteps.ts`).
- **Guided setup** with big „‹ Zurück“ / „Weiter ›“ buttons, a progress bar, „Beenden“ at any time and
  „Kurzbefehle öffnen“. A ready-made sentence for Apple Intelligence in Kurzbefehle (iOS 27) is offered too.
- **CanMyPhone Pro** subscription via StoreKit 2 in the app's own Swift module – no third-party SDK, no server.
  See [`docs/MONETIZATION.md`](docs/MONETIZATION.md) and [`PRIVACY.md`](PRIVACY.md).
- **99 tips** remain as the second area „Tipps“ (see [`docs/CATALOGUE.md`](docs/CATALOGUE.md)).
- Apple does not let any app create Kurzbefehle automations by itself, so CanMyPhone guides instead of
  pretending to automate in the background.
