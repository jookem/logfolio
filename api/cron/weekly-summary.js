import { createClient } from "@supabase/supabase-js";
import { sendWeeklySummary } from "../lib/email.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - 1);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, subscription_status")
    .in("subscription_status", ["pro", "pro_plus"]);

  if (!profiles?.length) return res.status(200).json({ sent: 0 });

  const processUser = async (profile) => {
    const { data: rows } = await supabase
      .from("trades")
      .select("data")
      .eq("user_id", profile.id);

    if (!rows?.length) return null;

    const weekTrades = rows
      .map(r => r.data)
      .filter(t => t.status !== "planned" && t.date >= weekStartStr && t.date <= weekEndStr && t.exitPrice);

    if (weekTrades.length === 0) return null;

    const wins = weekTrades.filter(t => {
      const dir = t.direction === "long" ? 1 : -1;
      return dir * (t.exitPrice - t.entryPrice) > 0;
    });
    const totalPL = weekTrades.reduce((sum, t) => {
      const dir = t.direction === "long" ? 1 : -1;
      return sum + dir * (t.exitPrice - t.entryPrice) * (t.shares || 1);
    }, 0);
    const winRate = Math.round((wins.length / weekTrades.length) * 100);

    const stats = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalTrades: weekTrades.length,
      wins: wins.length,
      losses: weekTrades.length - wins.length,
      winRate,
      totalPL,
    };

    let narrative = null;
    try {
      const summaryInput = `Week: ${weekStartStr} to ${weekEndStr}. Trades: ${weekTrades.length}. Wins: ${wins.length}. Win rate: ${winRate}%. Total P&L: $${totalPL.toFixed(0)}.`;
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
          system: "You are a trading coach. Write exactly 2 sentences summarizing this trader's week based on the stats. Be concise and specific.",
          messages: [{ role: "user", content: summaryInput }],
        }),
      });
      const aiData = await aiRes.json();
      narrative = aiData.content?.[0]?.text || null;
    } catch {}

    await sendWeeklySummary(profile.email, { stats, narrative });
    return true;
  };

  const results = await Promise.allSettled(profiles.map(processUser));
  const sent = results.filter(r => r.status === "fulfilled" && r.value).length;
  res.status(200).json({ sent, total: profiles.length });
}
