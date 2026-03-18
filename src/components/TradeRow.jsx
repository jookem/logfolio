import { calcPL, fmt, fmtDate, fmtR } from "../lib/utils";
import Tag from "./Tag";

export default function TradeRow({ trade, onClick, onEdit, onDelete, t, mobile, isFirst, editLabel }) {
  const pl = calcPL(trade);
  const plDisplay = isNaN(pl) ? null : pl;
  return (
    <div
      style={{ padding: "12px 16px", borderTop: isFirst ? "none" : `1px solid ${t.border}`, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {mobile ? (
        <div onClick={onClick}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: t.text }}>
              {trade.ticker}
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: plDisplay == null ? t.text3 : plDisplay >= 0 ? t.accent : t.danger }}>
              {plDisplay == null ? "—" : `${plDisplay >= 0 ? "+" : ""}${fmt(plDisplay)}`}
              {trade.r !== null && trade.r !== undefined && (
                <div style={{ fontSize: 10, color: trade.r >= 0 ? t.accent : t.danger, opacity: 0.8 }}>{fmtR(trade.r)}</div>
              )}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.text3 }}>{trade.strategy} · {fmtDate(trade.date)}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>{editLabel || "Edit"}</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>Del</button>
            </div>
          </div>
          {trade.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
              {trade.tags.map((tg) => (<Tag key={tg} label={tg} t={t} />))}
            </div>
          )}
          {trade.screenshots?.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
              {trade.screenshots.slice(0, 3).map((img) => (
                <img key={img.id} src={img.src} alt="chart" style={{ height: 32, width: 48, objectFit: "cover", borderRadius: 4, border: `1px solid ${t.border}` }} />
              ))}
              {trade.screenshots.length > 3 && <span style={{ fontSize: 10, color: t.text3, alignSelf: "center" }}>+{trade.screenshots.length - 3}</span>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "85px 70px 1fr auto 90px", gap: 10, alignItems: "center" }}>
          <span onClick={onClick} style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: t.text3 }}>{fmtDate(trade.date)}</span>
          <span onClick={onClick} style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: t.text }}>{trade.ticker}</span>
          <span onClick={onClick} style={{ fontSize: 13, color: t.text3 }}>
            {trade.strategy}
            {trade.tags?.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, color: t.accent, background: t.accent + "15", borderRadius: 4, padding: "1px 6px" }}>
                {trade.tags[0]}{trade.tags.length > 1 ? ` +${trade.tags.length - 1}` : ""}
              </span>
            )}
            {trade.screenshots?.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, color: t.text3, display: "inline-flex", alignItems: "center", gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 13.3636C2 10.2994 2 8.76721 2.74902 7.6666C3.07328 7.19014 3.48995 6.78104 3.97524 6.46268C4.69555 5.99013 5.59733 5.82123 6.978 5.76086C7.63685 5.76086 8.20412 5.27068 8.33333 4.63636C8.52715 3.68489 9.37805 3 10.3663 3H13.6337C14.6219 3 15.4728 3.68489 15.6667 4.63636C15.7959 5.27068 16.3631 5.76086 17.022 5.76086C18.4027 5.82123 19.3044 5.99013 20.0248 6.46268C20.51 6.78104 20.9267 7.19014 21.251 7.6666C22 8.76721 22 10.2994 22 13.3636C22 16.4279 22 17.9601 21.251 19.0607C20.9267 19.5371 20.51 19.9462 20.0248 20.2646C18.9038 21 17.3433 21 3.97524 20.2646C3.48995 19.9462 3.07328 19.5371 2.74902 19.0607C2.53746 18.7498 2.38566 18.4045 2.27673 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> {trade.screenshots.length}</span>
            )}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>{editLabel || "Edit"}</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Del</button>
          </div>
          <span onClick={onClick} style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: plDisplay == null ? t.text3 : plDisplay >= 0 ? t.accent : t.danger, textAlign: "right" }}>
            {plDisplay == null ? "—" : `${plDisplay >= 0 ? "+" : ""}${fmt(plDisplay)}`}
          </span>
        </div>
      )}
    </div>
  );
}
