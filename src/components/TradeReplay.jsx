import { useState, useEffect, useMemo } from "react";
import { calcPL, fmt, fmtDate, typeLabels } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";

export default function TradeReplay({ trades, onClose, t }) {
  const sorted = useMemo(() => [...trades].sort((a, b) => a.date.localeCompare(b.date)), [trades]);
  const [step, setStep] = useState(0);
  const current = sorted[step];
  const runningPL = sorted.slice(0, step + 1).reduce((s, tr) => s + calcPL(tr), 0);
  const pl = calcPL(current);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.stopPropagation(); setStep(s => Math.min(s + 1, sorted.length - 1)); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.stopPropagation(); setStep(s => Math.max(s - 1, 0)); }
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [sorted.length, onClose]);
  if (!current) return null;
  return (
    <div className="backdrop-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 520, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>
            Trade Replay — {step + 1} / {sorted.length}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ height: 4, background: t.border, borderRadius: 2, marginBottom: 20 }}>
          <div style={{ height: "100%", width: `${((step + 1) / sorted.length) * 100}%`, background: t.accent, borderRadius: 2, transition: "width 0.2s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: t.text }}>{current.ticker}</div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>{current.strategy} · {current.type} · {fmtDate(current.date)}</div>
            <div style={{ fontSize: 12, color: current.direction === "long" ? t.accent : t.danger, marginTop: 3, fontFamily: "'Space Mono',monospace" }}>{(current.direction || "").toUpperCase()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 24, fontWeight: 700, color: pl >= 0 ? t.accent : t.danger }}>{pl >= 0 ? "+" : ""}{fmt(pl)}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>Running: <span style={{ color: runningPL >= 0 ? t.accent : t.danger, fontFamily: "'Space Mono',monospace" }}>{runningPL >= 0 ? "+" : ""}{fmt(runningPL)}</span></div>
          </div>
        </div>
        {STOCK_LIKE.includes(current.type) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Entry", `$${current.entryPrice}`], ["Exit", `$${current.exitPrice || "—"}`], ["Size", `${current.shares} ${typeLabels(current.type).units.toLowerCase()}`]].map(([k, v]) => (
              <div key={k} style={{ background: t.surface, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, color: t.text, fontFamily: "'Space Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {current.emotion && current.emotion !== "None" && (
          <div style={{ fontSize: 12, color: t.text3, marginBottom: 8 }}>Emotion: <span style={{ color: t.text }}>{current.emotion}</span></div>
        )}
        {current.notes && (
          <div style={{ background: t.surface, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: t.text2, marginBottom: 16, lineHeight: 1.5 }}>{current.notes}</div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: step === 0 ? t.text4 : t.text2, borderRadius: 8, padding: 12, cursor: step === 0 ? "not-allowed" : "pointer", fontSize: 13 }}>← Prev</button>
          <button onClick={() => setStep(s => Math.min(s + 1, sorted.length - 1))} disabled={step === sorted.length - 1} style={{ flex: 1, background: step === sorted.length - 1 ? t.card2 : t.accent, border: "none", color: step === sorted.length - 1 ? t.text4 : "#000", borderRadius: 8, padding: 12, cursor: step === sorted.length - 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>Next →</button>
        </div>
        <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 10, fontFamily: "'Space Mono',monospace" }}>Use ← → arrow keys to navigate</div>
      </div>
    </div>
  );
}
