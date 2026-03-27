import { createClient } from "@supabase/supabase-js";
import { sendTrialExpiringSoon } from "../_lib/email.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Vercel cron jobs send GET requests with an Authorization header
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const now = new Date();

  // Find trials expiring in 2 days (window: 1.5–2.5 days from now)
  const windowStart = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, pro_trial_until")
    .gte("pro_trial_until", windowStart.toISOString())
    .lte("pro_trial_until", windowEnd.toISOString())
    .eq("subscription_status", "free");

  if (!profiles?.length) return res.status(200).json({ sent: 0 });

  const results = await Promise.allSettled(
    profiles.map(p => sendTrialExpiringSoon(p.email, 2, p.pro_trial_until))
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  res.status(200).json({ sent, total: profiles.length });
}
