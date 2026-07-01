-- Huginn Online — Phase 4: recurring task templates
--
-- A `recurring_tasks` row is a TEMPLATE, not a task. A daily scheduled
-- Edge Function spawns real `tasks` rows from templates whose nextRunDate
-- has arrived, then advances nextRunDate by (repeatEvery × frequency).
--
-- Column names follow the same camelCase-matches-JS convention as Phase 1.
-- `repeatEvery` is used instead of `interval` (a reserved SQL word).

create table public.recurring_tasks (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid not null references auth.users (id) on delete cascade,
    -- fields copied onto each spawned task
    text                    text not null default 'Recurring Task',
    description             text not null default '',
    "projectId"             uuid references public.projects (id) on delete set null,
    effort                  integer not null default 1 check (effort >= 1),
    "estimatedDurationDays" integer not null default 1 check ("estimatedDurationDays" >= 1),
    -- recurrence rule
    frequency               text not null default 'weekly'
                                check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
    "repeatEvery"           integer not null default 1 check ("repeatEvery" >= 1),
    "nextRunDate"           date not null default (now() at time zone 'utc')::date,
    active                  boolean not null default true,
    "lastSpawnedAt"         timestamptz,
    "createdAt"             timestamptz not null default now()
);

create index recurring_tasks_user_id_idx on public.recurring_tasks (user_id);
create index recurring_tasks_due_idx on public.recurring_tasks ("nextRunDate") where active;

-- Row Level Security — owners manage their own templates from the frontend.
-- The scheduler Edge Function uses the service role key, which bypasses RLS.
alter table public.recurring_tasks enable row level security;

create policy "recurring_tasks: owner read"
    on public.recurring_tasks for select
    using (auth.uid() = user_id);

create policy "recurring_tasks: owner insert"
    on public.recurring_tasks for insert
    with check (auth.uid() = user_id);

create policy "recurring_tasks: owner update"
    on public.recurring_tasks for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "recurring_tasks: owner delete"
    on public.recurring_tasks for delete
    using (auth.uid() = user_id);
