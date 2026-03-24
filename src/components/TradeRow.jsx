import { calcPL, fmt, fmtDate, fmtR } from "../lib/utils";
import Tag from "./Tag";
import { EditIcon, DeleteIcon, ScreenshotIcon, RecIcon } from "../lib/icons";

export default function TradeRow({ trade, onClick, onEdit, onDelete, onSelect, isSelected, t, mobile, isFirst, editLabel }) {
  const pl = calcPL(trade);
  const plDisplay = isNaN(pl) ? null : pl;
  const isOpen = plDisplay === null;
  return (
    <div
      style={{ padding: "12px 16px", borderTop: isFirst ? "none" : `1px solid ${t.border}`, cursor: "pointer", background: isSelected ? t.accent + "10" : "transparent", display: "flex", alignItems: "flex-start", gap: 10 }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = t.hoverBg; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      {onSelect && (
        <div onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ paddingTop: 2, flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? t.accent : t.border}`, background: isSelected ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {isSelected && <div style={{ width: 8, height: 8, borderRadius: 2, background: "#000" }} />}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
      {mobile ? (
        <div onClick={onClick}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: t.text }}>{trade.ticker}</span>
              {isOpen && <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b40", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>OPEN</span>}
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
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><EditIcon size="1em" />{editLabel || "Edit"}</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><DeleteIcon size="1em" />Del</button>
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
            {isOpen && <span style={{ marginLeft: 6, fontSize: 9, fontFamily: "'Space Mono',monospace", color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b40", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>OPEN</span>}
            {trade.tags?.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, color: t.accent, background: t.accent + "15", borderRadius: 4, padding: "1px 6px" }}>
                {trade.tags[0]}{trade.tags.length > 1 ? ` +${trade.tags.length - 1}` : ""}
              </span>
            )}
            {trade.screenshots?.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, color: t.text3, display: "inline-flex", alignItems: "center", gap: 3 }}><ScreenshotIcon size={11} /> {trade.screenshots.length}</span>
            )}
            {trade.voiceNote && (
              <span style={{ marginLeft: 6, fontSize: 10, color: t.text3, display: "inline-flex", alignItems: "center", gap: 3 }} title="Has voice note">
                <RecIcon size={11} />
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><EditIcon size="1em" />{editLabel || "Edit"}</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><DeleteIcon size="1em" />Del</button>
          </div>
          <span onClick={onClick} style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: plDisplay == null ? t.text3 : plDisplay >= 0 ? t.accent : t.danger, textAlign: "right" }}>
            {plDisplay == null ? "—" : `${plDisplay >= 0 ? "+" : ""}${fmt(plDisplay)}`}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}
