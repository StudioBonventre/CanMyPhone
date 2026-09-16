# Need Radar

Need Radar is CanMyPhone's opt-in personalization layer.

Its job is not to monitor a person's entire phone. Its job is to gradually understand **which capabilities are likely to solve real friction for that person**.

## Product promise

> CanMyPhone should become more useful the longer you use it, without requiring you to constantly explain your preferences.

## Signals

### v0.1 — explicit and in-app only

Need Radar may learn from:

- problems the user asks CanMyPhone about
- solution categories the user opens
- `Worked`
- `Didn't work`
- `Already knew this`
- `Not relevant`
- Discover answers the user selects

No broad phone surveillance is required.

### Later — optional contextual signals

Only where a platform allows it and the user explicitly chooses it, CanMyPhone may use additional context such as:

- device model and OS version
- language and region
- user-declared apps/services/devices
- selected routines (work, commute, travel, photography, study, etc.)
- supported system integrations or shortcuts

Every signal must have a clear user benefit and a visible explanation.

## What Need Radar stores

The minimal profile is preference-oriented rather than activity-log-oriented:

```text
category affinity
known capabilities
dismissed capabilities
successful capabilities
interaction count
selected context
```

It should avoid retaining raw historical activity when a compact preference signal is sufficient.

## Recommendation behavior

Need Radar should:

1. boost categories repeatedly associated with useful outcomes
2. down-rank capabilities marked `Already knew this`
3. suppress capabilities marked `Not relevant`
4. avoid repeatedly showing a solution already completed successfully
5. prefer native, low-friction solutions when relevance is otherwise similar
6. explain why a proactive recommendation appeared

Example:

> **Picked for you**
>
> Automate something when you leave work
>
> *Why this fits: You've repeatedly asked about reducing repetitive actions.*

## User control

Need Radar must always provide:

- a clear On / Off control
- `Why am I seeing this?`
- a way to correct a recommendation
- a way to clear the learned profile
- no loss of the basic Ask functionality when personalization is disabled

## Privacy model

Default direction:

- local/on-device profile first
- sync only as an optional feature
- aggregate product analytics separated from the personal preference profile
- no sale of personal behavioral profiles
- sponsored recommendations never alter the organic Need Radar ranking invisibly

## Free vs Pro

Need Radar should be useful before monetization decisions are made. A possible later model is:

### Free
- Ask
- basic Discover
- limited local learning

### Pro
- richer long-term preference model
- proactive recommendations
- synced profile across devices
- advanced routines and personalized automation suggestions

This is a product option, not a committed pricing model.
