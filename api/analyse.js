import { createClient } from "@supabase/supabase-js";

const DAILY_LIMIT = 3;
const MAX_TOKENS_CAP = 4000;
const ALLOWED_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
];
const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, model, max_tokens, messages, system } = req.body;

  // Whitelist only known-safe fields to forward to Anthropic
  const anthropicBody = {
    model: ALLOWED_MODELS.includes(model) ? model : "claude-sonnet-4-6",
    max_tokens: Math.min(Number(max_tokens) || 2000, MAX_TOKENS_CAP),
    messages,
  };
  if (system) anthropicBody.system = system;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing messages" });
  }

  // Verify JWT and enforce server-side rate limiting
  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the JWT matches the claimed userId
    if (token) {
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (error || !user || user.id !== userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("ai_daily_date, ai_daily_count, subscription_status")
        .eq("id", userId)
        .single();

      if (profile?.subscription_status !== "pro_plus") {
        return res.status(403).json({ error: "AI Insights requires a Pro Plus subscription." });
      }

      const todayStr = today();
      const count = profile?.ai_daily_date === todayStr ? (profile.ai_daily_count ?? 0) : 0;

      if (count >= DAILY_LIMIT) {
        return res.status(429).json({ error: `Daily limit reached (${DAILY_LIMIT} analyses/day). Resets at midnight.` });
      }

      // Increment BEFORE the Anthropic call to prevent race-condition bypass
      await admin
        .from("profiles")
        .update({ ai_daily_date: todayStr, ai_daily_count: count + 1 })
        .eq("id", userId);

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

        // Roll back the count if Anthropic returned an error
        if (data.error) {
          admin
            .from("profiles")
            .update({ ai_daily_count: count })
            .eq("id", userId)
            .then(() => {}).catch(() => {});
        }

        return res.status(200).json(data);
      } catch (error) {
        // Roll back on network error
        admin
          .from("profiles")
          .update({ ai_daily_count: count })
          .eq("id", userId)
          .then(() => {}).catch(() => {});
        return res.status(500).json({ error: error.message });
      }
    } catch {
      // DB error — fall through to make the Anthropic call without rate limiting
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
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
