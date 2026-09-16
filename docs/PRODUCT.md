# Product definition

## One-sentence promise

**Tell CanMyPhone what is annoying you, what you keep doing manually, or what you wish your phone could do — and it finds the simplest verified way to solve it.**

## The key difference from a tips catalog

A tips catalog starts with features and asks the user to browse.

CanMyPhone starts with the **person**.

The user does not need to know the name of a feature, where it lives in Settings, or even whether it exists. The product first understands the outcome, asks a short follow-up when necessary, and only then recommends a capability.

The basic loop is:

`problem → clarify → understand context → recommend → guide → verify outcome → Need Radar learns → better next recommendation`

## Two product modes

### 1. Ask

For an immediate problem:

> "I always forget where I parked."

> "I do the same thing every time I leave work."

> "I wish my phone would tell me when the doorbell rings."

CanMyPhone should answer with the best native solution first and ask a clarifying question only when it materially changes the answer.

### 2. Discover for me

For users who do not know what to ask.

Instead of random tips, CanMyPhone asks about friction:

- What do you repeat every day?
- What do you often forget?
- What takes too many taps?
- What do you use your phone for most?
- What do you wish happened automatically?

It then proposes a small set of relevant capabilities based on the user's device, OS, interests and answers.


### 3. Need Radar

Need Radar is the opt-in learning layer that makes Ask and Discover more personal over time. It learns from the user's problems, opened solutions and explicit outcome feedback. It should proactively surface a small number of capabilities that are likely to remove friction for that specific person.

It must be transparent, user-controlled and local-first. Turning Need Radar off must never disable normal Ask functionality.

See [`NEED_RADAR.md`](NEED_RADAR.md).

## Personal context model

The recommendation engine may use, with clear consent:

- phone model
- operating-system version
- region and language
- selected interests
- selected pain points
- capabilities the user already knows
- solutions previously marked Worked / Didn't work
- optional app/service preferences the user provides
- compact Need Radar category affinity derived from in-app interactions
- capabilities marked already known, successful or not relevant

It should not require broad permissions merely to appear personalized.

## Primary user job

"I know the problem I have, but I don't know whether my phone already solves it, what the feature is called, or how to set it up."

## Ranking policy

The resolver ranks solutions using this order unless the user's constraints require otherwise:

1. Native and already installed
2. Native automation / shortcut
3. Free trusted app or web tool
4. Paid app/service
5. Hardware purchase

Ranking must not be altered secretly by sponsorship.

## Conversational rules

- Ask at most one useful follow-up at a time.
- Never quiz the user about technical terminology they may not know.
- Prefer outcome language over feature names.
- Explain why a recommendation is relevant to the user's stated problem.
- Do not overwhelm: show one best answer, then alternatives.
- Remember explicit feedback such as "I already know this" or "I never use this" only with user consent.
- Say "I don't know yet" instead of inventing a setting or capability.

## MVP screens

### Home
- primary prompt: "What is annoying you?"
- secondary prompt: "What do you wish your phone did for you?"
- Ask mode
- Discover for me mode
- detected platform badge

### Clarify
- one short adaptive question only when needed
- examples as tappable answers

### Result
- best answer first
- "Why this fits you"
- built-in/free badge
- estimated setup time
- requirements
- steps
- authoritative source
- alternatives

### Feedback
- Worked
- Didn't work
- I already knew this
- Not relevant to me

## Success metrics

For the first public beta:
- answer coverage: % of searches with a useful verified result
- solution success: % marked Worked
- relevance: % marked relevant vs not relevant
- discovery usefulness: % of suggested tips the user opens or saves
- zero-result queries: our most important product-discovery dataset
- time to first useful answer

## Long-term moat

The product moat is not a chatbot and not a list of tips. It is a maintained graph of:

`user intent + context → phone capability → compatibility → verified setup → outcome`

Over time, anonymous aggregate demand can also reveal important unsolved problems where no good capability exists yet.
