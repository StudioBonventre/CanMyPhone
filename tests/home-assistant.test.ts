import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHomeAssistantAuthorizationUrl,
  createHomeAssistantConnectorAdapter,
  HomeAssistantApiClient,
  homeAssistantWebSocketCommands,
  normalizeHomeAssistantBaseUrl
} from "../src/automation/homeAssistantApi";
import {
  discoverHomeAssistantEntities,
  homeAssistantCapabilitiesForState,
  homeAssistantServiceCallForRequest,
  type HomeAssistantState
} from "../src/automation/homeAssistantModel";
import { normalizeHomeAssistantStateChangedEvent } from "../src/automation/homeAssistantEvents";

const state = (entity_id: string, value: string, attributes: Record<string, unknown>): HomeAssistantState => ({
  entity_id,
  state: value,
  attributes
});

test("Home Assistant URL policy allows local HTTP but requires HTTPS remotely",()=>{
  assert.equal(normalizeHomeAssistantBaseUrl("http://homeassistant.local:8123/"),"http://homeassistant.local:8123");
  assert.equal(normalizeHomeAssistantBaseUrl("https://ha.example.com/"),"https://ha.example.com");
  assert.throws(()=>normalizeHomeAssistantBaseUrl("http://ha.example.com"),/REMOTE_HTTPS/);
  assert.throws(()=>normalizeHomeAssistantBaseUrl("https://user:pass@ha.example.com"),/URL_INVALID/);
});

test("Home Assistant OAuth builder preserves instance, state and native redirect",()=>{
  const url=new URL(buildHomeAssistantAuthorizationUrl({
    baseUrl:"https://ha.example.com",
    clientId:"https://studiobonventre.com",
    redirectUri:"canmyphone://home-assistant",
    state:"opaque-state"
  }));
  assert.equal(url.pathname,"/auth/authorize");
  assert.equal(url.searchParams.get("client_id"),"https://studiobonventre.com");
  assert.equal(url.searchParams.get("redirect_uri"),"canmyphone://home-assistant");
  assert.equal(url.searchParams.get("state"),"opaque-state");
});

test("Home Assistant capability discovery uses actual entity features",()=>{
  const light=homeAssistantCapabilitiesForState(state("light.flur","on",{supported_color_modes:["color_temp"]}));
  assert.deepEqual(new Set(light),new Set(["light.power.set","light.brightness.set","light.color-temperature.set"]));
  assert.equal(light.includes("light.color.set"),false);

  const switchCaps=homeAssistantCapabilitiesForState(state("switch.kaffeemaschine","off",{}));
  assert.deepEqual(switchCaps,["switch.power.set"]);

  const motion=homeAssistantCapabilitiesForState(state("binary_sensor.flur","off",{device_class:"motion"}));
  assert.deepEqual(motion,["sensor.motion.changed"]);
});

test("Home Assistant entity discovery resolves child-device area and stable entity id",()=>{
  const devices=discoverHomeAssistantEntities(
    [state("light.flur","on",{friendly_name:"Flurlicht",supported_color_modes:["brightness"]})],
    [{ei:"light.flur",pl:"hue",di:"child"}],
    [{area_id:"hall",name:"Flur"}],
    [
      {id:"parent",area_id:"hall",parent_device_id:null,name:"Bridge"},
      {id:"child",area_id:null,parent_device_id:"parent",name:"Light"}
    ],
    "2026-09-30T00:00:00Z"
  );
  assert.equal(devices.length,1);
  assert.equal(devices[0]?.room,"Flur");
  assert.equal(devices[0]?.paths?.[0]?.providerDeviceId,"light.flur");
  assert.equal(devices[0]?.metadata?.platform,"hue");
});

test("Home Assistant actions target resolved entity ids through real service calls",()=>{
  const call=homeAssistantServiceCallForRequest({
    automationId:"a",
    providerId:"home-assistant",
    capabilityId:"light.brightness.set",
    providerDeviceId:"light.flur",
    parameters:{percent:35}
  });
  assert.deepEqual(call,{
    domain:"light",
    service:"turn_on",
    serviceData:{entity_id:"light.flur",brightness_pct:35}
  });
  assert.equal(homeAssistantServiceCallForRequest({
    automationId:"a",providerId:"home-assistant",capabilityId:"light.brightness.set",parameters:{percent:35}
  }),null);
});

test("Home Assistant API uses authenticated service endpoint, never state mutation",async()=>{
  const calls:{url:string;method:string;authorization:string|null;body:string}[]=[];
  const api=new HomeAssistantApiClient({
    baseUrl:"https://ha.example.com",
    getAccessToken:async()=>"access-token",
    fetcher:async(input,init)=>{
      calls.push({
        url:String(input),
        method:String(init?.method??"GET"),
        authorization:new Headers(init?.headers).get("Authorization"),
        body:String(init?.body??"")
      });
      return new Response(JSON.stringify([]),{status:200,headers:{"Content-Type":"application/json"}});
    }
  });
  const adapter=createHomeAssistantConnectorAdapter(api);
  const result=await adapter.execute({
    automationId:"a",
    providerId:"home-assistant",
    capabilityId:"switch.power.set",
    providerDeviceId:"switch.coffee",
    parameters:{on:true}
  });
  assert.equal(result.ok,true);
  assert.equal(calls[0]?.url,"https://ha.example.com/api/services/switch/turn_on");
  assert.equal(calls[0]?.authorization,"Bearer access-token");
  assert.equal(calls[0]?.url.includes("/api/states/"),false);
});

test("Home Assistant websocket commands use official registry and state event commands",()=>{
  assert.deepEqual(homeAssistantWebSocketCommands.areas(1),{id:1,type:"config/area_registry/list"});
  assert.deepEqual(homeAssistantWebSocketCommands.devices(2),{id:2,type:"config/device_registry/list"});
  assert.deepEqual(homeAssistantWebSocketCommands.entitiesForDisplay(3),{id:3,type:"config/entity_registry/list_for_display"});
  assert.deepEqual(homeAssistantWebSocketCommands.subscribeStateChanged(4),{id:4,type:"subscribe_events",event_type:"state_changed"});
});

test("Home Assistant motion state change normalizes to universal provider event",()=>{
  const receivedAt="2026-09-30T00:00:01Z";
  const event=normalizeHomeAssistantStateChangedEvent({
    type:"event",
    event:{
      event_type:"state_changed",
      time_fired:"2026-09-30T00:00:00Z",
      data:{
        entity_id:"binary_sensor.flur",
        new_state:state("binary_sensor.flur","on",{device_class:"motion"})
      },
      context:{id:"ctx-1"}
    }
  },"install-1",receivedAt,{
    deviceId:"home-assistant:binary_sensor.flur",
    providerId:"home-assistant",
    name:"Bewegung Flur",
    room:"Flur",
    capabilities:["sensor.motion.changed"],
    observedAt:receivedAt
  });
  assert.ok(event);
  assert.equal(event?.capabilityId,"sensor.motion.changed");
  assert.equal(event?.deviceId,"binary_sensor.flur");
  assert.equal(event?.room,"Flur");
  assert.deepEqual(event?.normalizedPayload,{value:true});
});
