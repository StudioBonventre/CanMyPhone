create table if not exists public.provider_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('tesla')),
  credential_ciphertext text not null,
  credential_nonce text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.provider_credentials enable row level security;

revoke all on table public.provider_credentials from anon, authenticated;
grant select, insert, update, delete on table public.provider_credentials to service_role;

comment on table public.provider_credentials is
  'Server-only encrypted provider credentials. Client roles intentionally have no table privileges.';


create table if not exists public.native_execution_grants (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('tesla')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.native_execution_grants enable row level security;

revoke all on table public.native_execution_grants from anon, authenticated;
grant select, insert, update, delete on table public.native_execution_grants to service_role;

create index if not exists native_execution_grants_user_provider_idx
  on public.native_execution_grants (user_id, provider);

comment on table public.native_execution_grants is
  'Server-only hashes of revocable device execution grants. Plaintext grant tokens are never stored server-side.';
