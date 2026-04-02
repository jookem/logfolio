import { useState, useRef, useEffect } from "react";
import { calcPL } from "../lib/utils";

const ANIM_CSS = `
@keyframes lf-draw { to { stroke-dashoffset: 0; } }
@keyframes lf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lf-fade-half { to { opacity: 0.5; } }
`;

export default function EquityCurve({ trades, t, spyData, spyError }) {
  const [range, setRange] = useState("ALL");
  const wrapperRef = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const [annotations, setAnnotations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lf_annotations") || "{}"); } catch { return {}; }
  });
  const [pendingAnnotation, setPendingAnnotation] = useState(null); // { date, x, y, inputVal }

  const saveAnnotations = (next) => {
    setAnnotations(next);
    localStorage.setItem("lf_annotations", JSON.stringify(next));
  };
  const allSorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));

  const cutoffDate = (() => {
    if (range === "ALL") return null;
    const d = new Date();
    if (range === "1D") d.setDate(d.getDate() - 1);
    else if (range === "1W") d.setDate(d.getDate() - 7);
    else if (range === "1M") d.setMonth(d.getMonth() - 1);
    else if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const sorted = cutoffDate ? allSorted.filter(tr => tr.date >= cutoffDate) : allSorted;

  let running = 0;
  const points = [{ val: 0, date: null }, ...sorted.map((tr) => {
    running += calcPL(tr);
    return { val: running, date: tr.date };
  })];

  const RANGES = ["1D", "1W", "1M", "1Y", "ALL"];
  const rangeSelector = (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 8 }}>
      {RANGES.map(r => (
        <button key={r} onClick={() => setRange(r)} style={{
          background: range === r ? t.accent + "25" : "transparent",
          border: `1px solid ${range === r ? t.accent : t.border}`,
          color: range === r ? t.accent : t.text3,
          borderRadius: 5, padding: "2px 8px", fontSize: 10,
          fontFamily: "'Space Mono',monospace", cursor: "pointer",
        }}>{r}</button>
      ))}
    </div>
  );

  if (points.length < 3)
    return (
      <div>
        {rangeSelector}
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: t.text3, fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
          {range !== "ALL" ? "No trades in this period" : "Add more trades to see curve"}
        </div>
      </div>
    );

  const W = 500, H = 200;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);

  // Equity Y scale from its own P/L range
  const eMin = Math.min(...points.map(p => p.val));
  const eMax = Math.max(...points.map(p => p.val));
  const eRange = eMax - eMin || 1;
  const ys = points.map((p) => H - ((p.val - eMin) / eRange) * H);
  const path = points.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]},${ys[i]}`).join(" ");

  // Y-axis ticks (shared between grid lines and labels)
  const yTickVals = Array.from({ length: 5 }, (_, i) => eMin + (i / 4) * eRange);

  // SPY: anchored at zeroY (where P/L=0 sits on the equity axis), scaled so its
  // full swing occupies 45% of chart height — always visible, never dominates
  let spyPath = null;
  let spyReturnPct = null;
  let lastSpyY = null;
  let lastSpyPrice = null;
  const filteredSpy = cutoffDate ? spyData?.filter(s => s.date >= cutoffDate) : spyData;
  if (filteredSpy?.length >= 2 && sorted.length >= 2) {
    const base = filteredSpy[0].close;
    const spyRets = points.map((pt) => {
      if (!pt.date) return 0;
      const match = filteredSpy.filter(s => s.date <= pt.date);
      if (!match.length) return null;
      return (match[match.length - 1].close - base) / base;
    });
    const validRets = spyRets.filter(v => v != null);
    if (validRets.length >= 2) {
      spyReturnPct = validRets.at(-1) * 100;
      const maxAbsSpy = Math.max(...validRets.map(Math.abs)) || 0.001;
      const zeroY = H - ((0 - eMin) / eRange) * H;
      const spyScale = (H * 0.45) / maxAbsSpy;
      const spyYs = spyRets.map(r =>
        r != null ? Math.max(0, Math.min(H, zeroY - r * spyScale)) : null
      );
      const segs = spyYs.map((y, i) => y != null ? `${i === 0 ? "M" : "L"} ${xs[i]},${y}` : null).filter(Boolean);
      if (segs.length >= 2) {
        spyPath = segs.join(" ");
        // Track last valid SPY Y position and price for the "$Price" label
        let lastValidIdx = -1;
        spyYs.forEach((y, i) => { if (y != null) lastValidIdx = i; });
        if (lastValidIdx >= 0) {
          lastSpyY = spyYs[lastValidIdx];
          const ptDate = points[lastValidIdx]?.date;
          if (ptDate) {
            const match = filteredSpy.filter(s => s.date <= ptDate);
            if (match.length) lastSpyPrice = match[match.length - 1].close;
          }
        }
      }
    }
  }

  // Tick positions — always computed so vertical lines always show
  const datePts = points.filter(p => p.date);
  const tickIdxs = [0, Math.floor(datePts.length / 3), Math.floor(datePts.length * 2 / 3), datePts.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i && datePts[v]);
  const showDateLabels = range !== "1D";
  const fmtDate = d => { const [y, m, dd] = d.split("-"); return `${m}/${dd}/${y.slice(2)}`; };

  return (
    <div ref={wrapperRef}>
      <style>{ANIM_CSS}</style>
      {/* Range selector */}
      {rangeSelector}

      {/* Chart wrapper — position:relative for absolute labels */}
      <div style={{ position: "relative" }}>
        <svg
          key={inView ? range : "__pre"}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: 200, cursor: "crosshair", overflow: "visible" }}
          preserveAspectRatio="none"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * W;
            const nearestIdx = xs.reduce((best, x, i) => Math.abs(x - clickX) < Math.abs(xs[best] - clickX) ? i : best, 0);
            if (nearestIdx > 0 && points[nearestIdx]?.date) {
              const date = points[nearestIdx].date;
              if (annotations[date]) { const n = { ...annotations }; delete n[date]; saveAnnotations(n); }
              else setPendingAnnotation({ date, x: xs[nearestIdx], y: ys[nearestIdx], inputVal: "" });
            }
          }}
        >
          <defs>
            <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Horizontal grid lines (matches SharpeRatioCurve style) */}
          {yTickVals.map((v, i) => (
            <line key={`hy${i}`} x1={0} x2={W} y1={H - ((v - eMin) / eRange) * H} y2={H - ((v - eMin) / eRange) * H} stroke={t.border} strokeWidth={0.5} />
          ))}
          {/* Vertical tick lines */}
          {tickIdxs.map(idx => {
            const pt = datePts[idx];
            const ptIdx = points.findIndex(p => p.date === pt.date);
            if (ptIdx < 0) return null;
            return <line key={idx} x1={xs[ptIdx]} y1={0} x2={xs[ptIdx]} y2={H} stroke={t.border} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.6" />;
          })}
          {/* Axis borders */}
          <line x1={0} x2={0} y1={0} y2={H} stroke={t.border} strokeWidth={1} />
          <line x1={0} x2={W} y1={H} y2={H} stroke={t.border} strokeWidth={1} />
          {/* Gradient fill — fade in */}
          <path
            d={`${path} L ${xs[xs.length - 1]},${H} L 0,${H} Z`}
            fill="url(#eg)"
            style={{ opacity: 0, animation: "lf-fade 1.4s cubic-bezier(0.4,0,0.2,1) forwards" }}
          />
          {/* Main equity curve — draw animation */}
          <path
            pathLength="1"
            d={path}
            fill="none"
            stroke={t.accent}
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "lf-draw 1.4s cubic-bezier(0.4,0,0.2,1) forwards" }}
          />
          {/* Trade dots — fade in after line finishes */}
          {points.map((p, i) => i > 0 && (
            <circle key={i} cx={xs[i]} cy={ys[i]} r="2.5" fill={t.accent}
              style={{ opacity: 0, animation: "lf-fade-half 0.4s ease 1.2s forwards" }}
            />
          ))}
          {/* SPY overlay — fade in with delay */}
          {spyPath && (
            <path
              d={spyPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              strokeLinejoin="round"
              style={{ opacity: 0, animation: "lf-fade 0.8s ease 0.6s forwards" }}
            />
          )}
          {/* Annotations */}
          {points.map((p, i) => {
            if (!p.date || !annotations[p.date]) return null;
            return (
              <g key={p.date}>
                <line x1={xs[i]} y1={ys[i] - 6} x2={xs[i]} y2={ys[i] - 20} stroke={t.accent} strokeWidth="1.5" />
                <circle cx={xs[i]} cy={ys[i] - 22} r="6" fill={t.accent} opacity="0.9" />
                <title>{annotations[p.date]}</title>
              </g>
            );
          })}
        </svg>

        {/* Y-axis P/L labels (left side, matching SharpeRatioCurve) */}
        {yTickVals.map((v, i) => (
          <span key={i} style={{
            position: "absolute", left: 4, top: `${((H - ((v - eMin) / eRange) * H) / H) * 100}%`,
            transform: "translateY(-50%)", fontSize: 9, color: t.text3,
            fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            {v >= 0 ? "+" : ""}{Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`}
          </span>
        ))}

        {/* $Price label at right end of SPY line */}
        {spyPath && lastSpyY != null && (
          <div style={{
            position: "absolute", right: 2, top: `${(lastSpyY / H) * 100}%`,
            transform: "translateY(-50%)", fontSize: 8, color: "#3B82F6",
            fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap",
            pointerEvents: "none", opacity: 0.9,
            background: `${t.surface ?? t.card ?? "#111"}cc`,
            padding: "1px 3px", borderRadius: 3,
          }}>
            {lastSpyPrice != null ? `$${lastSpyPrice.toFixed(0)}` : "$ Price"}
          </div>
        )}
      </div>

      {pendingAnnotation && (
        <div style={{ marginTop: 6, background: t.card, border: `1px solid ${t.accent}50`, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap" }}>{pendingAnnotation.date}</span>
          <input
            autoFocus
            value={pendingAnnotation.inputVal}
            onChange={e => setPendingAnnotation(p => ({ ...p, inputVal: e.target.value }))}
            onKeyDown={e => {
              if (e.key === "Enter" && pendingAnnotation.inputVal.trim()) {
                saveAnnotations({ ...annotations, [pendingAnnotation.date]: pendingAnnotation.inputVal.trim() });
                setPendingAnnotation(null);
              }
              if (e.key === "Escape") setPendingAnnotation(null);
            }}
            placeholder="Add note… (Enter to save)"
            style={{ flex: 1, background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 6, color: t.text, padding: "4px 8px", fontSize: 12, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={() => setPendingAnnotation(null)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* X-axis date labels — hidden on 1D (all same date, no intraday time data) */}
      <div style={{ position: "relative", height: 16, marginTop: 2 }}>
        {showDateLabels && tickIdxs.map(idx => {
          const pt = datePts[idx];
          const ptIdx = points.findIndex(p => p.date === pt.date);
          const xPct = ptIdx >= 0 ? (ptIdx / (points.length - 1)) * 100 : null;
          if (xPct == null) return null;
          const isFirst = idx === tickIdxs[0];
          const isLast = idx === tickIdxs[tickIdxs.length - 1];
          const anchor = isFirst ? "translateX(0%)" : isLast ? "translateX(-100%)" : "translateX(-50%)";
          return (
            <span key={idx} style={{
              position: "absolute",
              left: `${xPct}%`,
              transform: anchor,
              fontSize: 9,
              color: t.text3,
              fontFamily: "'Space Mono',monospace",
              whiteSpace: "nowrap",
            }}>{fmtDate(pt.date)}</span>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 2, background: t.accent, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace" }}>Your P/L</span>
        </div>
        {spyPath ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: "#3B82F6", borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace" }}>
              SPY {spyReturnPct != null ? `(${spyReturnPct >= 0 ? "+" : ""}${spyReturnPct.toFixed(1)}%)` : ""}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", opacity: 0.5 }}>
            {spyError ? "SPY unavailable" : "Loading SPY..."}
          </span>
        )}
        <span style={{ fontSize: 10, color: t.text4, fontFamily: "'Space Mono',monospace", marginLeft: "auto" }}>click chart to annotate</span>
      </div>
    </div>
  );
}
