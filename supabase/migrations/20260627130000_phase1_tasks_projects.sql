-- Huginn Online — Phase 1: Tasks + Projects schema
-- Scope: Huginn Tasks proof-of-concept only (Plan/Cal/Timekeeper machinery omitted).
--
-- Design notes:
--   * Primary keys are UUIDs (gen_random_uuid) — safe for multi-device creation.
--     This replaces the offline integer-timestamp IDs.
--   * Column names intentionally match the JS field names in huginn_data.js
--     (camelCase, quoted) so the online data layer needs no field mapping.
--     The only non-domain column is user_id, used for ownership + RLS.
--   * Per-user isolation is enforced declaratively via Row Level Security:
--     every row is visible/writable only to the user whose id == auth.uid().

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users (id) on delete cascade,
    name        text not null default 'Unnamed Project',
    "parentId"  uuid references public.projects (id) on delete set null,
    "createdAt" timestamptz not null default now()
);

create index projects_user_id_idx   on public.projects (user_id);
create index projects_parent_id_idx on public.projects ("parentId");

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid not null references auth.users (id) on delete cascade,
    text                    text not null default 'Unnamed Task',
    description             text not null default '',
    status                  text not null default 'new'
                                check (status in ('new', 'started', 'done', 'stopped')),
    "createdAt"             timestamptz not null default now(),
    "startedAt"             timestamptz,
    "finishedAt"            timestamptz,
    "projectId"             uuid references public.projects (id) on delete set null,
    effort                  integer not null default 1 check (effort >= 1),
    "order"                 double precision not null default 0,
    "nextActionDate"        date,
    deadline                date,
    "estimatedDurationDays" integer not null default 1 check ("estimatedDurationDays" >= 1),
    "startDate"             date,
    "startDateType"         text not null default 'flexible'
                                check ("startDateType" in ('flexible', 'fixed', 'target')),
    "endDate"               date,
    "endDateType"           text not null default 'flexible'
                                check ("endDateType" in ('flexible', 'fixed', 'target')),
    "scheduledStart"        date,
    "scheduledEnd"          date
);

create index tasks_user_id_idx    on public.tasks (user_id);
create index tasks_project_id_idx on public.tasks ("projectId");

-- ---------------------------------------------------------------------------
-- Row Level Security — each user sees and edits only their own rows
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

create policy "projects: owner read"
    on public.projects for select
    using (auth.uid() = user_id);

create policy "projects: owner insert"
    on public.projects for insert
    with check (auth.uid() = user_id);

create policy "projects: owner update"
    on public.projects for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "projects: owner delete"
    on public.projects for delete
    using (auth.uid() = user_id);

create policy "tasks: owner read"
    on public.tasks for select
    using (auth.uid() = user_id);

create policy "tasks: owner insert"
    on public.tasks for insert
    with check (auth.uid() = user_id);

create policy "tasks: owner update"
    on public.tasks for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "tasks: owner delete"
    on public.tasks for delete
    using (auth.uid() = user_id);
