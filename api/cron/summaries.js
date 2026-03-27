import { createClient } from "@supabase/supabase-js";
import { sendWeeklySummary, sendMonthlyLetter } from "../_lib/email.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isFirstMondayOfMonth(date) {
  return date.getDay() === 1 && date.getDate() <= 7;
}

function getPrevMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d;
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const now = new Date();
  const doMonthly = isFirstMondayOfMonth(now);

  // Weekly window: last 7 days (Sun–Sat)
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - 1);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Monthly window: previous calendar month
  const prevMonth = getPrevMonth(now);
  const monthStartStr = prevMonth.toISOString().slice(0, 7) + "-01";
  const monthEndDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
  const monthEndStr = monthEndDate.toISOString().slice(0, 10);
  const monthName = prevMonth.toLocaleDateString("en-US", { month: "long" });
  const year = prevMonth.getFullYear();

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

    const allTrades = rows.map(r => r.data);

    // --- Weekly summary ---
    const weekTrades = allTrades.filter(
      t => t.status !== "planned" && t.date >= weekStartStr && t.date <= weekEndStr && t.exitPrice
    );

    if (weekTrades.length > 0) {
      const wins = weekTrades.filter(t => (t.direction === "long" ? 1 : -1) * (t.exitPrice - t.entryPrice) > 0);
      const totalPL = weekTrades.reduce((sum, t) => sum + (t.direction === "long" ? 1 : -1) * (t.exitPrice - t.entryPrice) * (t.shares || 1), 0);
      const winRate = Math.round((wins.length / weekTrades.length) * 100);

      let narrative = null;
      try {
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
            messages: [{ role: "user", content: `Week: ${weekStartStr} to ${weekEndStr}. Trades: ${weekTrades.length}. Wins: ${wins.length}. Win rate: ${winRate}%. Total P&L: $${totalPL.toFixed(0)}.` }],
          }),
        });
        const aiData = await aiRes.json();
        narrative = aiData.content?.[0]?.text || null;
      } catch {}

      await sendWeeklySummary(profile.email, {
        stats: { weekStart: weekStartStr, weekEnd: weekEndStr, totalTrades: weekTrades.length, wins: wins.length, losses: weekTrades.length - wins.length, winRate, totalPL },
        narrative,
      });
    }

    // --- Monthly performance letter (first Monday of month only) ---
    if (doMonthly) {
      const monthTrades = allTrades.filter(
        t => t.status !== "planned" && t.date >= monthStartStr && t.date <= monthEndStr && t.exitPrice
      );

      if (monthTrades.length > 0) {
        const wins = monthTrades.filter(t => (t.direction === "long" ? 1 : -1) * (t.exitPrice - t.entryPrice) > 0);
        const totalPL = monthTrades.reduce((sum, t) => sum + (t.direction === "long" ? 1 : -1) * (t.exitPrice - t.entryPrice) * (t.shares || 1), 0);
        const winRate = Math.round((wins.length / monthTrades.length) * 100);

        const plByTrade = monthTrades.map(t => ({
          ticker: t.ticker,
          pl: (t.direction === "long" ? 1 : -1) * (t.exitPrice - t.entryPrice) * (t.shares || 1),
        }));
        const bestTrade = plByTrade.reduce((a, b) => b.pl > a.pl ? b : a, plByTrade[0]);
        const worstTrade = plByTrade.reduce((a, b) => b.pl < a.pl ? b : a, plByTrade[0]);

        const emotions = monthTrades.map(t => t.emotion).filter(e => e && e !== "None");
        const mistakes = monthTrades.map(t => t.mistake).filter(m => m && m !== "None");
        const topEmotion = emotions.length ? emotions.sort((a, b) => emotions.filter(e => e === b).length - emotions.filter(e => e === a).length)[0] : null;
        const topMistake = mistakes.length ? mistakes.sort((a, b) => mistakes.filter(e => e === b).length - mistakes.filter(e => e === a).length)[0] : null;

        let letter = null;
        try {
          const monthContext = [
            `Month: ${monthName} ${year}`,
            `Total trades: ${monthTrades.length}`,
            `Wins: ${wins.length} (${winRate}% win rate)`,
            `Total P&L: $${totalPL.toFixed(0)}`,
            `Best trade: ${bestTrade.ticker} +$${Math.abs(bestTrade.pl).toFixed(0)}`,
            `Worst trade: ${worstTrade.ticker} -$${Math.abs(worstTrade.pl).toFixed(0)}`,
            topEmotion ? `Most common emotion: ${topEmotion}` : null,
            topMistake ? `Most common mistake: ${topMistake}` : null,
          ].filter(Boolean).join("\n");

          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 500,
              system: "You are a thoughtful trading coach writing a personalised monthly performance letter. Write 3-4 paragraphs that: (1) acknowledge the month's overall result honestly, (2) highlight what went well, (3) identify the key area to improve next month, and (4) close with a specific actionable goal. Be direct, personal, and specific to the numbers provided. Do not use bullet points.",
              messages: [{ role: "user", content: monthContext }],
            }),
          });
          const aiData = await aiRes.json();
          letter = aiData.content?.[0]?.text || null;
        } catch {}

        await sendMonthlyLetter(profile.email, {
          monthName,
          year,
          stats: { totalTrades: monthTrades.length, wins: wins.length, losses: monthTrades.length - wins.length, winRate, totalPL, bestTrade, worstTrade },
          letter,
        });
      }
    }

    return true;
  };

  const results = await Promise.allSettled(profiles.map(processUser));
  const sent = results.filter(r => r.status === "fulfilled" && r.value).length;
  res.status(200).json({ sent, total: profiles.length, monthly: doMonthly });
}
