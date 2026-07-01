// Huginn Online — recurring-tasks scheduler
// ---------------------------------------------------------------------------
// Invoked daily by pg_cron. For every active template whose nextRunDate has
// arrived, it spawns a real task (catching up on any missed occurrences) and
// advances nextRunDate. Runs with the service role key, so it operates across
// all users and bypasses RLS. Protected by a CRON_SECRET header.
//
// Deploy:  supabase functions deploy recurring-tasks --no-verify-jwt
// Secrets: supabase secrets set CRON_SECRET=<random>
//          (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_CATCHUP = 60; // safety cap: never spawn more than this per template per run

function advance(dateStr: string, frequency: string, every: number): string {
  // Parse as UTC date-only to avoid timezone drift.
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  switch (frequency) {
    case "daily":   dt.setUTCDate(dt.getUTCDate() + every); break;
    case "weekly":  dt.setUTCDate(dt.getUTCDate() + every * 7); break;
    case "monthly": dt.setUTCMonth(dt.getUTCMonth() + every); break;
    case "yearly":  dt.setUTCFullYear(dt.getUTCFullYear() + every); break;
  }
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // --- auth: only pg_cron (with the shared secret) may invoke ---
  const provided = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: templates, error } = await supabase
    .from("recurring_tasks")
    .select("*")
    .eq("active", true)
    .lte("nextRunDate", today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let spawned = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const tpl of templates ?? []) {
    let next: string = tpl.nextRunDate;
    const inserts: Array<Record<string, unknown>> = [];

    // Catch up: one task per missed occurrence, up to the safety cap.
    let guard = 0;
    while (next <= today && guard < MAX_CATCHUP) {
      inserts.push({
        user_id: tpl.user_id,
        text: tpl.text,
        description: tpl.description,
        projectId: tpl.projectId,
        effort: tpl.effort,
        estimatedDurationDays: tpl.estimatedDurationDays,
        status: "new",
        nextActionDate: next,
        order: 0,
      });
      next = advance(next, tpl.frequency, tpl.repeatEvery);
      guard++;
    }

    if (inserts.length === 0) continue;

    const { error: insErr } = await supabase.from("tasks").insert(inserts);
    if (insErr) {
      details.push({ template: tpl.id, error: insErr.message });
      continue;
    }

    const { error: updErr } = await supabase
      .from("recurring_tasks")
      .update({ nextRunDate: next, lastSpawnedAt: new Date().toISOString() })
      .eq("id", tpl.id);
    if (updErr) {
      details.push({ template: tpl.id, spawned: inserts.length, updateError: updErr.message });
      continue;
    }

    spawned += inserts.length;
    details.push({ template: tpl.id, spawned: inserts.length, newNextRunDate: next });
  }

  return new Response(
    JSON.stringify({ ok: true, today, templatesDue: templates?.length ?? 0, spawned, details }),
    { headers: { "Content-Type": "application/json" } },
  );
});
