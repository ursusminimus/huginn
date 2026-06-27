# Huginn Online Migration — Setup Reference

_Written 2026-06-27. Snapshot of how the online version is wired up, so future-me can find everything again._

## TL;DR — the core choices

- Went from standalone offline HTML apps to an online version, starting with **Huginn Tasks only** as a proof-of-concept.
- **Backend:** Supabase (Postgres + Auth + Row Level Security + Edge Functions + pg_cron). Free tier.
- **Frontend:** the existing vanilla-JS UI, lightly adapted, hosted as static files on **Cloudflare Pages**. Free tier.
- **Why Supabase:** Row Level Security gives per-user data isolation declaratively (one `user_id = auth.uid()` policy per table) — no hand-rolled auth/query-filtering. Postgres maps 1:1 to the existing relational data model.
- Kept it deliberately minimal: no framework rewrite, no speculative features. Fine to restart from scratch later.

## Accounts & where to find them

- Both the **Supabase** and **Cloudflare** accounts were created by signing in **with the existing GitHub account** (`ursusminimus`).
- The specific account logins are stored in the **"Passwords" app**.
- Everything is tied to the GitHub repo: **https://github.com/ursusminimus/huginn**

## The three layers (what lives where)

The app is three independent pieces in three places — this was the key mental-model unlock:

| Layer | Lives on | Notes |
|---|---|---|
| Database schema (tables, RLS) | Supabase Postgres | Applied by pasting SQL migrations into the SQL Editor |
| Auth (users, login, sessions) | Supabase Auth (managed) | Nothing to deploy; just create users |
| Frontend (HTML/JS) | Cloudflare Pages | Static files from `online/`; NOT hosted on Supabase |

The browser downloads the frontend from Cloudflare, then talks directly to Supabase over HTTPS using the publishable key. Host and backend are fully decoupled.

## URLs & public tokens

- **Live app (Cloudflare):** https://huginn.ursusminimus.workers.dev
- **Supabase project URL:** https://xiuraewulrofvlcyrlgt.supabase.co
- **Supabase project ref:** `xiuraewulrofvlcyrlgt`
- **Supabase publishable key (PUBLIC, safe in frontend):** `sb_publishable_M0H8V1XC0HIinMxzOuz6cw_rkTe8puD`
  - This is the new-style public client key; it's in the committed frontend JS by design. RLS is the security boundary, not the key.
- **Scheduler Edge Function URL:** https://xiuraewulrofvlcyrlgt.functions.supabase.co/recurring-tasks

### Secrets — NOT in this file or the repo
- **`service_role` key** — full-access backend key. Lives in Supabase project settings; auto-injected into Edge Functions. Never put in frontend or git.
- **`CRON_SECRET`** — random value guarding the scheduler function. Set via `supabase secrets set CRON_SECRET=…` and referenced in the cron job SQL. Generated locally with `openssl rand -hex 32`.

## Database schema

Two tables for the Tasks PoC plus one for recurrence. Column names match the JS field names (camelCase, quoted) so the frontend needs no field mapping. Primary keys are UUIDs (`gen_random_uuid()`). All tables have a `user_id` column + owner-only RLS policies.

- **`projects`** — `id, user_id, name, "parentId", "createdAt"`
- **`tasks`** — `id, user_id, text, description, status, "createdAt", "startedAt", "finishedAt", "projectId", effort, "order", "nextActionDate", deadline, "estimatedDurationDays", "startDate", "startDateType", "endDate", "endDateType", "scheduledStart", "scheduledEnd"`
- **`recurring_tasks`** (templates) — `id, user_id, text, description, "projectId", effort, "estimatedDurationDays", frequency (daily/weekly/monthly/yearly), "repeatEvery", "nextRunDate", active, "lastSpawnedAt", "createdAt"`

"Personal Tasks" is represented as `projectId = null` (no project row needed). Plan/Cal/Timekeeper machinery (events, dependencies, layers) was deliberately left out of the online schema for now.

Migrations (also runnable via Supabase CLI):
- `supabase/migrations/20260627130000_phase1_tasks_projects.sql`
- `supabase/migrations/20260627140000_recurring_tasks.sql`

## Auth

- Email + password. No login server of our own — `supabase.auth.signInWithPassword()` hits Supabase Auth directly; the JWT session is cached in browser localStorage and auto-refreshed.
- Email confirmation was turned **off** for the PoC (Authentication → Sign In / Providers → Email).
- A throwaway test user `claude@example.com` was created for verification — safe to delete.

## Scheduler — recurring tasks

This is the headline "online-only" capability (the offline app can't do it).

- **Edge Function:** `supabase/functions/recurring-tasks/index.ts` (Deno). Runs with the service-role key (acts across all users, bypasses RLS). Guarded by the `CRON_SECRET` header. For each active template whose `nextRunDate` ≤ today, it inserts a real task (catching up missed occurrences, capped at 60) and advances `nextRunDate` by `repeatEvery × frequency`. Idempotent — running twice a day won't double-spawn.
- **Deployed with:** `supabase functions deploy recurring-tasks --no-verify-jwt`
- **Cron:** pg_cron job `huginn-recurring-tasks`, daily at `0 6 * * *` (06:00 UTC), POSTs to the function URL with the `x-cron-secret` header. Needs the `pg_cron` and `pg_net` extensions enabled.
- **Managing templates:** currently seeded via SQL (`insert into public.recurring_tasks …`). No frontend UI for this yet.
- **Inspect cron:** `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc;`. Function logs: Supabase Dashboard → Edge Functions → recurring-tasks → Logs.

## Repository layout

- `online/` — the deployed frontend (`index.html` + `huginn_data_online.js`). Cloudflare Pages output directory is set to `online`.
- `supabase/migrations/` — DB schema migrations.
- `supabase/functions/recurring-tasks/` — the scheduler Edge Function.
- `.claude/launch.json` — local static server (`python3 -m http.server 4178 --directory online`) for previewing.
- `experimental/` — the original offline standalone apps (still the offline fallback).

## How to verify it's working

1. Open https://huginn.ursusminimus.workers.dev, sign in, add a task.
2. Open the same URL on another device, refresh — the task appears (and vice versa). _Round-trip confirmed 2026-06-27 across laptop + phone._
3. Scheduler: seed a `recurring_tasks` row with `nextRunDate = current_date`, then either wait for 06:00 UTC or `curl` the function URL with the `x-cron-secret` header; a new task should appear.

## Open items / next steps (not done yet)

- **Refresh logic** — changes only appear after a manual page refresh. Could add Supabase Realtime to push live updates between devices.
- **Recurring-task UI** — add a "make recurring" control to the Tasks app so templates can be managed without SQL.
- **GitHub auto-deploy for backend** — wire up the Supabase CLI / GitHub integration so migrations + functions deploy on push (currently done by hand). Frontend already auto-deploys via Cloudflare on push to `main`.
- **Email digest** — the other scheduler idea (overdue/due reminders via Resend); deferred.
- **Commit backend files** — `supabase/functions/` and the recurring-tasks migration are untracked; commit them so the repo reflects what's deployed.
- **Other tools** (Cal, Plan, Timekeeper) — not yet migrated online.
