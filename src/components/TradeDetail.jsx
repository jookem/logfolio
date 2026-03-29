import { useState } from "react";
import { calcPL, fmt, fmtDate, fmtR, typeLabels, calcWeightedExit, calcTotalExited } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";
import Tag from "./Tag";
import { LogIcon, EditIcon, QuickIcon, ShareIcon, CloseIcon, CheckIcon } from "../lib/icons";

export default function TradeDetail({ trade, onClose, onEdit, onExecute, onSave, onShare, t, mobile }) {
  const pl = calcPL(trade);
  const [lightbox, setLightbox] = useState(null);
  const [quickEdit, setQuickEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exitVal, setExitVal] = useState(String(trade.exitPrice ?? ""));
  const [legExits, setLegExits] = useState((trade.legs || []).map(l => String(l.exitPremium ?? "")));
  const qInp = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "5px 9px", fontSize: 13, width: 90, fontFamily: "inherit", outline: "none" };
  const saveQuickEdit = () => {
    if (!onSave) return;
    const updated = STOCK_LIKE.includes(trade.type)
      ? { ...trade, exitPrice: +exitVal }
      : { ...trade, legs: trade.legs.map((l, i) => ({ ...l, exitPremium: +legExits[i] })) };
    onSave(updated);
    setQuickEdit(false);
  };
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.border2}`,
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 20,
                fontWeight: 700,
                color: t.text,
              }}
            >
              {trade.ticker}
            </div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>
              {trade.strategy} · {fmtDate(trade.date)}
            </div>
            {trade.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                {trade.tags.map((tg) => (
                  <Tag key={tg} label={tg} t={t} />
                ))}
              </div>
            )}
          </div>
          <div>
            {!isNaN(pl) ? (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: pl >= 0 ? t.positive : t.danger,
                  textAlign: "right",
                }}
              >
                {pl >= 0 ? "+" : ""}{fmt(pl)}
              </div>
            ) : (
              <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b40", borderRadius: 6, padding: "4px 10px", letterSpacing: 1 }}>
                OPEN
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: mobile ? "nowrap" : "wrap", overflowX: mobile ? "auto" : "visible" }}>
          {trade.status === "planned" && onExecute && (
            <button
              onClick={onExecute}
              style={{
                background: t.accent, border: "none",
                color: "#000", borderRadius: 6, padding: "4px 12px",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}
            >
              <LogIcon size="1em" /> Execute
            </button>
          )}
          <button
            onClick={onEdit}
            style={{
              background: "none", border: `1px solid ${t.border}`,
              color: t.text3, borderRadius: 6, padding: "4px 10px",
              cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}
          >
            <EditIcon size="1em" /> Edit
          </button>
          {trade.status !== "planned" && onSave && (
            <button
              onClick={() => setQuickEdit(q => !q)}
              style={{ background: quickEdit ? t.accent+"20" : "none", border: `1px solid ${t.border}`, color: quickEdit ? t.accent : t.text3, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <QuickIcon size="1em" /> Quick Edit
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <ShareIcon size="1em" /> Share
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none", border: `1px solid ${t.border}`,
              color: t.text3, borderRadius: 6, padding: "4px 10px",
              cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}
          >
            <CloseIcon size="1em" /> Close
          </button>
        </div>
      </div>
      {quickEdit && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          {STOCK_LIKE.includes(trade.type) ? (
            <div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Exit Price $</div>
              <input style={qInp} type="number" value={exitVal} onChange={e => setExitVal(e.target.value)} placeholder="0.00" />
            </div>
          ) : (
            (trade.legs || []).map((leg, i) => (
              <div key={i}>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Leg {i+1} Exit $</div>
                <input style={qInp} type="number" value={legExits[i]} onChange={e => { const c = [...legExits]; c[i] = e.target.value; setLegExits(c); }} placeholder="0.00" />
              </div>
            ))
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveQuickEdit} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>Save</button>
            <button onClick={() => setQuickEdit(false)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}
      {STOCK_LIKE.includes(trade.type) ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            ["Entry", fmt(trade.entryPrice)],
            ...(trade.exitPrice ? [["Exit", fmt(trade.exitPrice)]] : []),
            ...(trade.date ? [["Entry Date", trade.date]] : []),
            ...(trade.exitDate ? [["Exit Date", trade.exitDate]] : []),
            ...(trade.entryTime ? [["Entry Time", trade.entryTime]] : []),
            ...(trade.exitTime ? [["Exit Time", trade.exitTime]] : []),
            [typeLabels(trade.type).units, trade.shares],
            ["Direction", trade.direction],
            ...(trade.stopLoss ? [["Stop Loss", fmt(trade.stopLoss)]] : []),
            ...(trade.takeProfit ? [["Take Profit", fmt(trade.takeProfit)]] : []),
            ...(trade.r != null ? [["R-Multiple", fmtR(trade.r), true]] : []),
            ...(trade.plannedR != null ? [["Planned R", `+${trade.plannedR?.toFixed(2)}R`]] : []),
            ...(trade.holdMinutes != null ? [["Hold Time", trade.holdMinutes < 60 ? `${trade.holdMinutes}m` : `${Math.floor(trade.holdMinutes/60)}h ${trade.holdMinutes%60}m`]] : []),
          ].map(([k, v, full]) => (
            <div
              key={k}
              style={{
                background: t.card2,
                borderRadius: 8,
                padding: "11px 14px",
                ...(full ? { gridColumn: "1 / -1" } : {}),
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.text3,
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 14,
                  color: t.text,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {trade.legs?.map((l, i) => (
            <div
              key={i}
              style={{
                background: t.card2,
                borderRadius: 8,
                padding: "11px 14px",
                marginBottom: 7,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: t.text3, marginBottom: 2 }}>
                  LEG {i + 1}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: l.position === "buy" ? t.accent : t.danger,
                    fontWeight: 700,
                  }}
                >
                  {l.position.toUpperCase()} {l.type.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.text3, marginBottom: 2 }}>
                  STRIKE
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ${l.strike}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.text3, marginBottom: 2 }}>
                  ENTRY
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ${l.entryPremium}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.text3, marginBottom: 2 }}>
                  EXIT
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ${l.exitPremium}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.text3, marginBottom: 2 }}>
                  CONTRACTS
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {l.contracts}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: trade.status === "planned" ? "1fr" : "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{ background: t.card2, borderRadius: 8, padding: "11px 14px" }}
        >
          <div
            style={{
              fontSize: 10,
              color: t.text3,
              marginBottom: 3,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Emotion
          </div>
          <div style={{ fontSize: 13, color: t.text }}>{trade.emotion}</div>
        </div>
        {trade.status !== "planned" && (
          <div
            style={{ background: t.card2, borderRadius: 8, padding: "11px 14px" }}
          >
            <div
              style={{
                fontSize: 10,
                color: t.text3,
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Mistake
            </div>
            <div
              style={{
                fontSize: 13,
                color: trade.mistake === "None" ? t.text3 : t.danger,
              }}
            >
              {trade.mistake}
            </div>
          </div>
        )}
      </div>
      {trade.screenshots?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: t.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Chart Screenshots</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {trade.screenshots.map((img) => (
              <img
                key={img.id}
                src={img.src}
                alt="chart"
                onClick={() => setLightbox(img.src)}
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, cursor: "pointer", border: `1px solid ${t.border}` }}
              />
            ))}
          </div>
        </div>
      )}
{trade.voiceNote && (
        <div style={{ background: t.card2, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: t.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Voice Note</div>
          <audio controls src={trade.voiceNote} style={{ width: "100%", height: 36 }} />
        </div>
      )}
      {trade.notes && (
        <div
          style={{ background: t.card2, borderRadius: 8, padding: "12px 14px" }}
        >
          <div
            style={{
              fontSize: 10,
              color: t.text3,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Notes
          </div>
          <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6 }}>
            {trade.notes}
          </div>
        </div>
      )}
      {trade.closes?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: t.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>Scale-Out History</div>
          <div style={{ background: t.card2, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${t.border}` }}>
              {["Date", "Price", "Shares", "P&L"].map(h => (
                <div key={h} style={{ fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Space Mono',monospace" }}>{h}</div>
              ))}
            </div>
            {trade.closes.map((c, i) => {
              const dir = trade.direction === "long" ? 1 : -1;
              const contribution = c.price && c.shares ? dir * (c.price - trade.entryPrice) * c.shares : null;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 10px", borderBottom: i < trade.closes.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ fontSize: 12, color: t.text }}>{c.date || "—"}</div>
                  <div style={{ fontSize: 12, color: t.text, fontFamily: "'Space Mono',monospace" }}>{c.price ? fmt(c.price) : "—"}</div>
                  <div style={{ fontSize: 12, color: t.text }}>{c.shares || "—"}</div>
                  <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: contribution != null ? (contribution >= 0 ? t.positive : t.danger) : t.text3 }}>
                    {contribution != null ? `${contribution >= 0 ? "+" : ""}${fmt(contribution)}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
          {(() => {
            const totalExited = calcTotalExited(trade.closes);
            const remaining = (trade.shares || 0) - totalExited;
            if (remaining <= 0) return null;
            return <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace", marginTop: 6 }}>{remaining} shares remaining open</div>;
          })()}
        </div>
      )}
      {trade.history?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
            {showHistory ? "▾" : "▸"} Edit History ({trade.history.length})
          </button>
          {showHistory && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {[...trade.history].reverse().map((h, i) => (
                <div key={i} style={{ background: t.card2, borderRadius: 7, padding: "8px 12px", fontSize: 11, color: t.text3 }}>
                  <div style={{ color: t.text4, marginBottom: 4, fontFamily: "'Space Mono',monospace" }}>{new Date(h.timestamp).toLocaleString()}</div>
                  {h.before && Object.entries(h.before).map(([k, v]) => {
                    const after = trade[k];
                    if (String(v) === String(after)) return null;
                    return <div key={k} style={{ display: "flex", gap: 8 }}><span style={{ color: t.text3, minWidth: 70, textTransform: "capitalize" }}>{k}:</span><span style={{ color: t.danger, textDecoration: "line-through" }}>{String(v) || "—"}</span><span style={{ color: t.text3 }}>→</span><span style={{ color: t.accent }}>{String(after) || "—"}</span></div>;
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {trade.planSnapshot && trade.status !== "planned" && (() => {
  const snap = trade.planSnapshot;
  const rows = [];
  if (snap.entryPrice) {
    const planned = parseFloat(snap.entryPrice);
    const actual = parseFloat(trade.entryPrice);
    const diff = actual && planned ? ((actual - planned) / planned * 100).toFixed(1) : null;
    rows.push({ label: "Entry Price", planned: `$${planned}`, actual: `$${actual}`, diff: diff !== null ? `${diff > 0 ? "+" : ""}${diff}%` : null, good: diff !== null ? Math.abs(parseFloat(diff)) <= 2 : true });
  }
  if (snap.stopLoss) rows.push({ label: "Stop Loss", planned: `$${snap.stopLoss}`, actual: trade.stopLoss ? `$${trade.stopLoss}` : "—", diff: null, good: !!trade.stopLoss });
  if (snap.takeProfit) rows.push({ label: "Take Profit", planned: `$${snap.takeProfit}`, actual: trade.exitPrice ? `$${trade.exitPrice}` : "—", diff: null, good: trade.exitPrice >= snap.takeProfit });
  if (snap.shares) rows.push({ label: "Size", planned: snap.shares, actual: trade.shares || "—", diff: null, good: String(snap.shares) === String(trade.shares) });
  if (snap.emotion) rows.push({ label: "Emotion", planned: snap.emotion, actual: trade.emotion || "—", diff: null, good: snap.emotion === trade.emotion });
  if (snap.legIV?.length) {
    snap.legIV.forEach((planned, i) => {
      if (!planned.iv) return;
      const actualIV = trade.legs?.[i]?.iv;
      rows.push({ label: `Leg ${i + 1} IV`, planned: `${planned.iv}%`, actual: actualIV ? `${actualIV}%` : "—", diff: null, good: !!actualIV });
    });
  }
  const hasRows = rows.length > 0;
  const hasChecklist = snap.checklist?.length > 0;
  const hasAiAssist = !!(snap.aiAssist?.marketBias || snap.aiAssist?.checklist?.length);
  if (!hasRows && !hasChecklist && !hasAiAssist) return null;
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: t.text3, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>Plan vs Reality</div>
      {hasRows && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 8px", marginBottom: hasChecklist ? 12 : 0 }}>
          <div style={{ fontSize: 10, color: t.text4, fontFamily: "'Space Mono',monospace" }}></div>
          <div style={{ fontSize: 10, color: t.text4, fontFamily: "'Space Mono',monospace" }}>PLANNED</div>
          <div style={{ fontSize: 10, color: t.text4, fontFamily: "'Space Mono',monospace" }}>ACTUAL</div>
          {rows.map(({ label, planned, actual, diff, good }) => (
            <>
              <div key={label + "l"} style={{ fontSize: 11, color: t.text3 }}>{label}</div>
              <div key={label + "p"} style={{ fontSize: 12, color: t.text, fontFamily: "'Space Mono',monospace" }}>{planned}</div>
              <div key={label + "a"} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12, color: t.text, fontFamily: "'Space Mono',monospace" }}>{actual}</span>
                {diff && <span style={{ fontSize: 10, color: good ? t.positive : t.danger }}>{diff}</span>}
                {!diff && <span style={{ color: good ? t.positive : t.danger, display: "flex" }}>{good ? <CheckIcon size={11} /> : <CloseIcon size={11} />}</span>}
              </div>
            </>
          ))}
        </div>
      )}
      {hasChecklist && (
        <>
          <div style={{ fontSize: 10, color: t.text3, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>Pre-Trade Checklist</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {snap.checklist.map((item) => {
              const checked = item.checked ?? (typeof item === "string" ? false : false);
              const label = item.label ?? item;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: checked ? t.accent : t.danger, display: "flex", flexShrink: 0 }}>
                    {checked ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
                  </span>
                  <span style={{ fontSize: 12, color: checked ? t.text : t.text3, fontFamily: "'Space Mono',monospace" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {hasAiAssist && (
        <div style={{ marginTop: hasRows || hasChecklist ? 12 : 0, paddingTop: hasRows || hasChecklist ? 12 : 0, borderTop: hasRows || hasChecklist ? `1px solid ${t.border}` : "none" }}>
          <div style={{ fontSize: 10, color: t.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>AI Assist (at plan time)</div>
          {snap.aiAssist.marketBias && (
            <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.6, marginBottom: snap.aiAssist.checklist?.length ? 8 : 0 }}>{snap.aiAssist.marketBias}</div>
          )}
          {snap.aiAssist.checklist?.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4 }}>
              <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}>·</span>
              <span style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
})()}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
            zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <img src={lightbox} alt="chart" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }} />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.1)", border: "none",
              color: "#fff", borderRadius: "50%", width: 36, height: 36,
              cursor: "pointer", fontSize: 18,
            }}
          >×</button>
        </div>
      )}
    </div>
  );
}
