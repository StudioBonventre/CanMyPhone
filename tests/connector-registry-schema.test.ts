import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { readyManifest } from "./helpers/connectorFixture";

test("connector migration executes in PostgreSQL and enforces RLS, provenance and lifecycle", async t => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;");
    await db.exec(readFileSync(new URL("../supabase/migrations/20260926210000_connector_registry.sql", import.meta.url), "utf8"));
    await t.test("all registry tables have RLS and no client write grants", async () => {
      const result = await db.query<{ relname: string; relrowsecurity: boolean }>("select relname,relrowsecurity from pg_class where relname in ('connector_providers','connector_manifests','connector_sources','connector_verification_runs')");
      assert.equal(result.rows.length, 4);
      assert.ok(result.rows.every(row => row.relrowsecurity));
      for (const role of ["anon", "authenticated"]) for (const table of result.rows.map(row => row.relname)) {
        const grants = await db.query<{ allowed: boolean }>("select has_table_privilege($1,$2,'INSERT,UPDATE,DELETE') as allowed", [role, `public.${table}`]);
        assert.equal(grants.rows[0].allowed, false);
      }
    });
    await db.exec("set role service_role");
    const provider = await db.query<{ id: string }>("insert into public.connector_providers(provider_key,display_name,category,ecosystem_type,status,commercial_status) values('example','Example','light','DYNAMIC','CANDIDATE','ALLOWED') returning id");
    const id = provider.rows[0].id;
    const manifest = readyManifest();
    await t.test("READY without official provenance is rejected", async () => {
      await assert.rejects(db.query("insert into public.connector_manifests(provider_id,manifest_version,manifest,verification_state,active) values($1,2,$2,'READY',true)", [id, JSON.stringify(manifest)]), /official verified source required/);
    });
    await db.query("insert into public.connector_sources(provider_id,url,source_type,official,verified_at) values($1,$2,'OFFICIAL_DOCS',true,now())", [id, manifest.documentationSources[0].url]);
    await t.test("missing gate is rejected despite official source", async () => {
      const incomplete = { ...manifest, verification: { ...manifest.verification, inputSchema: false } };
      await assert.rejects(db.query("insert into public.connector_manifests(provider_id,manifest_version,manifest,verification_state,active) values($1,2,$2,'READY',true)", [id, JSON.stringify(incomplete)]), /verification gate missing/);
    });
    await db.query("insert into public.connector_manifests(provider_id,manifest_version,manifest,verification_state,active) values($1,2,$2,'READY',true)", [id, JSON.stringify(manifest)]);
    await db.query("insert into public.connector_verification_runs(provider_id,manifest_version,result,gates,reviewer) values($1,2,'PASSED',$2,'test-reviewer')", [id, JSON.stringify(manifest.verification)]);
    await t.test("candidate cannot skip lifecycle stages", async () => {
      await assert.rejects(db.query("update public.connector_providers set status='READY',version=2 where id=$1", [id]), /lifecycle/);
    });
    await db.query("update public.connector_providers set status='VALIDATING',version=2 where id=$1", [id]);
    await db.query("update public.connector_providers set status='VERIFIED',version=3 where id=$1", [id]);
    await db.query("update public.connector_providers set status='READY',version=4 where id=$1", [id]);
    await t.test("authenticated users read published metadata and manifest but cannot promote", async () => {
      await db.exec("reset role; set role authenticated");
      assert.equal((await db.query("select * from public.connector_manifests")).rows.length, 1);
      await assert.rejects(db.query("update public.connector_providers set status='READY',version=5"), /permission denied/);
      await assert.rejects(db.query("select * from public.connector_verification_runs"), /permission denied/);
    });
    await t.test("anonymous clients cannot read registry", async () => {
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select * from public.connector_providers"), /permission denied/);
    });
    await t.test("commercial revocation hides manifests and preserves audit history", async () => {
      await db.exec("reset role; set role service_role");
      await db.query("update public.connector_providers set status='BLOCKED',commercial_status='BLOCKED',version=5 where id=$1", [id]);
      await db.exec("reset role; set role authenticated");
      assert.equal((await db.query("select * from public.connector_manifests")).rows.length, 0);
      const metadata = await db.query<{ status: string }>("select status from public.connector_providers");
      assert.equal(metadata.rows[0].status, "BLOCKED");
    });
  } finally { await db.close(); }
});
