import test from "node:test";
import assert from "node:assert/strict";
import {
  HOMEMATIC_CONNECT_API_VERSION,
  HOMEMATIC_PLUGIN_ID,
  HMIP_PATHS,
  buildHomematicClimateCommand,
  buildHomematicCoverCommand,
  buildHomematicLightCommand,
  homematicConfirmTokenBody,
  homematicHcuHost,
  homematicPairingHeaders,
  homematicPairingURL,
  homematicRequestTokenBody,
  homematicSystemRequest,
  homematicWebSocketHeaders,
  homematicWebSocketURL,
  parseHomematicState,
  resolveHomematicCoverTargets,
  resolveHomematicHeatingTarget,
  resolveHomematicLightTargets
} from "../src/automation/homematicConnectApi";

const state = parseHomematicState({
  devices: {
    shutter: {
      id: "device-shutter",
      label: "Fenster Süd",
      functionalChannels: {
        "4": { index: 4, functionalChannelType: "SHUTTER_CHANNEL" }
      }
    },
    light: {
      id: "device-light",
      label: "Deckenlicht",
      functionalChannels: [
        { index: 3, functionalChannelType: "DIMMER_CHANNEL" }
      ]
    }
  },
  groups: [
    {
      id: "meta-living",
      label: "Wohnzimmer",
      type: "META",
      channels: [
        { deviceId: "device-shutter", channelIndex: 0 },
        { deviceId: "device-light", channelIndex: 0 }
      ]
    },
    {
      id: "heat-living",
      label: "Wohnzimmer Heizung",
      type: "HEATING",
      metaGroupId: "meta-living",
      channels: []
    }
  ]
});

test("Homematic pairing uses the documented local HCU endpoints and VERSION header",()=>{
  const host=homematicHcuHost("aB1d");
  assert.equal(host,"hcu1-AB1D.local");
  assert.equal(homematicPairingURL(host,"request"),"https://hcu1-AB1D.local:6969/hmip/auth/requestConnectApiAuthToken");
  assert.equal(homematicPairingURL(host,"confirm"),"https://hcu1-AB1D.local:6969/hmip/auth/confirmConnectApiAuthToken");
  assert.deepEqual(homematicPairingHeaders(),{"Content-Type":"application/json",VERSION:HOMEMATIC_CONNECT_API_VERSION});
  assert.deepEqual(homematicRequestTokenBody("key"),{activationKey:"key",pluginId:HOMEMATIC_PLUGIN_ID,friendlyName:{de:"CanMyPhone",en:"CanMyPhone"}});
  assert.deepEqual(homematicConfirmTokenBody("key","token"),{activationKey:"key",authToken:"token"});
  assert.throws(()=>homematicHcuHost("12-!"),/INVALID/);
});

test("Homematic websocket configuration stays local and sends only official auth headers",()=>{
  assert.equal(homematicWebSocketURL("hcu1-1234.local"),"wss://hcu1-1234.local:9001");
  assert.deepEqual(homematicWebSocketHeaders("secret"),{
    authtoken:"secret",
    "plugin-id":HOMEMATIC_PLUGIN_ID,
    "hmip-system-events":"true"
  });
});

test("Homematic system requests are allow-listed and correlated by caller supplied id",()=>{
  assert.deepEqual(
    homematicSystemRequest("req-1",HMIP_PATHS.stateForClient,{}),
    {
      id:"req-1",
      type:"HMIP_SYSTEM_REQUEST",
      pluginId:HOMEMATIC_PLUGIN_ID,
      body:{path:HMIP_PATHS.stateForClient,body:{}}
    }
  );
  assert.throws(()=>homematicSystemRequest("req-2","/hmip/private/arbitrary",{}),/ALLOWLISTED/);
});

test("Homematic room discovery resolves functional channels without guessing device ids",()=>{
  assert.ok(state);
  const covers=resolveHomematicCoverTargets(state!,"Wohnzimmer","Fenster Süd");
  assert.deepEqual(covers,[{kind:"device-channel",deviceId:"device-shutter",channelIndex:4}]);
  const lights=resolveHomematicLightTargets(state!,"Wohnzimmer","Deckenlicht");
  assert.deepEqual(lights,[{kind:"device-channel",deviceId:"device-light",channelIndex:3}]);
  assert.deepEqual(resolveHomematicCoverTargets(state!,"Schlafzimmer"),[]);
});

test("Homematic shutter semantics map open to zero and closed to one",()=>{
  assert.ok(state);
  const target=resolveHomematicCoverTargets(state!,"Wohnzimmer","Fenster Süd")[0]!;
  assert.deepEqual(buildHomematicCoverCommand(target,true),{
    path:HMIP_PATHS.setShutterLevel,
    body:{deviceId:"device-shutter",channelIndex:4,shutterLevel:0}
  });
  assert.deepEqual(buildHomematicCoverCommand(target,false),{
    path:HMIP_PATHS.setShutterLevel,
    body:{deviceId:"device-shutter",channelIndex:4,shutterLevel:1}
  });
});

test("Homematic light commands choose switch or dim endpoint from the requested value",()=>{
  assert.ok(state);
  const target=resolveHomematicLightTargets(state!,"Wohnzimmer","Deckenlicht")[0]!;
  assert.equal(buildHomematicLightCommand(target,"an").path,HMIP_PATHS.setSwitchState);
  assert.deepEqual(buildHomematicLightCommand(target,"35%"),{
    path:HMIP_PATHS.setDimLevel,
    body:{deviceId:"device-light",channelIndex:3,dimLevel:0.35}
  });
  assert.throws(()=>buildHomematicLightCommand(target,"150%"),/INVALID/);
});

test("Homematic climate resolves the room heating group and never targets a guessed thermostat",()=>{
  assert.ok(state);
  const target=resolveHomematicHeatingTarget(state!,"Wohnzimmer");
  assert.deepEqual(target,{kind:"heating-group",groupId:"heat-living"});
  assert.deepEqual(buildHomematicClimateCommand(target!,"21,5 °C"),{
    path:HMIP_PATHS.setSetPointTemperature,
    body:{groupId:"heat-living",setPointTemperature:21.5}
  });
});
