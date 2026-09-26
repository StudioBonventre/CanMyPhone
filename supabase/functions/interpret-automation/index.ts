import { hasBearerAuthorization } from "../_shared/planner-core.ts";
import { safeSemanticLogFields, semanticCapabilitySummary, validateSemanticEnvelope } from "../_shared/semantic-core.ts";

const timeoutMs=12_000;
const schema={
  type:"object",
  additionalProperties:false,
  required:["kind","confidence","trigger","actions","clarificationQuestion","suggestion"],
  properties:{
    kind:{type:"string",enum:["automation","clarification","not_automation"]},
    confidence:{type:"number",minimum:0,maximum:1},
    trigger:{
      anyOf:[
        {type:"null"},
        {type:"object",additionalProperties:false,required:["capabilityId","parameters"],properties:{
          capabilityId:{type:"string"},
          parameters:{type:"object",additionalProperties:{type:["string","number","boolean"]}}
        }}
      ]
    },
    actions:{type:"array",items:{type:"object",additionalProperties:false,required:["capabilityId","parameters"],properties:{
      capabilityId:{type:"string"},
      parameters:{type:"object",additionalProperties:{type:["string","number","boolean"]}}
    }}},
    clarificationQuestion:{type:["string","null"]},
    suggestion:{anyOf:[
      {type:"null"},
      {type:"object",additionalProperties:false,required:["title","message","proposedGoal"],properties:{
        title:{type:"string"},message:{type:"string"},proposedGoal:{type:["string","null"]}
      }}
    ]}
  }
};

function json(body:unknown,status=200){
  return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
}

async function callModel(goal:string,locale:string,connectedProviderIds:string[],localNow:string,timeZone:string,signal:AbortSignal){
  const key=Deno.env.get("OPENAI_API_KEY");
  if(!key)throw new Error("missing_ai_secret");
  const model=Deno.env.get("AI_PLANNER_MODEL_FAST")||"gpt-5-mini";
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",signal,
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      model,max_output_tokens:1800,store:false,
      input:[
        {role:"system",content:[
          "You are CanMyPhone's semantic automation interpreter.",
          "Understand intent across wording, grammar, slang and typos.",
          "Return only allow-listed capability ids; never invent APIs, menu paths or provider support.",
          "One automation may contain multiple independent actions across manufacturers.",
          "If the user omits a provider, do not invent one. Leave provider/brand absent; runtime routing will choose a single compatible connected provider or ask later.",
          "For provider-neutral hardware use vehicle.lock/unlock and smart-home cover/light/climate capabilities.",
          "Ask one short clarification only when a necessary trigger, target or value is genuinely ambiguous.",
          "Optional suggestions may improve the automation but must never silently alter the request.",
          semanticCapabilitySummary,
          `Connected providers: ${connectedProviderIds.length?connectedProviderIds.join(", "):"none"}`,
          `Current local timestamp: ${localNow}`,
          `Time zone: ${timeZone}`,
          "Resolve relative dates only when this context makes them unambiguous; otherwise ask one concise clarification."
        ].join("\n")},
        {role:"user",content:JSON.stringify({goal,locale})}
      ],
      text:{format:{type:"json_schema",name:"semantic_automation",strict:true,schema}}
    })
  });
  if(!response.ok)throw new Error(response.status===429?"rate_limited":response.status>=500?"provider_unavailable":"provider_rejected");
  const body=await response.json();
  const output=body?.output?.flatMap((item:any)=>item.content??[]).find((item:any)=>item.type==="output_text")?.text;
  if(typeof output!=="string")throw new Error("empty_model_output");
  return JSON.parse(output);
}

Deno.serve(async(request)=>{
  const requestId=crypto.randomUUID();
  if(request.method!=="POST")return json({ok:false,code:"method_not_allowed"},405);
  if(!hasBearerAuthorization(request.headers.get("authorization")))return json({ok:false,code:"unauthorized"},401);
  let input:unknown;
  try{input=await request.json();}catch{return json({ok:false,code:"invalid_request"},400);}
  if(!input||typeof input!=="object")return json({ok:false,code:"invalid_request"},400);
  const {goal,locale="de",connectedProviderIds=[],localNow="",timeZone=""}=input as {goal?:unknown;locale?:unknown;connectedProviderIds?:unknown;localNow?:unknown;timeZone?:unknown};
  if(typeof goal!=="string"||!goal.trim()||goal.length>800||typeof locale!=="string"||!Array.isArray(connectedProviderIds)||connectedProviderIds.length>20||connectedProviderIds.some((id)=>typeof id!=="string"||id.length>80)||typeof localNow!=="string"||localNow.length>80||typeof timeZone!=="string"||timeZone.length>80)return json({ok:false,code:"invalid_request"},400);

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const nowValue=localNow||new Date().toISOString();
    const timeZoneValue=timeZone||"unknown";
    const proposal=await callModel(goal.trim(),locale.slice(0,10),connectedProviderIds as string[],nowValue,timeZoneValue,controller.signal);
    const validated=validateSemanticEnvelope(proposal);
    if(!validated.ok){
      console.warn(safeSemanticLogFields(requestId,"error",validated.code));
      return json({ok:false,code:validated.code,message:"Diese Automation kann ich noch nicht sicher verstehen."},422);
    }
    console.info(safeSemanticLogFields(requestId,validated.value.kind==="clarification"?"clarification":"ok"));
    return json({ok:true,...validated.value});
  }catch(error){
    const code=error instanceof DOMException&&error.name==="AbortError"?"timeout":error instanceof Error?error.message:"semantic_failed";
    console.error(safeSemanticLogFields(requestId,"error",code));
    return json({ok:false,code,message:code==="timeout"?"Die KI braucht gerade zu lange.":"Die sichere KI-Planung ist gerade nicht erreichbar."},code==="timeout"?504:502);
  }finally{clearTimeout(timer);}
});
