import { createClient } from "@supabase/supabase-js";

const DAILY_LIMIT = 3;
const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, ...anthropicBody } = req.body;

  // Server-side rate limiting via Supabase
  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: profile } = await admin
        .from("profiles")
        .select("ai_daily_date, ai_daily_count")
        .eq("id", userId)
        .single();

      const todayStr = today();
      const count = profile?.ai_daily_date === todayStr ? (profile.ai_daily_count ?? 0) : 0;

      if (count >= DAILY_LIMIT) {
        return res.status(429).json({ error: `Daily limit reached (${DAILY_LIMIT} analyses/day). Resets at midnight.` });
      }

      // Increment counter after successful check (we'll update after the request)
      req._supabaseAdmin = admin;
      req._userId = userId;
      req._newDailyCount = count + 1;
      req._todayStr = todayStr;
    } catch {
      // DB error — fail open, client-side limit still applies
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();

    // Persist updated daily count only on success
    if (req._supabaseAdmin && !data.error) {
      req._supabaseAdmin
        .from("profiles")
        .update({ ai_daily_date: req._todayStr, ai_daily_count: req._newDailyCount })
        .eq("id", req._userId)
        .then(() => {})
        .catch(() => {});
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
