import { hasBearerAuthorization } from "../_shared/planner-core.ts";
import { UNIVERSAL_CAPABILITIES, universalCapability, type UniversalParameter } from "../_shared/universal-capabilities.ts";

const timeoutMs = 28_000;
const maxSources = 30;

type Input = {
  providerName?: unknown;
  providerHints?: unknown;
  requestedCapabilities?: unknown;
  deviceHints?: unknown;
  locale?: unknown;
  region?: unknown;
  room?: unknown;
};

type Research = {
  providerId: string;
  displayName: string;
  category: string;
  aliases: string[];
  deviceTypes: string[];
  transport: "LOCAL_REST" | "CLOUD_REST" | "WEBSOCKET" | "WEBHOOK" | "MATTER" | "HOMEKIT" | "SMARTTHINGS" | "GOOGLE_HOME" | "MQTT" | "OCPP" | "UNKNOWN";
  authentication: string;
  discovery: string;
  supportedCapabilities: string[];
  localNetworkRequired: boolean;
  backgroundCapability: "NATIVE" | "SERVER" | "FOREGROUND_ONLY" | "NONE";
  apiVersion: string;
  regionAvailability: string[];
  commercialUseFinding: "ALLOWED" | "PARTNER_APPROVAL_REQUIRED" | "PERSONAL_USE_ONLY" | "UNKNOWN" | "BLOCKED";
  blockingReasons: string[];
  confidence: number;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const safeStringArray = (value: unknown, max = 30): value is string[] =>
  Array.isArray(value) && value.length <= max && value.every(item => typeof item === "string" && item.length <= 160);

function safeHttps(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || /^127\./.test(host) || /^10\./.test(host) ||
        /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function sourceKind(url: string): "OFFICIAL_GITHUB" | "COMMUNITY_HINT" {
  try {
    return new URL(url).hostname.toLowerCase() === "github.com" ? "OFFICIAL_GITHUB" : "COMMUNITY_HINT";
  } catch {
    return "COMMUNITY_HINT";
  }
}

function schemaForCapability(id: string) {
  const cap = universalCapability(id);
  if (!cap) return null;
  return Object.fromEntries(Object.entries(cap.parameters).map(([key, value]) => [key, { ...value }]));
}

function resultSchema() {
  return { success: { type: "boolean" as const, required: true } };
}

function riskFor(id: string): "LOW" | "MEDIUM" | "HIGH" {
  const risk = universalCapability(id)?.risk ?? "medium";
  return risk.toUpperCase() as "LOW" | "MEDIUM" | "HIGH";
}

function outputText(body: any): string | null {
  const item = body?.output?.flatMap((entry: any) => entry?.content ?? [])
    .find((entry: any) => entry?.type === "output_text");
  return typeof item?.text === "string" ? item.text : null;
}

function consultedSources(body: any): string[] {
  const urls: string[] = [];
  for (const item of body?.output ?? []) {
    if (item?.type !== "web_search_call") continue;
    for (const source of item?.action?.sources ?? []) {
      const url = safeHttps(source?.url);
      if (url && !urls.includes(url)) urls.push(url);
      if (urls.length >= maxSources) return urls;
    }
  }
  return urls;
}

function researchSchema(capabilities: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "providerId","displayName","category","aliases","deviceTypes","transport","authentication","discovery",
      "supportedCapabilities","localNetworkRequired","backgroundCapability","apiVersion","regionAvailability",
      "commercialUseFinding","blockingReasons","confidence"
    ],
    properties: {
      providerId: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 80 },
      displayName: { type: "string", minLength: 1, maxLength: 160 },
      category: { type: "string", minLength: 1, maxLength: 80 },
      aliases: { type: "array", maxItems: 20, items: { type: "string", maxLength: 80 } },
      deviceTypes: { type: "array", maxItems: 30, items: { type: "string", maxLength: 80 } },
      transport: { type: "string", enum: ["LOCAL_REST","CLOUD_REST","WEBSOCKET","WEBHOOK","MATTER","HOMEKIT","SMARTTHINGS","GOOGLE_HOME","MQTT","OCPP","UNKNOWN"] },
      authentication: { type: "string", minLength: 1, maxLength: 120 },
      discovery: { type: "string", minLength: 1, maxLength: 160 },
      supportedCapabilities: { type: "array", uniqueItems: true, maxItems: capabilities.length, items: { type: "string", enum: capabilities } },
      localNetworkRequired: { type: "boolean" },
      backgroundCapability: { type: "string", enum: ["NATIVE","SERVER","FOREGROUND_ONLY","NONE"] },
      apiVersion: { type: "string", maxLength: 80 },
      regionAvailability: { type: "array", maxItems: 30, items: { type: "string", maxLength: 40 } },
      commercialUseFinding: { type: "string", enum: ["ALLOWED","PARTNER_APPROVAL_REQUIRED","PERSONAL_USE_ONLY","UNKNOWN","BLOCKED"] },
      blockingReasons: { type: "array", maxItems: 20, items: { type: "string", maxLength: 300 } },
      confidence: { type: "number", minimum: 0, maximum: 1 }
    }
  };
}

async function research(input: {
  providerName: string;
  providerHints: string[];
  requestedCapabilities: string[];
  deviceHints: string[];
  locale: string;
  region?: string;
  room?: string;
}, signal: AbortSignal): Promise<{ research: Research; sources: string[] }> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("missing_ai_secret");
  const model = Deno.env.get("AI_DISCOVERY_MODEL") || "gpt-5.6-luna";
  const capabilities = input.requestedCapabilities.filter(id => Boolean(universalCapability(id)));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_output_tokens: 2600,
      store: false,
      tools: [{
        type: "web_search",
        filters: { blocked_domains: ["reddit.com","quora.com","wikipedia.org"] }
      }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: [
        {
          role: "system",
          content: [
            "You research third-party integrations for CanMyPhone. You NEVER make a connector executable.",
            "Search the current web. Prioritize the provider's own developer documentation, official SDK, official OpenAPI, official GitHub, terms and commercial-use pages.",
            "Do not invent endpoints, credentials, capabilities, terms, SDKs or API availability.",
            "Only report a supported capability when the consulted current documentation materially supports it.",
            "If commercial use is unclear, report UNKNOWN. If an API is personal-use-only or needs partner approval, say so.",
            "Do not output request URLs/endpoints, executable code, secrets, tokens or credentials.",
            "The result is only an unverified candidate and will be independently reviewed before execution."
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            providerName: input.providerName,
            providerHints: input.providerHints,
            requestedCapabilities: capabilities,
            deviceHints: input.deviceHints,
            locale: input.locale,
            region: input.region ?? null,
            room: input.room ?? null,
            universalCapabilityDefinitions: UNIVERSAL_CAPABILITIES.filter(cap => capabilities.includes(cap.id))
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "connector_discovery_candidate",
          strict: true,
          schema: researchSchema(capabilities)
        }
      }
    })
  });
  if (!response.ok) {
    throw new Error(response.status === 429 ? "rate_limited" : response.status >= 500 ? "provider_unavailable" : "provider_rejected");
  }
  const body = await response.json();
  const text = outputText(body);
  if (!text) throw new Error("empty_model_output");
  return { research: JSON.parse(text) as Research, sources: consultedSources(body) };
}

Deno.serve(async request => {
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  if (!hasBearerAuthorization(request.headers.get("authorization"))) return json({ ok: false, code: "unauthorized" }, 401);

  let raw: Input;
  try { raw = await request.json(); } catch { return json({ ok: false, code: "invalid_request" }, 400); }

  const providerName = typeof raw?.providerName === "string" ? raw.providerName.trim() : "";
  const providerHints = safeStringArray(raw?.providerHints, 20) ? raw.providerHints.map(v => v.trim()).filter(Boolean) : [];
  const requestedCapabilities = safeStringArray(raw?.requestedCapabilities, 20)
    ? [...new Set(raw.requestedCapabilities)].filter(id => Boolean(universalCapability(id)))
    : [];
  const deviceHints = safeStringArray(raw?.deviceHints, 20) ? raw.deviceHints.map(v => v.trim()).filter(Boolean) : [];
  const locale = typeof raw?.locale === "string" ? raw.locale.slice(0, 10) : "de";
  const region = typeof raw?.region === "string" && raw.region.length <= 80 ? raw.region : undefined;
  const room = typeof raw?.room === "string" && raw.room.length <= 120 ? raw.room : undefined;

  if (!providerName || providerName.length > 160 || requestedCapabilities.length === 0) {
    return json({ ok: false, code: "invalid_request" }, 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const found = await research({ providerName, providerHints, requestedCapabilities, deviceHints, locale, region, room }, controller.signal);
    const supported = found.research.supportedCapabilities.filter(id => requestedCapabilities.includes(id) && Boolean(universalCapability(id)));
    const now = new Date().toISOString();
    const sources = found.sources.map(url => ({
      url,
      kind: sourceKind(url),
      providerOwned: false,
      retrievedAt: now
    }));
    const sourceUrls = sources.map(source => source.url);
    const actions = supported.flatMap(id => {
      const cap = universalCapability(id);
      const inputSchema = schemaForCapability(id);
      if (!cap || cap.role !== "action" || !inputSchema) return [];
      const risk = riskFor(id);
      return [{
        capabilityId: id,
        inputSchema,
        resultSchema: resultSchema(),
        risk,
        confirmationRequired: risk === "HIGH",
        sourceUrls
      }];
    });
    const triggers = supported.filter(id => universalCapability(id)?.role === "trigger");
    const eventSchemas = Object.fromEntries(triggers.map(id => [id, schemaForCapability(id) ?? {}]));
    const capabilitySources = Object.fromEntries(triggers.map(id => [id, sourceUrls]));
    const blockingReasons = [
      ...found.research.blockingReasons,
      "Quellen wurden automatisch recherchiert und sind noch nicht als provider-owned/verifiziert freigegeben.",
      "Commercial-/Lizenzstatus muss unabhängig geprüft werden.",
      "Ein vertrauenswürdiger Runtime-Adapter und Connector-Tests fehlen."
    ];

    const lifecycle = "CANDIDATE_LEGAL_REVIEW_REQUIRED";
    const candidateManifest = {
      providerId: found.research.providerId,
      displayName: found.research.displayName,
      kind: "DYNAMIC",
      category: found.research.category,
      aliases: found.research.aliases,
      deviceTypes: found.research.deviceTypes,
      transport: found.research.transport,
      authentication: found.research.authentication,
      discovery: found.research.discovery,
      triggers,
      conditions: [],
      actions,
      eventSchemas,
      capabilitySources,
      allowedDomains: [],
      localNetworkRequired: found.research.localNetworkRequired,
      backgroundCapability: found.research.backgroundCapability,
      eventInstallationSupported: false,
      regionAvailability: found.research.regionAvailability,
      commercialUseStatus: "UNKNOWN",
      apiVersion: found.research.apiVersion || "unknown",
      documentationSources: sources,
      connectorVersion: 1,
      lifecycle,
      verification: {
        documentation: false,
        authentication: false,
        endpointAllowlist: false,
        inputSchema: false,
        outputSchema: false,
        riskClassification: false,
        terms: false,
        connectorTests: false
      },
      confidence: Math.min(found.research.confidence, sourceUrls.length ? 0.85 : 0.4)
    };

    return json({
      ok: true,
      providerIdentity: { providerId: candidateManifest.providerId, displayName: candidateManifest.displayName },
      officialDocumentationSources: sources,
      candidateManifest,
      authenticationType: candidateManifest.authentication,
      transport: candidateManifest.transport,
      capabilities: supported,
      eventSupport: false,
      commercialStatus: "UNKNOWN",
      verificationState: lifecycle,
      blockingReasons,
      researchCommercialUseFinding: found.research.commercialUseFinding
    });
  } catch (error) {
    const code = error instanceof DOMException && error.name === "AbortError"
      ? "timeout"
      : error instanceof Error ? error.message : "discovery_failed";
    return json({
      ok: false,
      code,
      message: code === "timeout"
        ? "Die Integrationsprüfung dauert gerade zu lange."
        : "Die sichere Integrationsprüfung ist gerade nicht verfügbar."
    }, code === "timeout" ? 504 : code === "rate_limited" ? 429 : 502);
  } finally {
    clearTimeout(timer);
  }
});
