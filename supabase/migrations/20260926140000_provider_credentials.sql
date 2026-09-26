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
