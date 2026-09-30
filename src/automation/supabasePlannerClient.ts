import type { PlannerContext, ServerPlannerClient } from "./planner";
export type PlannerClientConfig = { supabaseUrl:string; publishableKey:string; getAccessToken:()=>Promise<string|null>; timeoutMs?:number; fetcher?:typeof fetch };
export function createSupabasePlannerClient(config: PlannerClientConfig): ServerPlannerClient {
  return { async plan(goal:string, context:PlannerContext) {
    const token = await config.getAccessToken(); if (!token) throw new Error("not-authenticated");
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 15_000);
    try {
      const response = await (config.fetcher ?? fetch)(`${config.supabaseUrl.replace(/\/$/,"")}/functions/v1/plan-automation`, { method:"POST", signal:controller.signal, headers:{Authorization:`Bearer ${token}`,apikey:config.publishableKey,"Content-Type":"application/json"}, body:JSON.stringify({goal:goal.slice(0,800),locale:context.locale.slice(0,10)}) });
      const body = await response.json().catch(() => null) as {ok?:boolean;code?:string}|null;
      if (!response.ok || !body?.ok) throw new Error(body?.code === "timeout" ? "timeout" : body?.code === "unauthorized" ? "not-authenticated" : "server-error");
      return body;
    } catch (error) { if (error instanceof Error && error.name === "AbortError") throw new Error("timeout"); throw error; }
    finally { clearTimeout(timer); }
  }};
}
