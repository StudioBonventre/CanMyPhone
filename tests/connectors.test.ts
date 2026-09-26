import test from "node:test";
import assert from "node:assert/strict";
import { bindProvider, PROVIDER_REGISTRY } from "../src/automation/providerRegistry";
import { connectorSetupPlan } from "../src/automation/connectorSetup";
import { connectorRequirementForStep } from "../src/automation/connectorPlanning";
import { ConnectorRuntime } from "../src/automation/connectorRuntime";
import { createTeslaConnectorAdapter, createHomematicIPConnectorAdapter } from "../src/automation/connectorAdapters";
import { buildTeslaAuthorizationURL, buildTeslaVirtualKeyPairingURL, TESLA_DEFAULT_SCOPES } from "../src/automation/teslaAuth";

test("connector catalogue has stable unique ids and explicit implementation state",()=>{
  assert.equal(new Set(PROVIDER_REGISTRY.map((item)=>item.id)).size,PROVIDER_REGISTRY.length);
  for(const provider of PROVIDER_REGISTRY){
    assert.ok(provider.operations.length);
    assert.ok(["READY","CONNECTOR_NEEDED","PLANNED"].includes(provider.implementation));
    assert.ok(provider.authKind);
  }
});

test("connector setup plans only claim implemented connectors are executable",()=>{
  for(const provider of PROVIDER_REGISTRY){
    const plan=connectorSetupPlan(provider.id);
    assert.ok(plan);
    assert.equal(plan?.executableToday,provider.implementation==="READY");
    assert.ok(plan?.steps.length);
  }
});

test("Tesla OAuth builder requests only the configured explicit scopes",()=>{
  const url=new URL(buildTeslaAuthorizationURL({
    clientId:"client-123",
    redirectUri:"https://example.com/auth/callback",
    state:"state-123",
    locale:"de-DE",
    showKeypairStep:true
  }));
  assert.equal(url.origin,"https://auth.tesla.com");
  assert.equal(url.searchParams.get("response_type"),"code");
  assert.equal(url.searchParams.get("scope"),TESLA_DEFAULT_SCOPES.join(" "));
  assert.equal(url.searchParams.get("show_keypair_step"),"true");
  assert.equal(url.searchParams.get("state"),"state-123");
});

test("Tesla auth rejects unsafe non-HTTPS redirect URIs",()=>{
  assert.throws(()=>buildTeslaAuthorizationURL({
    clientId:"client",
    redirectUri:"canmyphone://callback",
    state:"state"
  }),/HTTPS/);
});

test("Tesla virtual-key pairing link only accepts a bare developer domain",()=>{
  assert.equal(
    buildTeslaVirtualKeyPairingURL("example.com","VIN123"),
    "https://www.tesla.com/_ak/example.com?vin=VIN123"
  );
  assert.throws(()=>buildTeslaVirtualKeyPairingURL("example.com/path"),/INVALID/);
});

test("connector runtime dispatches only to the registered provider adapter",async()=>{
  let locked=0;
  const runtime=new ConnectorRuntime([
    createTeslaConnectorAdapter({
      lockVehicle:async()=>{locked+=1;return {ok:true as const};},
      unlockVehicle:async()=>({ok:true as const}),
      closeRearTrunk:async()=>({ok:true as const})
    })
  ]);
  const ok=await runtime.execute({
    automationId:"cmp_auto_test",
    providerId:"tesla",
    capabilityId:"vehicle.lock",
    parameters:{brand:"Tesla"}
  });
  assert.equal(ok.ok,true);
  assert.equal(locked,1);
  const missing=await runtime.execute({
    automationId:"cmp_auto_test",
    providerId:"homematic-ip",
    capabilityId:"smart-home.cover.open",
    parameters:{room:"Wohnzimmer"}
  });
  assert.equal(missing.ok,false);
  if(!missing.ok)assert.equal(missing.code,"CONNECTOR_ADAPTER_MISSING");
});

test("Homematic adapter routes room-aware cover operations",async()=>{
  let room="";
  const runtime=new ConnectorRuntime([
    createHomematicIPConnectorAdapter({
      openCover:async(value)=>{room=value;return {ok:true as const};},
      closeCover:async()=>({ok:true as const}),
      setLight:async()=>({ok:true as const}),
      setClimate:async()=>({ok:true as const})
    })
  ]);
  const result=await runtime.execute({
    automationId:"cmp_auto_test",
    providerId:"homematic-ip",
    capabilityId:"smart-home.cover.open",
    parameters:{room:"Wohnzimmer"}
  });
  assert.equal(result.ok,true);
  assert.equal(room,"Wohnzimmer");
});

test("provider routing prefers a single connected compatible provider",()=>{
  const binding=bindProvider("smart-home.cover.open",{room:"Wohnzimmer"},new Set(["homematic-ip"]));
  assert.equal(binding.status,"BOUND");
  if(binding.status==="BOUND")assert.equal(binding.provider.id,"homematic-ip");
});


test("Tesla rear-trunk routing never aliases to vehicle lock",async()=>{
  const requirement=connectorRequirementForStep(
    {capabilityId:"tesla.rear-trunk.close",parameters:{expectedState:"open"}},
    new Set(["tesla"])
  );
  assert.ok(requirement);
  assert.equal(requirement?.binding.status,"BOUND");
  if(requirement?.binding.status==="BOUND"){
    assert.equal(requirement.binding.provider.id,"tesla");
    assert.equal(requirement.binding.operation,"vehicle.rear-trunk.close");
  }

  let locked=0;
  let trunkClosed=0;
  const runtime=new ConnectorRuntime([
    createTeslaConnectorAdapter({
      lockVehicle:async()=>{locked+=1;return {ok:true as const};},
      unlockVehicle:async()=>({ok:true as const}),
      closeRearTrunk:async()=>{trunkClosed+=1;return {ok:true as const};}
    })
  ]);
  const result=await runtime.execute({
    automationId:"cmp_auto_trunk",
    providerId:"tesla",
    capabilityId:"tesla.rear-trunk.close",
    parameters:{expectedState:"open"}
  });
  assert.equal(result.ok,true);
  assert.equal(trunkClosed,1);
  assert.equal(locked,0);
});
