export const TESLA_OAUTH_AUTHORIZE_URL = "https://auth.tesla.com/oauth2/v3/authorize";
export const TESLA_DEFAULT_SCOPES = ["openid","offline_access","vehicle_device_data","vehicle_cmds"] as const;

export type TeslaOAuthConfig = {
  clientId: string;
  redirectUri: string;
  state: string;
  locale?: string;
  scopes?: string[];
  nonce?: string;
  showKeypairStep?: boolean;
};

function requireNonEmpty(value:string,label:string){
  if(!value.trim())throw new Error(`TESLA_${label}_REQUIRED`);
}

export function buildTeslaAuthorizationURL(config:TeslaOAuthConfig):string{
  requireNonEmpty(config.clientId,"CLIENT_ID");
  requireNonEmpty(config.redirectUri,"REDIRECT_URI");
  requireNonEmpty(config.state,"STATE");
  const redirect=new URL(config.redirectUri);
  if(redirect.protocol!=="https:")throw new Error("TESLA_REDIRECT_MUST_BE_HTTPS");

  const scopes=config.scopes?.length?config.scopes:[...TESLA_DEFAULT_SCOPES];
  const params=new URLSearchParams({
    response_type:"code",
    client_id:config.clientId,
    redirect_uri:config.redirectUri,
    scope:scopes.join(" "),
    state:config.state,
    prompt_missing_scopes:"true",
    require_requested_scopes:"true"
  });
  if(config.locale)params.set("locale",config.locale);
  if(config.nonce)params.set("nonce",config.nonce);
  if(config.showKeypairStep)params.set("show_keypair_step","true");
  return `${TESLA_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export function buildTeslaVirtualKeyPairingURL(developerDomain:string,vin?:string):string{
  const domain=developerDomain.trim().replace(/^https?:\/\//,"").replace(/\/$/,"");
  if(!domain||domain.includes("/"))throw new Error("TESLA_DEVELOPER_DOMAIN_INVALID");
  const url=new URL(`https://www.tesla.com/_ak/${domain}`);
  if(vin?.trim())url.searchParams.set("vin",vin.trim());
  return url.toString();
}
