import { useState, useMemo, useEffect } from "react";
import { fmt } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function AIInsights({ plList, t, mobile }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [insightsAt, setInsightsAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      dayOfWeek: new Date(tr.date).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      hour: new Date(tr.date).getHours(),
    }));

    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const wins = plList.filter((t) => t.pl > 0);
    const losses = plList.filter((t) => t.pl < 0);
    const winRate = ((wins.length / plList.length) * 100).toFixed(0);

    try {
const response = await fetch("/api/analyse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
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
- Avg win: $${
                  wins.length
                    ? (
                        wins.reduce((s, t) => s + t.pl, 0) / wins.length
                      ).toFixed(0)
                    : 0
                }
- Avg loss: $${
                  losses.length
                    ? (
                        losses.reduce((s, t) => s + t.pl, 0) / losses.length
                      ).toFixed(0)
                    : 0
                }

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
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      if (!data.content) throw new Error("Empty response from API");
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const now = new Date().toISOString();
      setInsights(parsed);
      setInsightsAt(now);
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
    ? insights.score >= 70
      ? t.accent
      : insights.score >= 40
      ? "#f59e0b"
      : t.danger
    : t.text3;

  // ── Data analytics (no AI tokens needed) ──────────────────────────────
  const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const stratLeaderboard = useMemo(() => {
    const map = {};
    plList.forEach(tr => {
      const s = tr.strategy || "Unknown";
      if (!map[s]) map[s] = { wins: 0, total: 0, pl: 0 };
      map[s].total++;
      map[s].pl += tr.pl;
      if (tr.pl > 0) map[s].wins++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, winRate: d.total ? d.wins / d.total : 0 }))
      .sort((a, b) => b.pl - a.pl);
  }, [plList]);

  const dowBreakdown = useMemo(() => {
    const map = {};
    DAYS_ORDER.forEach(d => { map[d] = { wins: 0, total: 0, pl: 0 }; });
    plList.forEach(tr => {
      const d = new Date(tr.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
      if (map[d]) { map[d].total++; map[d].pl += tr.pl; if (tr.pl > 0) map[d].wins++; }
    });
    return DAYS_ORDER.map(day => ({ day, ...map[day] }));
  }, [plList]);

  const hourHeatmap = useMemo(() => {
    const map = {};
    plList.forEach(tr => {
      if (!tr.entryTime) return;
      const h = parseInt(tr.entryTime.split(":")[0], 10);
      if (isNaN(h)) return;
      if (!map[h]) map[h] = { wins: 0, total: 0, pl: 0 };
      map[h].total++; map[h].pl += tr.pl;
      if (tr.pl > 0) map[h].wins++;
    });
    return map;
  }, [plList]);
  const hasHourData = Object.keys(hourHeatmap).length > 0;
  const maxHourAbsPL = hasHourData ? Math.max(...Object.values(hourHeatmap).map(h => Math.abs(h.pl)), 1) : 1;
  const activeHours = hasHourData
    ? Array.from({ length: 24 }, (_, i) => i).filter(h => hourHeatmap[h])
    : [];

  const sectionLabel = (label) => (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>{label}</div>
  );

  return (
    <div>
      {/* ── AI Pattern Detector ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
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
        </div>
        <button
          onClick={analysePatterns}
          disabled={loading}
          style={{
            background: t.accent,
            border: "none",
            color: "#000",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Space Mono',monospace",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Analysing..." : "↻ Re-analyse"}
        </button>
      </div>

      {loading && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 13,
              color: t.accent,
              marginBottom: 8,
            }}
          >
            Analysing your trading patterns...
          </div>
          <div style={{ fontSize: 12, color: t.text3 }}>
            Claude is reviewing your trade history
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: t.danger + "10",
            border: `1px solid ${t.danger}30`,
            borderRadius: 12,
            padding: 20,
            color: t.danger,
            fontSize: 13,
            fontFamily: "'Space Mono',monospace",
            marginBottom: 24,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {insights && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: `3px solid ${scoreColor}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 22,
                    fontWeight: 700,
                    color: scoreColor,
                    lineHeight: 1,
                  }}
                >
                  {insights.score}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  score
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 18,
                    fontWeight: 700,
                    color: scoreColor,
                    marginBottom: 4,
                  }}
                >
                  {insights.scoreLabel}
                </div>
                <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>
                  Overall trader rating based on consistency, discipline and execution
                </div>
              </div>
            </div>
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: t.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                Pattern Summary
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  ["warning", t.danger, "⚠ Warnings"],
                  ["strength", t.accent, "✓ Strengths"],
                  ["neutral", t.text3, "○ Neutral"],
                ].map(([type, color, label]) => (
                  <div key={type} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 22,
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {insights.patterns.filter((p) => p.type === type).length}
                    </div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.patterns.map((p, i) => {
              const color =
                p.type === "warning"
                  ? t.danger
                  : p.type === "strength"
                  ? t.accent
                  : t.text3;
              const icon =
                p.type === "warning" ? "⚠" : p.type === "strength" ? "✓" : "○";
              return (
                <div
                  key={i}
                  style={{
                    background: t.surface,
                    border: `1px solid ${color}25`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 18px",
                      borderBottom: `1px solid ${color}15`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          color,
                          marginBottom: 5,
                        }}
                      >
                        {p.title}
                      </div>
                      <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6 }}>
                        {p.detail}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "11px 18px",
                      background: color + "08",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color,
                        fontFamily: "'Space Mono',monospace",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      ACTION
                    </span>
                    <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}>
                      {p.action}
                    </div>
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

      {/* ── Strategy Leaderboard ───────────────────────────────────────── */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        {sectionLabel("Strategy Leaderboard")}
        {stratLeaderboard.length === 0 ? (
          <div style={{ fontSize: 13, color: t.text4, fontStyle: "italic" }}>Log trades with strategies to see rankings.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stratLeaderboard.map((s, i) => {
              const winPct = Math.round(s.winRate * 100);
              const plColor = s.pl >= 0 ? t.accent : t.danger;
              const rankColors = ["#f59e0b", t.text3, "#cd7f32"];
              return (
                <div key={s.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: i < 3 ? rankColors[i] : t.text4, fontWeight: 700, textAlign: "center" }}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: t.text3 }}>{s.total} trade{s.total !== 1 ? "s" : ""} · {winPct}% win</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: t.border, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${winPct}%`, borderRadius: 3, background: winPct >= 50 ? t.accent : t.danger, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: plColor, minWidth: 64, textAlign: "right" }}>
                    {s.pl >= 0 ? "+" : ""}{fmt(s.pl)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Day of Week Breakdown ──────────────────────────────────────── */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        {sectionLabel("Day of Week")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: mobile ? 6 : 10 }}>
          {dowBreakdown.map(({ day, total, wins, pl }) => {
            const winRate = total ? Math.round((wins / total) * 100) : null;
            const avgPL = total ? pl / total : 0;
            const hasData = total > 0;
            const bg = !hasData ? t.border + "30"
              : avgPL > 0 ? t.accent + Math.round(Math.min(0.9, avgPL / 200) * 255).toString(16).padStart(2,"0") + "30"
              : t.danger + "30";
            const borderCol = !hasData ? t.border
              : avgPL > 0 ? t.accent + "50" : t.danger + "50";
            return (
              <div key={day} style={{ background: bg, border: `1px solid ${borderCol}`, borderRadius: 8, padding: mobile ? "8px 4px" : "10px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, marginBottom: 6 }}>{day}</div>
                {hasData ? (
                  <>
                    <div style={{ fontSize: mobile ? 13 : 15, fontWeight: 700, color: avgPL >= 0 ? t.accent : t.danger, fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
                      {winRate}%
                    </div>
                    <div style={{ fontSize: 10, color: t.text3, marginTop: 4 }}>{total}t</div>
                    <div style={{ fontSize: 10, color: avgPL >= 0 ? t.accent : t.danger, marginTop: 2, fontFamily: "'Space Mono',monospace" }}>
                      {avgPL >= 0 ? "+" : ""}{fmt(avgPL)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 16, color: t.border }}>—</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: t.text4, marginTop: 10 }}>Win rate % · avg P/L per day</div>
      </div>

      {/* ── Hour Heatmap ───────────────────────────────────────────────── */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
        {sectionLabel("Best Time to Trade")}
        {!hasHourData ? (
          <div style={{ fontSize: 13, color: t.text4 }}>
            Add entry times when logging trades to unlock hourly performance data.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeHours
              .sort((a, b) => hourHeatmap[b].pl - hourHeatmap[a].pl)
              .map(h => {
                const d = hourHeatmap[h];
                const isGood = d.pl >= 0;
                const color = isGood ? t.accent : t.danger;
                const winPct = Math.round((d.wins / d.total) * 100);
                const barWidth = Math.round((Math.abs(d.pl) / maxHourAbsPL) * 100);
                const label = h === 0 ? "12:00" : h < 10 ? `0${h}:00` : `${h}:00`;
                const avgPL = d.pl / d.total;
                return (
                  <div key={h}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: t.text, fontWeight: 700, minWidth: 44 }}>{label}</span>
                        <span style={{ fontSize: 12, color: color, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{winPct}%</span>
                        <span style={{ fontSize: 11, color: t.text3 }}>{d.total} trade{d.total !== 1 ? "s" : ""}</span>
                      </div>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color }}>
                        {avgPL >= 0 ? "+" : ""}{fmt(avgPL)} avg
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: t.border2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>Sorted by total P&L · bar shows relative performance</div>
          </div>
        )}
      </div>

    </div>
  );
}
