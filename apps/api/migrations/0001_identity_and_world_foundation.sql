create table users (
  id uuid primary key,
  username text not null,
  display_name text not null,
  blocked boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table oauth_identities (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  username text not null,
  groups text[] not null default '{}',
  raw_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (provider, provider_subject)
);

create table sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table spaces (
  id uuid primary key,
  tenant_id uuid not null,
  slug text not null,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (tenant_id, slug)
);

create table rooms (
  id uuid primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (space_id, slug)
);

create table maps (
  id uuid primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  slug text not null,
  name text not null,
  active_version_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (space_id, slug)
);

create table map_versions (
  id uuid primary key,
  map_id uuid not null references maps(id) on delete cascade,
  version_number integer not null,
  status text not null,
  map_document jsonb not null,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null,
  unique (map_id, version_number)
);

alter table maps
  add constraint maps_active_version_id_fkey
  foreign key (active_version_id)
  references map_versions(id);

create table room_memberships (
  id uuid primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null,
  unique (room_id, user_id)
);

create table roles (
  id uuid primary key,
  tenant_id uuid,
  key text not null,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (tenant_id, key)
);

create table permissions (
  id uuid primary key,
  key text not null unique,
  description text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null,
  primary key (role_id, permission_id)
);

create table user_role_assignments (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  space_id uuid references spaces(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  created_at timestamptz not null,
  unique (user_id, role_id, space_id, room_id)
);

create table moderation_events (
  id uuid primary key,
  tenant_id uuid not null,
  actor_user_id uuid references users(id),
  target_user_id uuid references users(id),
  room_id uuid references rooms(id),
  event_type text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create table assets (
  id uuid primary key,
  tenant_id uuid,
  asset_key text not null,
  storage_url text not null,
  license_spdx text,
  attribution_text text,
  redistribution_allowed boolean not null default false,
  commercial_use_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (tenant_id, asset_key)
);

create index oauth_identities_user_id_idx on oauth_identities(user_id);
create index sessions_user_id_idx on sessions(user_id);
create index sessions_expires_at_idx on sessions(expires_at);
create index rooms_space_id_idx on rooms(space_id);
create index maps_space_id_idx on maps(space_id);
create index map_versions_map_id_idx on map_versions(map_id);
create index room_memberships_user_id_idx on room_memberships(user_id);
create index moderation_events_tenant_id_created_at_idx
  on moderation_events(tenant_id, created_at);
