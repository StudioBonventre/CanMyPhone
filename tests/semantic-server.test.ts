import test from "node:test";
import assert from "node:assert/strict";
import { validateSemanticEnvelope } from "../supabase/functions/_shared/semantic-core";
import { createSemanticServerClient } from "../src/automation/semanticServerClient";

test("server semantic validation rejects invented capabilities",()=>{
  const result=validateSemanticEnvelope({
    kind:"automation",
    confidence:0.99,
    trigger:{capabilityId:"trigger.magic",parameters:{}},
    actions:[{capabilityId:"system.private",parameters:{}}],
    clarificationQuestion:null,
    suggestion:null
  });
  assert.equal(result.ok,false);
});

test("server semantic validation accepts provider-neutral multi-brand plans",()=>{
  const result=validateSemanticEnvelope({
    kind:"automation",
    confidence:0.98,
    trigger:{capabilityId:"trigger.location-enter",parameters:{value:"home"}},
    actions:[
      {capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}},
      {capabilityId:"smart-home.cover.open",parameters:{provider:"Homematic IP",room:"Wohnzimmer"}}
    ],
    clarificationQuestion:null,
    suggestion:null
  });
  assert.equal(result.ok,true);
});

test("semantic server client sends only compact planning context and revalidates response",async()=>{
  let sent:any=null;
  const client=createSemanticServerClient({
    supabaseUrl:"https://example.supabase.co",
    publishableKey:"public",
    getAccessToken:async()=> "jwt",
    fetcher:async(_url,init)=>{
      sent=JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        ok:true,
        kind:"automation",
        confidence:0.95,
        trigger:{capabilityId:"trigger.app-opened",parameters:{value:"TikTok"}},
        actions:[{capabilityId:"system.brightness.set",parameters:{percent:100}}],
        clarificationQuestion:null,
        suggestion:null
      }),{status:200});
    }
  });
  const result=await client.interpret("TikTok auf, Bildschirm voll hell",{locale:"de",connectedProviderIds:["tesla"],localNow:"2026-09-26T08:00:00.000Z",timeZone:"Europe/Berlin"});
  assert.equal(result.kind,"understood");
  assert.deepEqual(sent,{goal:"TikTok auf, Bildschirm voll hell",locale:"de",connectedProviderIds:["tesla"],localNow:"2026-09-26T08:00:00.000Z",timeZone:"Europe/Berlin"});
});
