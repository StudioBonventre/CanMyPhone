import type { ConnectorAdapter, ConnectorExecutionResult } from "./connectorRuntime";
import { homeAssistantServiceCallForRequest, type HomeAssistantState, type HomeAssistantServiceCall } from "./homeAssistantModel";

export type HomeAssistantTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function normalizeHomeAssistantBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("HOME_ASSISTANT_URL_REQUIRED");
  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname || url.search || url.hash) {
    throw new Error("HOME_ASSISTANT_URL_INVALID");
  }
  const hostname = url.hostname.toLowerCase();
  const privateV4 =
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^127\./.test(hostname);
  const local = hostname === "localhost" || hostname.endsWith(".local") || privateV4;
  if (url.protocol === "http:" && !local) throw new Error("HOME_ASSISTANT_REMOTE_HTTPS_REQUIRED");
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function homeAssistantWebSocketUrl(baseUrl: string): string {
  const url = new URL(normalizeHomeAssistantBaseUrl(baseUrl));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/websocket`;
  return url.toString();
}

export function buildHomeAssistantAuthorizationUrl(input: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const base = normalizeHomeAssistantBaseUrl(input.baseUrl);
  if (!input.clientId.startsWith("https://") || !input.redirectUri.trim() || !input.state.trim()) {
    throw new Error("HOME_ASSISTANT_OAUTH_CONFIG_INVALID");
  }
  const url = new URL(`${base}/auth/authorize`);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function homeAssistantAuthorizationCodeBody(code: string, clientId: string): string {
  if (!code.trim() || !clientId.startsWith("https://")) throw new Error("HOME_ASSISTANT_OAUTH_CONFIG_INVALID");
  return new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId }).toString();
}

export function homeAssistantRefreshTokenBody(refreshToken: string, clientId: string): string {
  if (!refreshToken.trim() || !clientId.startsWith("https://")) throw new Error("HOME_ASSISTANT_OAUTH_CONFIG_INVALID");
  return new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }).toString();
}

export type HomeAssistantApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
};

export class HomeAssistantApiClient {
  readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: HomeAssistantApiClientOptions) {
    this.baseUrl = normalizeHomeAssistantBaseUrl(options.baseUrl);
    this.fetcher = options.fetcher ?? fetch;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!path.startsWith("/api/")) throw new Error("HOME_ASSISTANT_API_PATH_INVALID");
    const token = await this.options.getAccessToken();
    if (!token) throw new Error("HOME_ASSISTANT_NOT_AUTHENTICATED");
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 || response.status === 403) throw new Error("HOME_ASSISTANT_AUTH_FAILED");
    if (!response.ok) throw new Error(`HOME_ASSISTANT_HTTP_${response.status}`);
    return response;
  }

  async listStates(): Promise<HomeAssistantState[]> {
    const value = await (await this.request("/api/states")).json();
    if (!Array.isArray(value)) throw new Error("HOME_ASSISTANT_INVALID_STATES");
    return value.filter((item): item is HomeAssistantState =>
      record(item) && typeof item.entity_id === "string" && typeof item.state === "string" && record(item.attributes)
    );
  }

  async callService(call: HomeAssistantServiceCall): Promise<unknown> {
    if (!/^[a-z0-9_]+$/.test(call.domain) || !/^[a-z0-9_]+$/.test(call.service)) throw new Error("HOME_ASSISTANT_SERVICE_INVALID");
    const response = await this.request(`/api/services/${call.domain}/${call.service}`, {
      method: "POST",
      body: JSON.stringify(call.serviceData)
    });
    return response.json();
  }
}

export function createHomeAssistantConnectorAdapter(client: HomeAssistantApiClient): ConnectorAdapter {
  return {
    providerId: "home-assistant",
    async execute(request): Promise<ConnectorExecutionResult> {
      const call = homeAssistantServiceCallForRequest(request);
      if (!call) {
        return {
          ok: false,
          providerId: "home-assistant",
          code: "HOME_ASSISTANT_UNSUPPORTED_OPERATION",
          message: "Diese Home-Assistant-Aktion ist nicht sicher auflösbar."
        };
      }
      try {
        await client.callService(call);
        return { ok: true, confirmed: true, providerId: "home-assistant" };
      } catch (error) {
        return {
          ok: false,
          providerId: "home-assistant",
          code: error instanceof Error ? error.message : "HOME_ASSISTANT_EXECUTION_FAILED",
          message: "Home Assistant konnte die Aktion nicht bestätigen."
        };
      }
    }
  };
}

export const homeAssistantWebSocketCommands = {
  auth: (accessToken: string) => ({ type: "auth", access_token: accessToken }),
  states: (id: number) => ({ id, type: "get_states" }),
  areas: (id: number) => ({ id, type: "config/area_registry/list" }),
  devices: (id: number) => ({ id, type: "config/device_registry/list" }),
  entitiesForDisplay: (id: number) => ({ id, type: "config/entity_registry/list_for_display" }),
  subscribeStateChanged: (id: number) => ({ id, type: "subscribe_events", event_type: "state_changed" })
};
