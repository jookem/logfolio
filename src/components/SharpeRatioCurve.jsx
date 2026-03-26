import { useState, useMemo } from "react";
import { fmt } from "../lib/utils";

const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#a855f7"];

export default function SharpeRatioCurve({ trades, t }) {
  const [mode, setMode] = useState("strategy");

  const curves = useMemo(() => {
    const keys = mode === "strategy"
      ? [...new Set(trades.map(tr => tr.strategy).filter(Boolean))]
      : [...new Set(trades.map(tr => tr.ticker).filter(Boolean))];
    return keys
      .map((key, si) => {
        const group = [...trades.filter(tr => (mode === "strategy" ? tr.strategy : tr.ticker) === key)]
          .sort((a, b) => a.date.localeCompare(b.date));
        let cum = 0;
        const points = [{ date: group[0].date, cum: 0 }];
        group.forEach(tr => { cum += tr.pl; points.push({ date: tr.date, cum }); });
        return { label: key, points, color: COLORS[si % COLORS.length], count: group.length };
      })
      .sort((a, b) => b.count - a.count);
  }, [trades, mode]);

  if (curves.length === 0) return null;

  const W = 500; const H = 210; const PAD_T = 16;
  const iH = H - PAD_T;
  const allDates = curves.flatMap(c => c.points.map(p => p.date));
  const minTs = Math.min(...allDates.map(d => new Date(d).getTime()));
  const maxTs = Math.max(...allDates.map(d => new Date(d).getTime()));
  const tsRange = maxTs - minTs || 1;
  const allCums = curves.flatMap(c => c.points.map(p => p.cum));
  const minCum = Math.min(...allCums, 0);
  const maxCum = Math.max(...allCums, 0);
  const cumPad = (maxCum - minCum) * 0.12 || 10;
  const minY = minCum - cumPad; const maxY = maxCum + cumPad;
  const xS = dateStr => ((new Date(dateStr).getTime() - minTs) / tsRange) * W;
  const yS = v => PAD_T + iH - ((v - minY) / (maxY - minY)) * iH;
  const zeroY = yS(0);
  const fmtTick = ts => new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const xTicks = Array.from({ length: 5 }, (_, i) => minTs + (i / 4) * tsRange);
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + (i / 4) * (maxY - minY));

  const btnStyle = (active) => ({
    background: active ? t.accent + "25" : "transparent",
    border: `1px solid ${active ? t.accent : t.border}`,
    color: active ? t.accent : t.text3,
    borderRadius: 5, padding: "2px 10px", fontSize: 10,
    fontFamily: "'Space Mono',monospace", cursor: "pointer",
  });

  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Sharpe Ratio Curve</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={btnStyle(mode === "strategy")} onClick={() => setMode("strategy")}>Strategy</button>
          <button style={btnStyle(mode === "ticker")} onClick={() => setMode("ticker")}>Ticker</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: t.text3, marginBottom: 16 }}>Cumulative P/L over time. Same slope but less wiggle = better Sharpe ratio.</div>
      <div style={{ position: "relative" }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
          {yTicks.map((v, i) => (
            <line key={i} x1={0} x2={W} y1={yS(v)} y2={yS(v)} stroke={t.border} strokeWidth={0.5} />
          ))}
          <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke={t.text3} strokeWidth={1} strokeDasharray="4 3" />
          {curves.map(({ label, points, color }) => {
            const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(p.date).toFixed(1)},${yS(p.cum).toFixed(1)}`).join(" ");
            return <path key={label} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />;
          })}
          {curves.map(({ label, points, color }) => {
            const last = points[points.length - 1];
            return <circle key={label} cx={xS(last.date)} cy={yS(last.cum)} r={4} fill={color} />;
          })}
          <line x1={0} x2={0} y1={PAD_T} y2={H} stroke={t.border} strokeWidth={1} />
          <line x1={0} x2={W} y1={H} y2={H} stroke={t.border} strokeWidth={1} />
        </svg>
        {yTicks.map((v, i) => (
          <span key={i} style={{ position: "absolute", left: 4, top: `${(yS(v) / H) * 100}%`, transform: "translateY(-50%)", fontSize: 9, color: t.text3, fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap", pointerEvents: "none" }}>
            {v >= 0 ? "+" : ""}{v.toFixed(0)}
          </span>
        ))}
        <div style={{ position: "relative", height: 18, marginTop: 3 }}>
          {xTicks.map((ts, i) => (
            <span key={i} style={{ position: "absolute", left: `${(i / 4) * 100}%`, transform: i === 0 ? "translateX(0%)" : i === 4 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 9, color: t.text3, fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap" }}>
              {fmtTick(ts)}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10 }}>
        {curves.map(({ label, color, points }) => {
          const finalCum = points[points.length - 1].cum;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace" }}>
                {label} <span style={{ color: finalCum >= 0 ? t.accent : t.danger }}>({finalCum >= 0 ? "+" : ""}{fmt(finalCum)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
