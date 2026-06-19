create table if not exists public.castgenie_projects (
  id text primary key,
  name text not null,
  prompt text not null,
  status text not null,
  domain_spec jsonb,
  source_config jsonb,
  metrics jsonb not null default '{}'::jsonb,
  artifact_root text not null,
  steps jsonb not null default '[]'::jsonb,
  generated_files jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.castgenie_jobs (
  id text primary key,
  project_id text not null references public.castgenie_projects(id) on delete cascade,
  kind text not null,
  status text not null,
  current_step text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  locked_by text,
  locked_at timestamptz,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.castgenie_sources_summary (
  project_id text primary key references public.castgenie_projects(id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.castgenie_artifact_manifests (
  project_id text primary key references public.castgenie_projects(id) on delete cascade,
  files jsonb not null default '[]'::jsonb,
  source_summary jsonb not null default '{}'::jsonb,
  training_summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.castgenie_castform_runs (
  id text primary key,
  project_id text not null references public.castgenie_projects(id) on delete cascade,
  mode text not null,
  status text not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  castform_run_id text,
  status_url text,
  model_endpoint text,
  readiness jsonb not null default '{}'::jsonb,
  artifact_paths jsonb not null default '{}'::jsonb,
  error text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.castgenie_training_events (
  id text primary key,
  project_id text not null references public.castgenie_projects(id) on delete cascade,
  job_id text,
  run_id text,
  level text not null default 'info',
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.castgenie_model_versions (
  id text primary key,
  project_id text not null references public.castgenie_projects(id) on delete cascade,
  source_run_id text not null,
  status text not null,
  corpus_summary jsonb not null default '{}'::jsonb,
  dataset_summary jsonb not null default '{}'::jsonb,
  castform_run_id text,
  status_url text,
  model_endpoint text,
  model_name text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists castgenie_projects_status_idx on public.castgenie_projects(status);
create index if not exists castgenie_projects_updated_at_idx on public.castgenie_projects(updated_at desc);
create index if not exists castgenie_jobs_project_id_idx on public.castgenie_jobs(project_id);
create index if not exists castgenie_jobs_status_created_at_idx on public.castgenie_jobs(status, created_at);
create index if not exists castgenie_castform_runs_project_id_idx on public.castgenie_castform_runs(project_id);
create index if not exists castgenie_castform_runs_status_idx on public.castgenie_castform_runs(status);
create index if not exists castgenie_training_events_project_id_created_at_idx on public.castgenie_training_events(project_id, created_at desc);
create index if not exists castgenie_model_versions_project_id_idx on public.castgenie_model_versions(project_id);

create or replace function public.castgenie_claim_queued_job(worker_id text default null)
returns setof public.castgenie_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with next_job as (
    select id
    from public.castgenie_jobs
    where status = 'queued'
      and attempts < max_attempts
      and (locked_at is null or locked_at < now() - interval '10 minutes')
    order by created_at asc
    limit 1
    for update skip locked
  )
  update public.castgenie_jobs job
  set
    status = 'running',
    locked_by = worker_id,
    locked_at = now(),
    attempts = job.attempts + 1,
    updated_at = now()
  from next_job
  where job.id = next_job.id
  returning job.*;
end;
$$;

alter table public.castgenie_projects enable row level security;
alter table public.castgenie_jobs enable row level security;
alter table public.castgenie_sources_summary enable row level security;
alter table public.castgenie_artifact_manifests enable row level security;
alter table public.castgenie_castform_runs enable row level security;
alter table public.castgenie_training_events enable row level security;
alter table public.castgenie_model_versions enable row level security;
