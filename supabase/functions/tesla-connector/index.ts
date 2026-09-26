import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type TeslaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  baseUrl: string;
};

const AUTH_BASE = "https://auth.tesla.com/oauth2/v3/authorize";
const TOKEN_URL = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";
const DEFAULT_FLEET_BASE = "https://fleet-api.prd.eu.vn.cloud.tesla.com";
const SCOPES = ["openid","offline_access","vehicle_device_data","vehicle_cmds"];

function env(name:string):string {
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`missing_env_${name}`);
  return value;
}

function optionalEnv(name:string):string|undefined {
  return Deno.env.get(name)?.trim() || undefined;
}

function json(body:unknown,status=200){
  return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
}

function base64url(bytes:Uint8Array):string {
  let binary=""; for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function fromBase64(value:string):Uint8Array {
  const binary=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
  return Uint8Array.from(binary,(char)=>char.charCodeAt(0));
}

async function hmacKey(){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(env("TESLA_OAUTH_STATE_SECRET")),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}

async function signState(userId:string){
  const payload=base64url(new TextEncoder().encode(JSON.stringify({userId,exp:Date.now()+10*60_000,nonce:crypto.randomUUID()})));
  const signature=new Uint8Array(await crypto.subtle.sign("HMAC",await hmacKey(),new TextEncoder().encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

async function verifyState(state:string):Promise<string|null>{
  const [payload,signature]=state.split(".");
  if(!payload||!signature)return null;
  const valid=await crypto.subtle.verify("HMAC",await hmacKey(),fromBase64(signature),new TextEncoder().encode(payload));
  if(!valid)return null;
  try{
    const parsed=JSON.parse(new TextDecoder().decode(fromBase64(payload))) as {userId?:unknown;exp?:unknown};
    if(typeof parsed.userId!=="string"||typeof parsed.exp!=="number"||parsed.exp<Date.now())return null;
    return parsed.userId;
  }catch{return null;}
}

async function encryptionKey(){
  const raw=fromBase64(env("CONNECTOR_ENCRYPTION_KEY_B64"));
  if(raw.byteLength!==32)throw new Error("invalid_connector_encryption_key");
  return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}

async function encryptTokens(userId:string,tokens:TeslaTokens){
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(tokens));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt(
    {name:"AES-GCM",iv:nonce,additionalData:new TextEncoder().encode(`${userId}:tesla`)},
    await encryptionKey(),
    plaintext
  ));
  return {ciphertext:base64url(ciphertext),nonce:base64url(nonce)};
}

async function decryptTokens(userId:string,ciphertext:string,nonce:string):Promise<TeslaTokens>{
  const plaintext=await crypto.subtle.decrypt(
    {name:"AES-GCM",iv:fromBase64(nonce),additionalData:new TextEncoder().encode(`${userId}:tesla`)},
    await encryptionKey(),
    fromBase64(ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as TeslaTokens;
}

function secretKey():string{
  const legacy=optionalEnv("SUPABASE_SERVICE_ROLE_KEY"); if(legacy)return legacy;
  const parsed=JSON.parse(env("SUPABASE_SECRET_KEYS")) as Record<string,string>;
  if(!parsed.default)throw new Error("missing_supabase_secret_key");
  return parsed.default;
}

function publicKey():string{
  const legacy=optionalEnv("SUPABASE_ANON_KEY"); if(legacy)return legacy;
  const parsed=JSON.parse(env("SUPABASE_PUBLISHABLE_KEYS")) as Record<string,string>;
  if(!parsed.default)throw new Error("missing_supabase_publishable_key");
  return parsed.default;
}

function admin(){
  return createClient(env("SUPABASE_URL"),secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
}

async function authenticatedUser(request:Request):Promise<string|null>{
  const header=request.headers.get("authorization");
  if(!header?.startsWith("Bearer "))return null;
  const scoped=createClient(env("SUPABASE_URL"),publicKey(),{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:header}}
  });
  const {data,error}=await scoped.auth.getUser();
  return error?null:data.user?.id??null;
}

async function storeTokens(userId:string,tokens:TeslaTokens){
  const encrypted=await encryptTokens(userId,tokens);
  const {error}=await admin().from("provider_credentials").upsert({
    user_id:userId,
    provider:"tesla",
    credential_ciphertext:encrypted.ciphertext,
    credential_nonce:encrypted.nonce,
    metadata:{baseUrl:tokens.baseUrl,expiresAt:tokens.expiresAt},
    updated_at:new Date().toISOString()
  },{onConflict:"user_id,provider"});
  if(error)throw new Error("credential_store_failed");
}

async function loadTokens(userId:string):Promise<TeslaTokens|null>{
  const {data,error}=await admin().from("provider_credentials")
    .select("credential_ciphertext,credential_nonce")
    .eq("user_id",userId).eq("provider","tesla").maybeSingle();
  if(error)throw new Error("credential_load_failed");
  if(!data)return null;
  return decryptTokens(userId,data.credential_ciphertext,data.credential_nonce);
}

async function exchangeCode(code:string):Promise<TeslaTokens>{
  const baseUrl=optionalEnv("TESLA_FLEET_API_BASE")??DEFAULT_FLEET_BASE;
  const body=new URLSearchParams({
    grant_type:"authorization_code",
    client_id:env("TESLA_CLIENT_ID"),
    client_secret:env("TESLA_CLIENT_SECRET"),
    code,
    audience:baseUrl,
    redirect_uri:env("TESLA_REDIRECT_URI")
  });
  const response=await fetch(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const payload=await response.json().catch(()=>null) as any;
  if(!response.ok||typeof payload?.access_token!=="string"||typeof payload?.refresh_token!=="string")throw new Error("tesla_code_exchange_failed");
  return {
    accessToken:payload.access_token,
    refreshToken:payload.refresh_token,
    expiresAt:Date.now()+Math.max(60,Number(payload.expires_in)||3600)*1000,
    baseUrl
  };
}

async function validTokens(userId:string,tokens:TeslaTokens):Promise<TeslaTokens>{
  if(tokens.expiresAt>Date.now()+60_000)return tokens;
  const body=new URLSearchParams({
    grant_type:"refresh_token",
    client_id:env("TESLA_CLIENT_ID"),
    client_secret:env("TESLA_CLIENT_SECRET"),
    refresh_token:tokens.refreshToken,
    audience:tokens.baseUrl
  });
  const response=await fetch(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const payload=await response.json().catch(()=>null) as any;
  if(!response.ok||typeof payload?.access_token!=="string"||typeof payload?.refresh_token!=="string")throw new Error("tesla_refresh_failed");
  const next={
    accessToken:payload.access_token,
    refreshToken:payload.refresh_token,
    expiresAt:Date.now()+Math.max(60,Number(payload.expires_in)||3600)*1000,
    baseUrl:tokens.baseUrl
  };
  await storeTokens(userId,next);
  return next;
}

async function teslaFetch(tokens:TeslaTokens,path:string,init:RequestInit={}){
  return fetch(`${tokens.baseUrl}${path}`,{
    ...init,
    headers:{Authorization:`Bearer ${tokens.accessToken}`,"Content-Type":"application/json",...(init.headers??{})}
  });
}

async function vehicles(tokens:TeslaTokens){
  const response=await teslaFetch(tokens,"/api/1/vehicles");
  const payload=await response.json().catch(()=>null) as any;
  if(!response.ok||!Array.isArray(payload?.response))throw new Error("tesla_vehicle_list_failed");
  return payload.response as Array<Record<string,unknown>>;
}

function vinOf(vehicle:Record<string,unknown>):string|undefined{
  return typeof vehicle.vin==="string"?vehicle.vin:undefined;
}

async function chooseVehicle(tokens:TeslaTokens,requested?:string){
  const list=await vehicles(tokens);
  const withVin=list.filter((item)=>vinOf(item));
  if(requested?.trim()){
    const query=requested.trim().toLowerCase();
    const match=withVin.find((item)=>String(item.vin).toLowerCase()===query||String(item.display_name??"").toLowerCase()===query);
    if(!match)throw new Error("tesla_vehicle_not_found");
    return match;
  }
  if(withVin.length===1)return withVin[0]!;
  if(!withVin.length)throw new Error("tesla_vehicle_not_found");
  throw new Error("tesla_vehicle_required");
}

function pairingUrl(vin?:string){
  const domain=env("TESLA_DEVELOPER_DOMAIN").replace(/^https?:\/\//,"").replace(/\/$/,"");
  const url=new URL(`https://www.tesla.com/_ak/${domain}`);
  if(vin)url.searchParams.set("vin",vin);
  return url.toString();
}

async function fleetStatus(tokens:TeslaTokens,vins:string[]){
  if(!vins.length)return {paired:[] as string[]};
  const response=await teslaFetch(tokens,"/api/1/vehicles/fleet_status",{method:"POST",body:JSON.stringify({vins})});
  const payload=await response.json().catch(()=>null) as any;
  if(!response.ok)throw new Error("tesla_fleet_status_failed");
  const paired=Array.isArray(payload?.response?.key_paired_vins)?payload.response.key_paired_vins.filter((x:any)=>typeof x==="string"):[];
  return {paired};
}

async function command(tokens:TeslaTokens,vin:string,path:string,body:Record<string,unknown>){
  const proxy=env("TESLA_COMMAND_PROXY_URL").replace(/\/$/,"");
  const response=await fetch(`${proxy}/api/1/vehicles/${encodeURIComponent(vin)}/command/${path}`,{
    method:"POST",
    headers:{Authorization:`Bearer ${tokens.accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const payload=await response.json().catch(()=>null) as any;
  if(!response.ok||payload?.response?.result===false){
    const message=typeof payload?.error==="string"?payload.error:"Tesla hat den Befehl abgelehnt.";
    return {ok:false,message,status:response.status};
  }
  return {ok:true,message:"Tesla hat den Befehl bestätigt."};
}

function errorCode(error:unknown){
  const value=error instanceof Error?error.message:"tesla_connector_failed";
  const known=new Set([
    "tesla_vehicle_not_found","tesla_vehicle_required","tesla_vehicle_list_failed","tesla_fleet_status_failed",
    "tesla_code_exchange_failed","tesla_refresh_failed","credential_store_failed","credential_load_failed"
  ]);
  return known.has(value)?value.toUpperCase():"TESLA_CONNECTOR_FAILED";
}

async function handleCallback(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get("code")??"";
  const state=url.searchParams.get("state")??"";
  const userId=await verifyState(state);
  if(!userId||!code)return new Response("Tesla authorization could not be verified.",{status:400});
  try{
    const tokens=await exchangeCode(code);
    await storeTokens(userId,tokens);
    const list=await vehicles(tokens);
    const vin=list.length===1?vinOf(list[0]!) : undefined;
    const pair=pairingUrl(vin);
    const app="canmyphone://connector/tesla?status=oauth-complete";
    const html=`<!doctype html><html><meta name="viewport" content="width=device-width"><body style="font-family:-apple-system;padding:32px;max-width:520px;margin:auto"><h2>Tesla ist verbunden</h2><p>Für Fahrzeugbefehle fehlt noch der offizielle virtuelle Schlüssel.</p><p><a href="${pair}">Virtuellen Schlüssel in Tesla koppeln</a></p><p><a href="${app}">Zurück zu CanMyPhone</a></p></body></html>`;
    return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  }catch{
    return new Response("Tesla authorization failed.",{status:502});
  }
}

Deno.serve(async(request)=>{
  if(request.method==="GET")return handleCallback(request);
  if(request.method!=="POST")return json({ok:false,code:"METHOD_NOT_ALLOWED",message:"Nur POST ist erlaubt."},405);
  const userId=await authenticatedUser(request);
  if(!userId)return json({ok:false,code:"UNAUTHORIZED",message:"Bitte melde dich erneut an."},401);
  let body:any; try{body=await request.json();}catch{return json({ok:false,code:"INVALID_REQUEST",message:"Ungültige Anfrage."},400);}
  try{
    if(body?.action==="authorize"){
      const state=await signState(userId);
      const url=new URL(AUTH_BASE);
      url.searchParams.set("response_type","code");
      url.searchParams.set("client_id",env("TESLA_CLIENT_ID"));
      url.searchParams.set("redirect_uri",env("TESLA_REDIRECT_URI"));
      url.searchParams.set("scope",SCOPES.join(" "));
      url.searchParams.set("state",state);
      url.searchParams.set("prompt_missing_scopes","true");
      url.searchParams.set("require_requested_scopes","true");
      url.searchParams.set("show_keypair_step","true");
      return json({ok:true,url:url.toString()});
    }

    if(body?.action==="disconnect"){
      const {error}=await admin().from("provider_credentials").delete().eq("user_id",userId).eq("provider","tesla");
      if(error)throw new Error("credential_store_failed");
      return json({ok:true,message:"Tesla-Verbindung wurde entfernt."});
    }

    const stored=await loadTokens(userId);
    if(!stored)return json({ok:true,connected:false,ready:false,vehicleCount:0,pairedVehicleCount:0,message:"Tesla ist noch nicht verbunden."});
    const tokens=await validTokens(userId,stored);

    if(body?.action==="status"){
      const list=await vehicles(tokens);
      const vins=list.map(vinOf).filter((vin):vin is string=>Boolean(vin));
      const status=await fleetStatus(tokens,vins);
      const proxyConfigured=Boolean(optionalEnv("TESLA_COMMAND_PROXY_URL"));
      const ready=proxyConfigured&&status.paired.length>0;
      return json({
        ok:true,
        connected:true,
        ready,
        vehicleCount:vins.length,
        pairedVehicleCount:status.paired.length,
        ...(!ready?{pairingUrl:pairingUrl(vins.length===1?vins[0]:undefined)}:{}),
        message:ready
          ?"Tesla ist für sichere Fahrzeugbefehle bereit."
          :proxyConfigured
            ?"Tesla ist angemeldet. Der virtuelle Fahrzeugschlüssel muss noch gekoppelt werden."
            :"Tesla ist angemeldet; der signierende Vehicle-Command-Proxy ist serverseitig noch nicht konfiguriert."
      });
    }

    if(body?.action==="execute"){
      const operation=String(body.operation??"");
      if(!["vehicle.lock","vehicle.unlock","vehicle.rear-trunk.close"].includes(operation)){
        return json({ok:false,code:"UNSUPPORTED_OPERATION",message:"Diese Tesla-Aktion ist nicht freigegeben."},422);
      }
      const selected=await chooseVehicle(tokens,typeof body.vehicle==="string"?body.vehicle:undefined);
      const vin=vinOf(selected);
      if(!vin)throw new Error("tesla_vehicle_not_found");

      if(operation==="vehicle.rear-trunk.close"){
        const stateResponse=await teslaFetch(tokens,`/api/1/vehicles/${encodeURIComponent(vin)}/vehicle_data`);
        const statePayload=await stateResponse.json().catch(()=>null) as any;
        if(!stateResponse.ok)return json({ok:false,code:"TESLA_STATE_UNAVAILABLE",message:"Der Kofferraumzustand konnte nicht sicher geprüft werden."},409);
        const rear=statePayload?.response?.vehicle_state?.rt;
        if(rear===0)return json({ok:true,message:"Der Heckkofferraum ist bereits geschlossen."});
        if(rear!==1)return json({ok:false,code:"TESLA_TRUNK_STATE_UNKNOWN",message:"Der Heckkofferraumzustand ist unklar; es wird kein Umschaltbefehl gesendet."},409);
        const result=await command(tokens,vin,"actuate_trunk",{which_trunk:"rear"});
        if(!result.ok)return json({ok:false,code:result.status===408?"TESLA_VEHICLE_ASLEEP":"TESLA_COMMAND_REJECTED",message:result.message},result.status||502);
        const verify=await teslaFetch(tokens,`/api/1/vehicles/${encodeURIComponent(vin)}/vehicle_data`);
        const verifyPayload=await verify.json().catch(()=>null) as any;
        if(!verify.ok||verifyPayload?.response?.vehicle_state?.rt!==0){
          return json({ok:false,code:"TESLA_COMMAND_NOT_CONFIRMED",message:"Tesla hat den Befehl angenommen, aber der geschlossene Zustand konnte nicht bestätigt werden."},409);
        }
        return json({ok:true,message:"Der Heckkofferraum wurde geschlossen und bestätigt."});
      }

      const path=operation==="vehicle.lock"?"door_lock":"door_unlock";
      const result=await command(tokens,vin,path,{});
      return result.ok
        ? json({ok:true,message:operation==="vehicle.lock"?"Tesla wurde verriegelt.":"Tesla wurde entriegelt."})
        : json({ok:false,code:result.status===408?"TESLA_VEHICLE_ASLEEP":"TESLA_COMMAND_REJECTED",message:result.message},result.status||502);
    }

    return json({ok:false,code:"UNKNOWN_ACTION",message:"Unbekannte Connector-Aktion."},400);
  }catch(error){
    return json({ok:false,code:errorCode(error),message:"Der sichere Tesla-Connector konnte die Anfrage nicht abschließen."},502);
  }
});
