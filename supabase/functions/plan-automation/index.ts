import { hasBearerAuthorization, safeLogFields, selectServerCandidates, validatePlannerEnvelope } from "../_shared/planner-core.ts";

const timeoutMs = 12_000;
const schema = { type:"object", additionalProperties:false, required:["intent","clarificationNeeded","clarificationQuestion","confidence","plan"], properties:{ intent:{type:"string"}, clarificationNeeded:{type:"boolean"}, clarificationQuestion:{type:["string","null"]}, confidence:{type:"number",minimum:0,maximum:1}, plan:{type:["object","null"]} } };

function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
async function callModel(goal: string, locale: string, model: string, signal: AbortSignal) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("missing_ai_secret");
  const response = await fetch("https://api.openai.com/v1/responses", { method:"POST", signal, headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/json" }, body:JSON.stringify({ model, max_output_tokens:1800, store:false, input:[{role:"system",content:`You propose automation plans only. Never execute actions. If trigger, target, or desired outcome is ambiguous, ask one concrete clarification and set plan null. Use only these prefiltered capabilities:\n${selectServerCandidates(goal)}`},{role:"user",content:JSON.stringify({goal,locale})}], text:{format:{type:"json_schema",name:"automation_planner",strict:true,schema}} }) });
  if (!response.ok) throw new Error(response.status === 429 ? "rate_limited" : response.status >= 500 ? "provider_unavailable" : "provider_rejected");
  const body = await response.json();
  const output = body?.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
  if (typeof output !== "string") throw new Error("empty_model_output");
  return JSON.parse(output);
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return json({ ok:false, code:"method_not_allowed", message:"Nur POST ist erlaubt." }, 405);
  if (!hasBearerAuthorization(request.headers.get("authorization"))) return json({ ok:false, code:"unauthorized", message:"Bitte melde dich erneut an." }, 401);
  let input: unknown; try { input = await request.json(); } catch { return json({ ok:false, code:"invalid_request", message:"Die Anfrage ist ungültig." }, 400); }
  if (!input || typeof input !== "object") return json({ ok:false, code:"invalid_request", message:"Die Anfrage ist ungültig." }, 400);
  const { goal, locale = "de" } = input as {goal?:unknown;locale?:unknown};
  if (typeof goal !== "string" || !goal.trim() || goal.length > 800 || typeof locale !== "string") return json({ ok:false, code:"invalid_request", message:"Beschreibe dein Ziel in höchstens 800 Zeichen." }, 400);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fastModel = Deno.env.get("AI_PLANNER_MODEL_FAST") || "gpt-5-mini";
    let proposal: unknown;
    try { proposal = await callModel(goal.trim(), locale.slice(0,10), fastModel, controller.signal); }
    catch (error) {
      if (!(error instanceof Error) || !["rate_limited","provider_unavailable"].includes(error.message)) throw error;
      proposal = await callModel(goal.trim(), locale.slice(0,10), fastModel, controller.signal);
    }
    const validated = validatePlannerEnvelope(proposal);
    if (!validated.ok) { console.warn(safeLogFields(requestId,"error",validated.code)); return json({ok:false,code:validated.code,message:"Diese Automation kann ich noch nicht sicher erstellen."},422); }
    console.info(safeLogFields(requestId,validated.value.clarificationNeeded?"clarification":"ok"));
    return json({ok:true,...validated.value});
  } catch (error) {
    const code = error instanceof DOMException && error.name === "AbortError" ? "timeout" : error instanceof Error ? error.message : "planner_failed";
    console.error(safeLogFields(requestId,"error",code));
    const status = code === "timeout" ? 504 : code === "rate_limited" ? 429 : 502;
    return json({ok:false,code,message:code === "timeout" ? "Die Planung dauert gerade zu lange. Bitte versuche es erneut." : "Der sichere Planner ist gerade nicht erreichbar."},status);
  } finally { clearTimeout(timer); }
});
