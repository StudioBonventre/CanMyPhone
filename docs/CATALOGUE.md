# Capability catalogue

The catalogue is the product. Every answer CanMyPhone gives comes from a reviewed entry in `src/data/`.

| File | Contents |
| --- | --- |
| `actionSolutions.ts` | Things the app can do itself through public APIs (brightness, its own permissions) |
| `knowledgeSolutions.ts` | Siri, Shortcuts, Apple Intelligence and the original hand-picked set |
| `deviceSolutions.ts` | Battery, display, sound, controls, storage, connectivity |
| `safetySolutions.ts` | Find My, theft protection, spam, emergency, family |
| `everydaySolutions.ts` | Calls & messages, photos, productivity, travel, health, home, accessibility |
| `categories.ts` | Topic labels and order for Discover |

## Rules for a new entry

1. **Problem first.** Aliases are mostly the words people use when something annoys them
   ("akku schnell leer", "ständig spam anrufe"), not only the feature name.
2. **One official source minimum.** Prefer the German iPhone User Guide via `guide("<topic id>", "<title>")`.
   Topic IDs come from the guide's table of contents at https://support.apple.com/de-de/guide/iphone/welcome/ios.
3. **Honest requirements.** Model limits (e.g. "iPhone 15 oder neuer"), region limits and paid tiers belong in
   `requirements` or `availability` – never hidden.
4. **Steps a beginner can follow.** Name the visible labels exactly as iOS shows them in German.
5. **Add a test phrasing** to `tests/realQueries.ts` if the entry answers a common problem.

`npm run test:unit` checks unique IDs, completeness, trusted source hosts, known categories,
a ≥ 95 % top-1 hit rate on `realQueries.ts` and that off-topic questions never get a confident answer.

## Search in one paragraph

`src/lib/text.ts` folds umlauts, removes stopwords, strips simple German suffixes and expands a small synonym
table. `src/lib/search.ts` scores each entry with IDF-weighted word hits (alias > title > tags > summary),
compound-word prefixes, whole-alias phrases and several query words appearing in the same alias. A match that
rests on one word out of several is marked `uncertain`, and the app asks "Meinst du …?" instead of answering.
Nothing below the relevance threshold is shown – CanMyPhone prefers "I don't know yet" over a wrong answer.
