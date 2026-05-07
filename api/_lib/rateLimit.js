import { createClient } from "@supabase/supabase-js";

/**
 * Fixed-window per-user rate limiter backed by Supabase.
 *
 * Requires a `rate_limits` table — run this once in the Supabase SQL editor:
 *
 *   create table if not exists rate_limits (
 *     id   bigserial primary key,
 *     user_id  uuid not null,
 *     endpoint text not null,
 *     ts   timestamptz not null default now()
 *   );
 *   create index on rate_limits (user_id, endpoint, ts);
 *
 * Returns true if the request should be blocked, false if allowed.
 * Fails open (returns false) on any DB error so a Supabase outage
 * never takes down the proxy endpoints.
 */
export async function checkRateLimit(userId, endpoint, { limit = 60, windowSecs = 60 } = {}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const windowStart = new Date(Date.now() - windowSecs * 1000).toISOString();

    const { count } = await admin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .gte("ts", windowStart);

    if ((count ?? 0) >= limit) return true;

    await admin.from("rate_limits").insert({ user_id: userId, endpoint });

    // Prune rows older than 24 h on ~5 % of requests to keep the table small
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 86400 * 1000).toISOString();
      admin.from("rate_limits").delete().lt("ts", cutoff).then(() => {});
    }

    return false;
  } catch {
    return false;
  }
}
