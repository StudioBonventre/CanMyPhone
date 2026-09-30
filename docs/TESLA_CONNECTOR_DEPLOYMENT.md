# Tesla connector deployment

CanMyPhone uses Tesla's official Fleet API authorization flow and the official Vehicle Command Protocol path. OAuth client secrets and the command private key stay off the iPhone.

## Required server configuration

The `tesla-connector` Supabase Edge Function expects:

- `TESLA_CLIENT_ID`
- `TESLA_CLIENT_SECRET`
- `TESLA_REDIRECT_URI` — the HTTPS URL of the Edge Function callback
- `TESLA_DEVELOPER_DOMAIN` — the registered Tesla developer domain
- `TESLA_OAUTH_STATE_SECRET` — long random secret for signed OAuth state
- `CONNECTOR_ENCRYPTION_KEY_B64` — 32 random bytes encoded as base64
- `TESLA_COMMAND_PROXY_URL` — HTTPS address of Tesla's official `tesla-http-proxy`
- optional `TESLA_FLEET_API_BASE`; defaults to the EMEA Fleet API endpoint

Apply the provider-credentials migration before deployment. The table is RLS-enabled and has no privileges for `anon` or `authenticated`; only backend service credentials can access ciphertext.

The Vehicle Command Proxy must use the same private key whose public key remains published at:

`https://<TESLA_DEVELOPER_DOMAIN>/.well-known/appspecific/com.tesla.3p.public-key.pem`

and paired by the Tesla owner. Do not place the private key, Tesla client secret, OAuth refresh token, or connector encryption key in Expo environment variables.

The connector checks `fleet_status` for paired VINs before reporting itself ready. Rear-trunk close is fail-closed: it reads the live rear-trunk state, refuses an unknown state, sends `actuate_trunk` only when the rear trunk is open, then reads state again before reporting success.
