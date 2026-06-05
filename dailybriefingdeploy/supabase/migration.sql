-- MIT Dining Operations Platform — initial schema (Phase 1)
-- Run against the Supabase Postgres project once it exists.
-- Safe to re-run: uses IF NOT EXISTS throughout.

-- Houses (7 today): residential houses + the retail cluster. parent_id lets a
-- venue roll up to a cluster/parent house.
create table if not exists houses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  type        text not null check (type in ('residential', 'cluster')),
  parent_id   uuid references houses (id) on delete set null,
  ec_name     text,
  contact     text,
  active      boolean not null default true
);

-- KPI definitions (20 today). id is the stable KPI slug used in code/seed.
create table if not exists kpi_definitions (
  id                   text primary key,
  category             text not null,
  name                 text not null,
  weight_pct           numeric not null default 0,        -- weight within its category
  owner                text,
  green_threshold      numeric not null default 2.5,
  red_threshold        numeric not null default 1.5,
  signal_source        text,
  measurement_mechanic text
);

-- One row per (period, house, kpi). score_0_3 is the raw 0–3 score; weighted is
-- the contribution after applying the within-category weight.
create table if not exists scorecard_snapshots (
  id          uuid primary key default gen_random_uuid(),
  period      text not null,                              -- e.g. 'P7', 'P8'
  house_id    uuid not null references houses (id) on delete cascade,
  kpi_id      text not null references kpi_definitions (id) on delete cascade,
  score_0_3   numeric,
  weighted    numeric,
  captured_at timestamptz not null default now(),
  unique (period, house_id, kpi_id)
);

create index if not exists scorecard_snapshots_house_period_idx
  on scorecard_snapshots (house_id, period);
create index if not exists scorecard_snapshots_period_idx
  on scorecard_snapshots (period);

-- Issues raised from ingested signals or manual entry. natural_key dedupes
-- repeated ingestion of the same underlying issue.
create table if not exists issues (
  id               uuid primary key default gen_random_uuid(),
  natural_key      text unique not null,
  house_id         uuid references houses (id) on delete set null,
  source           text,
  category         text,
  severity         text,
  title            text not null,
  facts            text,
  impact           text,
  action           text,
  owner            text,
  status           text not null default 'open',
  opened_at        timestamptz not null default now(),
  due_at           timestamptz,
  resolved_at      timestamptz,
  escalation_level integer not null default 0,
  sensitive        boolean not null default false
);

create index if not exists issues_house_idx on issues (house_id);
create index if not exists issues_status_idx on issues (status);

-- App users + their role / default landing view (for SSO + RBAC).
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text,
  role         text not null default 'viewer',
  default_view text
);

-- One row per ingestion attempt, for the Admin "ingestion health" view.
create table if not exists ingestion_runs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running',
  row_count   integer,
  error       text
);

create index if not exists ingestion_runs_source_idx on ingestion_runs (source, started_at desc);

-- Append-only audit trail of meaningful actions.
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_email text,
  action      text not null,
  entity      text,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on audit_log (entity, entity_id);

-- NOTE: Row Level Security policies are intentionally deferred. Enable RLS and
-- add policies once Azure AD SSO + the users/role model are wired up.
