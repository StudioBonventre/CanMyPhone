-- Public metadata only. OAuth tokens, API keys and device inventories do not belong here.
create schema if not exists connector_private;
revoke all on schema connector_private from public, anon, authenticated;
grant usage on schema connector_private to service_role;

create table public.connector_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique check (provider_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(provider_key) <= 80),
  display_name text not null check (length(display_name) between 1 and 160),
  category text not null,
  ecosystem_type text not null check (ecosystem_type in ('ECOSYSTEM','DIRECT','DYNAMIC')),
  status text not null default 'DISCOVERED' check (status in ('DISCOVERED','CANDIDATE','CANDIDATE_LEGAL_REVIEW_REQUIRED','VALIDATING','VERIFIED','READY','DEPRECATED','BLOCKED')),
  commercial_status text not null default 'UNKNOWN' check (commercial_status in ('ALLOWED','PARTNER_APPROVAL_REQUIRED','PERSONAL_USE_ONLY','UNKNOWN','BLOCKED')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_verified_at timestamptz,
  check (status <> 'READY' or commercial_status = 'ALLOWED')
);
create table public.connector_manifests (
  provider_id uuid not null references public.connector_providers(id) on delete restrict,
  manifest_version integer not null check (manifest_version > 0),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  verification_state text not null check (verification_state in ('DISCOVERED','CANDIDATE','CANDIDATE_LEGAL_REVIEW_REQUIRED','VALIDATING','VERIFIED','READY','DEPRECATED','BLOCKED')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (provider_id, manifest_version),
  check (not active or verification_state = 'READY'),
  check (not (manifest ?| array['credentials','tokens','secrets','code','endpoint','requestUrl']))
);
create unique index connector_one_active_manifest on public.connector_manifests(provider_id) where active;
create table public.connector_sources (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.connector_providers(id) on delete restrict,
  url text not null check (url ~ '^https://[^/@[:space:]]+(/|$)'),
  source_type text not null check (source_type in ('OFFICIAL_DOCS','OFFICIAL_OPENAPI','OFFICIAL_SDK','OFFICIAL_GITHUB','OFFICIAL_MANIFEST','COMMUNITY_HINT')),
  official boolean not null default false, retrieved_at timestamptz not null default now(), verified_at timestamptz, api_version text,
  unique(provider_id, url), check (not official or source_type <> 'COMMUNITY_HINT')
);
create table public.connector_verification_runs (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null,
  manifest_version integer not null, result text not null check (result in ('PASSED','FAILED')),
  gates jsonb not null check (jsonb_typeof(gates) = 'object'), reviewer text not null,
  created_at timestamptz not null default now(),
  foreign key (provider_id, manifest_version) references public.connector_manifests(provider_id, manifest_version) on delete restrict
);
create index connector_verification_provider_version_idx on public.connector_verification_runs(provider_id, manifest_version);

-- This guard is invoker-rights. Only the backend can write tables or execute these functions.
create function connector_private.guard_manifest() returns trigger language plpgsql set search_path = '' as $$
declare p public.connector_providers%rowtype; op jsonb; source_url text; gate text;
begin
  select * into strict p from public.connector_providers where id = new.provider_id;
  if new.manifest->>'providerId' is distinct from p.provider_key
     or (new.manifest->>'connectorVersion')::integer is distinct from new.manifest_version
     or new.manifest->>'lifecycle' is distinct from new.verification_state then
    raise exception 'manifest identity/version/state mismatch';
  end if;
  if tg_op = 'UPDATE' and (new.manifest is distinct from old.manifest or new.manifest_version <> old.manifest_version or new.provider_id <> old.provider_id) then
    raise exception 'manifest versions are immutable; publish a new version';
  end if;
  if new.verification_state = 'READY' then
    if p.commercial_status <> 'ALLOWED' or new.manifest->>'commercialUseStatus' is distinct from 'ALLOWED' then raise exception 'commercial approval required'; end if;
    foreach gate in array array['documentation','authentication','endpointAllowlist','inputSchema','outputSchema','riskClassification','terms','connectorTests'] loop
      if new.manifest->'verification'->gate is distinct from 'true'::jsonb then raise exception 'verification gate missing: %', gate; end if;
    end loop;
    if jsonb_typeof(new.manifest->'actions') is distinct from 'array' or jsonb_typeof(new.manifest->'triggers') is distinct from 'array' then raise exception 'capability schemas missing'; end if;
    if jsonb_array_length(new.manifest->'actions') + jsonb_array_length(new.manifest->'triggers') = 0 then raise exception 'no capabilities'; end if;
    for op in select value from jsonb_array_elements(new.manifest->'actions') loop
      if jsonb_typeof(op->'inputSchema') is distinct from 'object' or jsonb_typeof(op->'resultSchema') is distinct from 'object'
         or jsonb_typeof(op->'sourceUrls') is distinct from 'array' then raise exception 'operation schema/provenance required'; end if;
      if jsonb_array_length(op->'sourceUrls') = 0 then raise exception 'operation provenance required'; end if;
      if op->>'risk' = 'HIGH' and op->'confirmationRequired' is distinct from 'true'::jsonb then raise exception 'sensitive approval required'; end if;
      for source_url in select jsonb_array_elements_text(op->'sourceUrls') loop
        if not exists (select 1 from public.connector_sources s where s.provider_id = new.provider_id and s.url = source_url and s.official and s.verified_at is not null) then raise exception 'official verified source required'; end if;
      end loop;
    end loop;
    for source_url in select jsonb_array_elements_text(new.manifest->'triggers') union all select jsonb_array_elements_text(coalesce(new.manifest->'conditions','[]'::jsonb)) loop
      if jsonb_typeof(new.manifest->'eventSchemas'->source_url) is distinct from 'object'
         or jsonb_typeof(new.manifest->'capabilitySources'->source_url) is distinct from 'array' then raise exception 'event schema/provenance required'; end if;
      if jsonb_array_length(new.manifest->'capabilitySources'->source_url) = 0 then raise exception 'event provenance required'; end if;
      if exists (select 1 from jsonb_array_elements_text(new.manifest->'capabilitySources'->source_url) u(url)
        where not exists (select 1 from public.connector_sources s where s.provider_id = new.provider_id and s.url = u.url and s.official and s.verified_at is not null)) then raise exception 'official event source required'; end if;
    end loop;
  end if;
  return new;
end $$;
create trigger connector_manifest_guard before insert or update on public.connector_manifests for each row execute function connector_private.guard_manifest();

create function connector_private.guard_provider() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.provider_key <> old.provider_key or new.version <= old.version then raise exception 'provider identity immutable; version must increase'; end if;
    if new.status <> old.status and new.status not in ('BLOCKED','DEPRECATED') and not (
      (old.status = 'DISCOVERED' and new.status in ('CANDIDATE','CANDIDATE_LEGAL_REVIEW_REQUIRED')) or
      (old.status in ('CANDIDATE_LEGAL_REVIEW_REQUIRED','BLOCKED','DEPRECATED') and new.status = 'CANDIDATE') or
      (old.status = 'CANDIDATE' and new.status = 'VALIDATING') or
      (old.status = 'VALIDATING' and new.status in ('VERIFIED','CANDIDATE')) or
      (old.status = 'VERIFIED' and new.status = 'READY') or
      (old.status = 'READY' and new.status = 'VALIDATING')
    ) then raise exception 'invalid registry lifecycle transition'; end if;
    new.updated_at = now();
  end if;
  if new.status = 'READY' then
    if tg_op = 'INSERT' then raise exception 'create a candidate before promotion'; end if;
    if old.status not in ('VERIFIED','READY') then raise exception 'verified lifecycle required'; end if;
    if not exists (select 1 from public.connector_manifests m where m.provider_id = new.id and m.active and m.verification_state = 'READY') then raise exception 'active verified manifest required'; end if;
    if not exists (select 1 from public.connector_verification_runs v join public.connector_manifests m using(provider_id,manifest_version)
      where v.provider_id = new.id and m.active and v.result = 'PASSED') then raise exception 'passed audit required'; end if;
  end if;
  return new;
end $$;
create trigger connector_provider_guard before insert or update on public.connector_providers for each row execute function connector_private.guard_provider();

create function connector_private.guard_source_change() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.connector_providers p where p.id = old.provider_id and p.status = 'READY') then
    raise exception 'disable provider before changing verified sources';
  end if;
  return new;
end $$;
create trigger connector_source_guard before update on public.connector_sources for each row execute function connector_private.guard_source_change();

alter table public.connector_providers enable row level security;
alter table public.connector_manifests enable row level security;
alter table public.connector_sources enable row level security;
alter table public.connector_verification_runs enable row level security;
revoke all on public.connector_providers, public.connector_manifests, public.connector_sources, public.connector_verification_runs from public, anon, authenticated;
grant select on public.connector_providers, public.connector_manifests, public.connector_sources to authenticated;
grant select, insert, update on public.connector_providers, public.connector_manifests, public.connector_sources to service_role;
grant select, insert on public.connector_verification_runs to service_role;
revoke all on all functions in schema connector_private from public, anon, authenticated;
grant execute on all functions in schema connector_private to service_role;
create policy connector_provider_metadata_read on public.connector_providers for select to authenticated using (true);
create policy connector_ready_manifest_read on public.connector_manifests for select to authenticated using (
  active and verification_state = 'READY' and exists (select 1 from public.connector_providers p where p.id = provider_id and p.status = 'READY' and p.commercial_status = 'ALLOWED')
);
create policy connector_official_sources_read on public.connector_sources for select to authenticated using (
  official and verified_at is not null and exists (select 1 from public.connector_providers p where p.id = provider_id and p.status = 'READY' and p.commercial_status = 'ALLOWED')
);
comment on table public.connector_providers is 'Global, non-secret provider metadata. Mobile clients can read but never promote or change commercial policy.';
comment on table public.connector_manifests is 'Immutable declarative versions; device credentials and AI-generated executable code are prohibited. Capabilities and schemas are embedded in manifest JSONB.';
comment on table public.connector_verification_runs is 'Append-only backend audit. Not readable or writable by mobile clients.';
