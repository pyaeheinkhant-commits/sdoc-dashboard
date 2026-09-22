-- Run in Supabase SQL editor before importing Workflow D and Workflow E.

create table if not exists public.review_cases (
  id uuid primary key default gen_random_uuid(),
  email_id text not null unique,
  comparison_id uuid,
  review_reason text,
  evidence_json jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN',
  assigned_to text,
  reviewer_decision text,
  reviewer_comment text,
  webhook_url text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resolution_events (
  id uuid primary key default gen_random_uuid(),
  shipment_case_id uuid,
  email_id text,
  event_type text not null,
  actor_type text,
  actor_id text,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  email_id text not null unique,
  to_address text,
  subject text,
  body text,
  defect_fields jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  approval_webhook_url text,
  reprocess_webhook_url text,
  replacement_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emails add column if not exists comparison_summary text;

alter table public.comparisons add column if not exists comparison_summary text;
alter table public.comparisons add column if not exists recommended_action text;

-- Workflow E writes drafts here. Without this table, E fails after D confirms a mismatch.
create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  email_id text not null unique,
  to_address text,
  subject text,
  body text,
  defect_fields jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  approval_webhook_url text,
  reprocess_webhook_url text,
  replacement_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lookups in A/C/D/E always filter by email_id.
create index if not exists comparisons_email_id_idx on public.comparisons (email_id);
create index if not exists emails_email_id_idx on public.emails (email_id);
create index if not exists review_cases_email_id_idx on public.review_cases (email_id);
create index if not exists resolution_events_email_id_idx on public.resolution_events (email_id);
create index if not exists outbound_messages_email_id_idx on public.outbound_messages (email_id);

-- A routes only NEEDS_REVIEW rows into D.
create index if not exists comparisons_needs_review_idx
  on public.comparisons (email_id)
  where status = 'NEEDS_REVIEW';

create index if not exists comparisons_mismatch_idx
  on public.comparisons (email_id)
  where status in ('MISMATCH', 'MISMATCH_FOUND');

alter table public.review_cases enable row level security;
alter table public.resolution_events enable row level security;
alter table public.outbound_messages enable row level security;

drop policy if exists review_cases_service_all on public.review_cases;
create policy review_cases_service_all
  on public.review_cases
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists resolution_events_service_all on public.resolution_events;
create policy resolution_events_service_all
  on public.resolution_events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists outbound_messages_service_all on public.outbound_messages;
create policy outbound_messages_service_all
  on public.outbound_messages
  for all
  to service_role
  using (true)
  with check (true);
