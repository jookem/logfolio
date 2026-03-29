import { useMemo, useState } from "react";
import DateInput from "../components/DateInput";
import { WeekIcon } from "../lib/icons";
import { fmt, fmtDate } from "../lib/utils";

const WEEK_OPTIONS = [4, 8, 12, 26, 52];

export default function WeeklyReview({ plList, t, mobile }) {
  const [limit, setLimit] = useState(8);
  const [jumpDate, setJumpDate] = useState("");

  const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  };
  const weeks = useMemo(() => {
    const map = {};
    plList.forEach((tr) => {
      const ws = getWeekStart(tr.date);
      if (!map[ws]) map[ws] = { trades: [], pl: 0, wins: 0 };
      map[ws].trades.push(tr);
      map[ws].pl += tr.pl;
      if (tr.pl > 0) map[ws].wins++;
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [plList]);
  if (!weeks.length)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: t.text4,
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
        }}
      >
        No trades to review yet.
      </div>
    );

  const jumpWeekStart = jumpDate ? getWeekStart(jumpDate) : null;
  const visibleWeeks = jumpWeekStart
    ? weeks.filter(([ws]) => ws === jumpWeekStart)
    : limit === "all" ? weeks : weeks.slice(0, limit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>Week</span>
          <DateInput
            t={t}
            icon={WeekIcon}
            value={jumpDate}
            onChange={(e) => { setJumpDate(e.target.value); }}
            style={{ background: jumpDate ? t.accent + "15" : t.card2, border: `1px solid ${jumpDate ? t.accent : t.border}`, color: jumpDate ? t.accent : t.text3, borderRadius: 6, padding: "4px 8px 4px 8px", fontSize: 11, fontFamily: "'Space Mono', monospace", cursor: "pointer", outline: "none" }}
          />
          {jumpDate && (
            <button onClick={() => setJumpDate("")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>Show</span>
          <div style={{ display: "flex", gap: 6 }}>
            {WEEK_OPTIONS.map(n => (
              <button key={n} onClick={() => { setLimit(n); setJumpDate(""); }} style={{ background: !jumpDate && limit === n ? t.accent + "20" : "none", border: `1px solid ${!jumpDate && limit === n ? t.accent : t.border}`, color: !jumpDate && limit === n ? t.accent : t.text3, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{n}W</button>
            ))}
            <button onClick={() => { setLimit("all"); setJumpDate(""); }} style={{ background: !jumpDate && limit === "all" ? t.accent + "20" : "none", border: `1px solid ${!jumpDate && limit === "all" ? t.accent : t.border}`, color: !jumpDate && limit === "all" ? t.accent : t.text3, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>All</button>
          </div>
        </div>
      </div>
      {jumpDate && visibleWeeks.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: t.text4, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
          No trades found for the week of {fmtDate(jumpWeekStart)}.
        </div>
      )}
      {visibleWeeks.map(([weekStart, data]) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `${fmtDate(weekStart)} – ${fmtDate(weekEnd.toISOString().slice(0, 10))}`;
        const best = data.trades.reduce(
          (b, tr) => (tr.pl > b.pl ? tr : b),
          data.trades[0]
        );
        const worst = data.trades.reduce(
          (w, tr) => (tr.pl < w.pl ? tr : w),
          data.trades[0]
        );
        const mistakes = data.trades.filter((tr) => tr.mistake !== "None");
        return (
          <div
            key={weekStart}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${t.border}`,
                background: data.pl >= 0 ? t.accent + "08" : t.danger + "08",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: t.text3,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Week of {label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 20,
                    fontWeight: 700,
                    color: data.pl >= 0 ? t.accent : t.danger,
                  }}
                >
                  {data.pl >= 0 ? "+" : ""}
                  {fmt(data.pl)}
                </span>
                <span style={{ fontSize: 13, color: t.text3 }}>
                  {data.trades.length} trades · {data.wins}W{" "}
                  {data.trades.length - data.wins}L ·{" "}
                  {((data.wins / data.trades.length) * 100).toFixed(0)}% WR
                </span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
                gap: 0,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRight: `1px solid ${t.border}`,
                  borderBottom: mobile ? `1px solid ${t.border}` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 5,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Best
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: t.accent,
                    fontWeight: 700,
                  }}
                >
                  {best.ticker} {fmt(best.pl)}
                </div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                  {best.strategy}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRight: mobile ? "none" : `1px solid ${t.border}`,
                  borderBottom: mobile ? `1px solid ${t.border}` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 5,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Worst
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: t.danger,
                    fontWeight: 700,
                  }}
                >
                  {worst.ticker} {fmt(worst.pl)}
                </div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                  {worst.strategy}
                </div>
              </div>
              {!mobile && (
                <div style={{ padding: "12px 16px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: t.text3,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 5,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    Strategies
                  </div>
                  <div
                    style={{ fontSize: 12, color: t.text2, lineHeight: 1.6 }}
                  >
                    {[...new Set(data.trades.map((tr) => tr.strategy))].join(
                      ", "
                    )}
                  </div>
                </div>
              )}
            </div>
            {mistakes.length > 0 && (
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: `1px solid ${t.border}`,
                  background: t.danger + "06",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: t.danger,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ⚠ {mistakes.length} mistake{mistakes.length > 1 ? "s" : ""}:{" "}
                </span>
                <span style={{ fontSize: 12, color: t.text3 }}>
                  {[...new Set(mistakes.map((m) => m.mistake))].join(", ")}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
