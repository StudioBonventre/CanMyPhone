# Compiler hardening B2.1

The deterministic compiler is now a staged pipeline: normalization, entity extraction, trigger selection, action selection, parameter resolution, catalogue validation, chain strategy, feasibility, and deterministic confidence. Brand names are aliases for entities; they no longer represent complete use-case branches. Bluetooth devices, apps, places, time, weekdays, percentages, Focus names, playlists, destinations, contacts, and Home scenes have independent extraction slots.

Strategy is calculated for the complete chain. A personal-automation trigger makes the chain a `PERSONAL_AUTOMATION` even when an individual action also supports a direct API. Third-party command chains resolve to `THIRD_PARTY_API`; unsupported steps fail closed. No strategy is selected merely because one step supports it.

Feasibility considers every step. External integrations produce `REQUIRES_THIRD_PARTY`; foreground or confirmation steps produce `PARTIALLY_AUTOMATIC`; Apple personal automation or permissions produce `ONE_TIME_SETUP`; guided fallbacks produce `GUIDED_ONLY`. Explanatory reasons are retained for the UI. `FULLY_AUTOMATIC` is allowed only when every step supports background execution without setup, integration, permission, or confirmation.

`validateShortcutDefinition` rejects unknown fields and capabilities, role confusion, unknown or missing parameters, wrong types, enum/range violations, missing integrations, understated risk or confirmation, overstated background support, and false fully-automatic claims. Unknown app handoffs are not invented.

The local result is used only at high confidence. Missing semantic entities produce a concise clarification; lower-confidence language continues to the authenticated Supabase AI fallback and is validated through the same catalogue boundary.
