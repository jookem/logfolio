import { useState } from "react";
import { calcPL, fmt, fmtDate, fmtR, typeLabels } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";
import Tag from "./Tag";

export default function TradeDetail({ trade, onClose, onEdit, onExecute, onSave, onShare, t }) {
  const pl = calcPL(trade);
  const [lightbox, setLightbox] = useState(null);
  const [quickEdit, setQuickEdit] = useState(false);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
        }}
      >
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
          <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
            {trade.status === "planned" && onExecute && (
              <button
                onClick={onExecute}
                style={{
                  background: t.accent, border: "none",
                  color: "#000", borderRadius: 6, padding: "4px 12px",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
                  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg> Execute Plan
              </button>
            )}
            <button
              onClick={onEdit}
              style={{
                background: "none", border: `1px solid ${t.border}`,
                color: t.text3, borderRadius: 6, padding: "4px 10px",
                cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
                <path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> Edit
            </button>
            {trade.status !== "planned" && onSave && (
              <button
                onClick={() => setQuickEdit(q => !q)}
                style={{ background: quickEdit ? t.accent+"20" : "none", border: `1px solid ${t.border}`, color: quickEdit ? t.accent : t.text3, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              >
                ✏ Quick Edit
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              >
                ↗ Share
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none", border: `1px solid ${t.border}`,
                color: t.text3, borderRadius: 6, padding: "4px 10px",
                cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
                <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg> Close
            </button>
          </div>
        </div>
        <div>
          {!isNaN(pl) && (
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 22,
                fontWeight: 700,
                color: pl >= 0 ? t.accent : t.danger,
                textAlign: "right",
              }}
            >
              {pl >= 0 ? "+" : ""}{fmt(pl)}
            </div>
          )}
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
            [typeLabels(trade.type).units, trade.shares],
            ["Direction", trade.direction],...(trade.stopLoss ? [["Stop Loss", fmt(trade.stopLoss)]] : []),
  ...(trade.takeProfit ? [["Take Profit", fmt(trade.takeProfit)]] : []),
  ...(trade.plannedR != null ? [["Planned R", `+${trade.plannedR?.toFixed(2)}R`]] : []),
  ...(trade.r != null ? [["R-Multiple", fmtR(trade.r)]] : []),
  ...(trade.holdMinutes != null ? [["Hold Time", trade.holdMinutes < 60 ? `${trade.holdMinutes}m` : `${Math.floor(trade.holdMinutes/60)}h ${trade.holdMinutes%60}m`]] : []),
  ...(trade.entryTime ? [["Entry Time", trade.entryTime]] : []),
  ...(trade.exitTime ? [["Exit Time", trade.exitTime]] : []),
].map(([k, v]) => (
            <div
              key={k}
              style={{
                background: t.card2,
                borderRadius: 8,
                padding: "11px 14px",
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
                    fontFamily: "monospace",
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
                    fontFamily: "monospace",
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
                    fontFamily: "monospace",
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
                    fontFamily: "monospace",
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
