import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const DAILY_LIMIT = 3;
const today = () => new Date().toISOString().slice(0, 10);

const getDailyUsage = (userId) => {
  try {
    const raw = localStorage.getItem(`ai_daily_${userId}`);
    if (!raw) return { date: "", count: 0 };
    return JSON.parse(raw);
  } catch { return { date: "", count: 0 }; }
};
const saveDailyUsage = (userId, data) => {
  try { localStorage.setItem(`ai_daily_${userId}`, JSON.stringify(data)); } catch {}
};

export default function AIInsights({ plList, t, mobile }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [insightsAt, setInsightsAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    if (!user) return;
    const usage = getDailyUsage(user.id);
    setUsedToday(usage.date === today() ? usage.count : 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("ai_insights, ai_insights_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.ai_insights) {
          setInsights(data.ai_insights);
          setInsightsAt(data.ai_insights_at);
        }
      });
  }, [user]);

  const analysePatterns = async () => {
    if (plList.length < 3) {
      setError("Add at least 3 trades to generate insights.");
      return;
    }
    const usage = getDailyUsage(user?.id);
    const todayCount = usage.date === today() ? usage.count : 0;
    if (todayCount >= DAILY_LIMIT) {
      setError(`Daily limit reached (${DAILY_LIMIT} analyses/day). Resets at midnight.`);
      return;
    }
    setLoading(true);
    setError(null);
    setInsights(null);

    const summary = plList.map((tr) => ({
      date: tr.date,
      ticker: tr.ticker,
      strategy: tr.strategy,
      type: tr.type,
      pl: tr.pl,
      emotion: tr.emotion,
      mistake: tr.mistake,
      tags: tr.tags,
      direction: tr.direction,
      dayOfWeek: new Date(tr.date).toLocaleDateString("en-US", { weekday: "long" }),
      hour: new Date(tr.date).getHours(),
    }));

    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const wins = plList.filter((t) => t.pl > 0);
    const losses = plList.filter((t) => t.pl < 0);
    const winRate = ((wins.length / plList.length) * 100).toFixed(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are an expert trading coach analysing a trader's journal data. Identify patterns, weaknesses and strengths. Be specific with numbers and percentages from the data.

Here is their trade history:
${JSON.stringify(summary, null, 2)}

Overall stats:
- Total trades: ${plList.length}
- Win rate: ${winRate}%
- Total P&L: $${totalPL.toFixed(0)}
- Avg win: $${wins.length ? (wins.reduce((s, t) => s + t.pl, 0) / wins.length).toFixed(0) : 0}
- Avg loss: $${losses.length ? (losses.reduce((s, t) => s + t.pl, 0) / losses.length).toFixed(0) : 0}

Return ONLY a JSON object with no markdown, no backticks, no preamble. Use exactly this structure:
{
  "score": <overall trader score 0-100>,
  "scoreLabel": "<one word label like Developing/Consistent/Strong/Elite>",
  "patterns": [
    {
      "type": "warning|strength|neutral",
      "title": "<short title>",
      "detail": "<specific insight with numbers from the data>",
      "action": "<one concrete recommended action>"
    }
  ]
}
Provide 4-6 patterns. Be brutally honest but constructive.`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (response.status === 429) {
        setError(data.error || "Daily limit reached. Resets at midnight.");
        setLoading(false);
        return;
      }
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      if (!data.content) throw new Error("Empty response from API");
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const now = new Date().toISOString();
      setInsights(parsed);
      setInsightsAt(now);
      const newCount = todayCount + 1;
      saveDailyUsage(user?.id, { date: today(), count: newCount });
      setUsedToday(newCount);
      if (user) {
        await supabase
          .from("profiles")
          .update({ ai_insights: parsed, ai_insights_at: now })
          .eq("id", user.id);
      }
    } catch (e) {
      setError("Could not generate insights. Please try again. " + e.message);
    }
    setLoading(false);
  };

  const scoreColor = insights
    ? insights.score >= 70 ? t.accent : insights.score >= 40 ? "#f59e0b" : t.danger
    : t.text3;

  return (
    <div>
      {/* ── AI Pattern Detector header ───────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            AI Pattern Detector
          </div>
          <div style={{ fontSize: 13, color: t.text3 }}>
            Powered by Claude · Based on {plList.length} trades
          </div>
          {insightsAt && (
            <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>
              Last analysed {new Date(insightsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < usedToday ? t.text3 : t.accent, opacity: i < usedToday ? 0.3 : 1 }} />
            ))}
            <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", marginLeft: 4 }}>
              {DAILY_LIMIT - usedToday}/{DAILY_LIMIT} remaining today
            </span>
          </div>
        </div>
        <button
          onClick={analysePatterns}
          disabled={loading || usedToday >= DAILY_LIMIT}
          style={{ background: usedToday >= DAILY_LIMIT ? t.card2 : t.accent, border: `1px solid ${usedToday >= DAILY_LIMIT ? t.border : "transparent"}`, color: usedToday >= DAILY_LIMIT ? t.text3 : "#000", borderRadius: 8, padding: "8px 16px", cursor: (loading || usedToday >= DAILY_LIMIT) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Analysing..." : usedToday >= DAILY_LIMIT ? "Limit reached" : "↻ Re-analyse"}
        </button>
      </div>

      {loading && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 48, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: t.accent, marginBottom: 8 }}>
            Analysing your trading patterns...
          </div>
          <div style={{ fontSize: 12, color: t.text3 }}>Claude is reviewing your trade history</div>
        </div>
      )}

      {error && (
        <div style={{ background: t.danger + "10", border: `1px solid ${t.danger}30`, borderRadius: 12, padding: 20, color: t.danger, fontSize: 13, fontFamily: "'Space Mono',monospace", marginBottom: 24 }}>
          ⚠ {error}
        </div>
      )}

      {insights && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${scoreColor}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{insights.score}</div>
                <div style={{ fontSize: 9, color: t.text3, textTransform: "uppercase", letterSpacing: 1 }}>score</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: scoreColor, marginBottom: 4 }}>{insights.scoreLabel}</div>
                <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Overall trader rating based on consistency, discipline and execution</div>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Pattern Summary</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["warning", t.danger, "⚠ Warnings"], ["strength", t.accent, "✓ Strengths"], ["neutral", t.text3, "○ Neutral"]].map(([type, color, label]) => (
                  <div key={type} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color }}>{insights.patterns.filter((p) => p.type === type).length}</div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.patterns.map((p, i) => {
              const color = p.type === "warning" ? t.danger : p.type === "strength" ? t.accent : t.text3;
              const icon = p.type === "warning" ? "⚠" : p.type === "strength" ? "✓" : "○";
              return (
                <div key={i} style={{ background: t.surface, border: `1px solid ${color}25`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${color}15`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color, marginBottom: 5 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6 }}>{p.detail}</div>
                    </div>
                  </div>
                  <div style={{ padding: "11px 18px", background: color + "08", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 11, color, fontFamily: "'Space Mono',monospace", flexShrink: 0, marginTop: 1 }}>ACTION</span>
                    <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}>{p.action}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, padding: "12px 16px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 11, color: t.text3, lineHeight: 1.6 }}>
              <strong style={{ color: t.text2 }}>Not financial advice.</strong> These insights are generated by AI based on your trade journal data and are for educational and self-reflection purposes only. They do not constitute financial, investment, or trading advice. Always do your own research before making any trading decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
