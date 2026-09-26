import type { SemanticAutomationResult } from "./semanticInterpreter";
import { acceptSemanticAutomationOutput } from "./semanticInterpreter";

export type SemanticServerClientConfig={
  supabaseUrl:string;
  publishableKey:string;
  getAccessToken:()=>Promise<string|null>;
  timeoutMs?:number;
  fetcher?:typeof fetch;
};

export type SemanticServerContext={
  locale:string;
  connectedProviderIds:string[];
  localNow?:string;
  timeZone?:string;
};

export function createSemanticServerClient(config:SemanticServerClientConfig){
  return {
    async interpret(goal:string,context:SemanticServerContext):Promise<SemanticAutomationResult>{
      const token=await config.getAccessToken();
      if(!token)return{kind:"unavailable"};
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),config.timeoutMs??15_000);
      try{
        const response=await (config.fetcher??fetch)(
          `${config.supabaseUrl.replace(/\/$/,"")}/functions/v1/interpret-automation`,
          {
            method:"POST",
            signal:controller.signal,
            headers:{
              Authorization:`Bearer ${token}`,
              apikey:config.publishableKey,
              "Content-Type":"application/json"
            },
            body:JSON.stringify({
              goal:goal.slice(0,800),
              locale:context.locale.slice(0,10),
              connectedProviderIds:context.connectedProviderIds.slice(0,20),
              localNow:context.localNow ?? new Date().toISOString(),
              timeZone:context.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown"
            })
          }
        );
        const body=await response.json().catch(()=>null) as ({ok?:boolean;code?:string}&Record<string,unknown>)|null;
        if(!response.ok||!body?.ok)return{kind:"unavailable"};
        return acceptSemanticAutomationOutput(goal,JSON.stringify(body));
      }catch(error){
        if(error instanceof Error&&error.name==="AbortError")return{kind:"unavailable"};
        return{kind:"unavailable"};
      }finally{clearTimeout(timer);}
    }
  };
}
