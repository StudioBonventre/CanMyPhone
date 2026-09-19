# AI-first automation architecture

CanMyPhone treats model output as an untrusted proposal. A server-side planner (Supabase Edge Function or equivalent) receives the minimum required context, returns an `AutomationPlan`, and keeps model credentials off the device. The client validates the plan version and shape; the capability registry allow-lists every trigger, condition, and action; deterministic provider adapters execute only validated plans.

## Main flow

1. Tell me what you want to happen.
2. Preview an explainable plan with trigger, checks, actions, execution location, risk, and fallbacks.
3. Connect only the required providers and grant the minimum permissions.
4. Explicitly confirm sensitive or destructive automations.
5. Create the automation and show its real status. Success is shown only after the provider confirms it.

Basic planning and a limited automatic action remain free. Multi-step plans, third-party integrations, and proactive suggestions may require Pro. Permissions and safety confirmations never do.

## Tesla rear-trunk scenario

Tesla Fleet API officially exposes `actuate_trunk` with `which_trunk: rear`. It is a state-changing command and requires OAuth scopes, a user-paired virtual key, and signed Vehicle Command Protocol requests from a secure server. The server checks the live rear-trunk state first and sends the command only when the state is unequivocally open. Unknown state aborts; a sleeping vehicle requires a disclosed wake/retry step; success is not claimed until confirmed.

iOS Core Location geofencing can deliver exit events and wake the app, subject to location authorization, system limits, and user settings. The user therefore completes a one-time Always Location authorization and Tesla authorization/key pairing. CanMyPhone does not automate Settings UI or use private URL schemes.

## Personalization and privacy

Personalization ranks explainable ideas from accepted/rejected suggestions, completed automations, connected integrations, and explicitly granted context. It is profile/context personalization, not model retraining. Proactive ideas can be disabled and all learned signals can be cleared. Analytics uses named lifecycle events and excludes raw requests, VINs, coordinates, and provider tokens by default.
