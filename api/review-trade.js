import { createClient } from "@supabase/supabase-js";

const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { tradeData, userId, action } = req.body || {};
  if (!tradeData || !userId) return res.status(400).json({ error: "Missing fields" });

  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status, ai_insights_daily_count, ai_insights_daily_date")
    .eq("id", userId)
    .single();

  if (!profile || profile.subscription_status !== "pro_plus") {
    return res.status(403).json({ error: "AI Trade Review requires a Pro Plus subscription." });
  }

  const t = tradeData;
  const parts = [
    `Ticker: ${t.ticker}`,
    `Direction: ${t.direction}`,
    `Entry: ${t.entryPrice}`,
    t.exitPrice ? `Exit: ${t.exitPrice}` : null,
    t.shares ? `Shares: ${t.shares}` : null,
    t.pl != null ? `P&L: ${t.pl}` : null,
    t.r != null ? `R-Multiple: ${t.r?.toFixed(2)}R` : null,
    t.emotion && t.emotion !== "None" ? `Emotion: ${t.emotion}` : null,
    t.mistake && t.mistake !== "None" ? `Mistake: ${t.mistake}` : null,
    t.notes ? `Notes: ${t.notes}` : null,
    t.planSnapshot?.notes ? `Plan notes: ${t.planSnapshot.notes}` : null,
  ].filter(Boolean);

  const prompt = parts.join("\n");

  if (action === "grade") {
    // Auto-grade: no rate limit (fired once per trade close, not user-initiated)
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 80,
          system: "You are a trading coach. Grade this trade A/B/C/D/F based on execution quality, risk management, and plan adherence. Return ONLY valid JSON: {\"grade\":\"B\",\"gradeNote\":\"One sentence reason.\"}. A=excellent, B=good, C=average, D=poor, F=failed execution.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (data.error) return res.status(500).json({ error: data.error.message || "AI error" });

      const text = data.content?.[0]?.text || "";
      let grade = null, gradeNote = null;
      try {
        const parsed = JSON.parse(text);
        grade = parsed.grade;
        gradeNote = parsed.gradeNote;
      } catch {
        const gradeMatch = text.match(/"grade"\s*:\s*"([A-F])"/);
        const noteMatch = text.match(/"gradeNote"\s*:\s*"([^"]+)"/);
        grade = gradeMatch?.[1] || null;
        gradeNote = noteMatch?.[1] || null;
      }

      return res.status(200).json({ grade, gradeNote });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Failed." });
    }
  }

  // Default: review action — apply rate limit
  const todayStr = today();
  const count = profile.ai_insights_daily_date === todayStr ? (profile.ai_insights_daily_count ?? 0) : 0;
  const DAILY_LIMIT = 3;

  if (count >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Daily limit reached (${DAILY_LIMIT}/day). Resets at midnight.` });
  }

  await admin
    .from("profiles")
    .update({ ai_insights_daily_date: todayStr, ai_insights_daily_count: count + 1 })
    .eq("id", userId);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: "You are a trading coach reviewing a completed trade. In 2-3 sentences, give honest and specific feedback on this trade's execution, psychology, and whether the trader followed their plan. Be direct and constructive.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      await admin
        .from("profiles")
        .update({ ai_insights_daily_count: count })
        .eq("id", userId);
      return res.status(500).json({ error: data.error.message || "AI error" });
    }

    const review = data.content?.[0]?.text || "";
    return res.status(200).json({ review });
  } catch (err) {
    await admin
      .from("profiles")
      .update({ ai_insights_daily_count: count })
      .eq("id", userId);
    return res.status(500).json({ error: err?.message || "Failed." });
  }
}
