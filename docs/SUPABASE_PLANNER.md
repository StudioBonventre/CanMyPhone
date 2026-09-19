# Supabase AI Planner

## Architecture and data flow

Known goals are compiled on-device by `compileVerifiedGoal`. Only unmatched goals cross the authenticated `plan-automation` Edge Function boundary. The client sends the goal (maximum 800 characters) and locale; it does not send VINs, coordinates, tokens, connected-provider history, or personalization signals. Supabase validates the user JWT before execution.

The Edge Function calls the fast planning model with a compact capability catalogue and structured output contract. Model output is untrusted. The server validates the envelope, capabilities, parameters, risk, and sensitive-action confirmation. The client then runs Validation V2 again before showing a plan.

The planner only proposes. It has no Tesla credentials, command adapter, geofence executor, service-role database access, or ability to activate automations.

## Secrets

Production secrets belong in Supabase Edge Function Secrets, never Expo configuration or the repository:

- `OPENAI_API_KEY` — required server-only model credential.
- `AI_PLANNER_MODEL_FAST` — optional; defaults to `gpt-5-mini`.
- `AI_PLANNER_MODEL_COMPLEX` — optional reserved model name for explicitly approved complex routing.
- `AI_PLANNER_ALLOW_COMPLEX_FALLBACK` — optional, defaults to `false`; this block never silently escalates.

The mobile client may contain only `EXPO_PUBLIC_SUPABASE_URL` and a Supabase publishable key. It must attach the signed-in user's short-lived access token. A service-role or Supabase secret key must never ship in the client.

When no existing session is present, the client requests a Supabase anonymous session. Anonymous sign-ins therefore need to be enabled for this project; the resulting user JWT still passes the authenticated Edge Function boundary. Rate limiting should be configured per authenticated user before production launch.

## Cost strategy

Deterministic templates are free of inference cost and always run first. AI receives only a compact capability list, locale, and the current goal. Output is capped and uses the fast model by default. Transient 429/5xx failures receive one same-model retry. Invalid output is rejected rather than retried or upgraded. Strong-model fallback is off by default and reserved for a later, explicitly measured complexity policy.

## Failure modes and safety boundary

- Ambiguous request: return one concrete clarification and no plan.
- Invalid schema, unknown capability, parameter, or risk downgrade: HTTP 422 and no plan.
- Missing/invalid session: HTTP 401.
- Model timeout: HTTP 504 with a user-readable retry message.
- Provider/rate-limit failure: stable error code and no partial plan.
- Logs contain request ID, outcome, and bounded error code only—never raw goals or sensitive context.

No planner response is executable by itself. Later execution layers must still check entitlement, authorizations, explicit confirmation, current provider state, and the deterministic execution allow-list.
