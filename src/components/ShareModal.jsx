import { calcPL, fmt, fmtDate, typeLabels } from "../lib/utils";
import { useModalClose } from "../lib/useModalClose";

export default function ShareModal({ trade, onClose, t, isDark }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const pl = calcPL(trade);
  const downloadCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    const bg = isDark ? "#0d0d0d" : "#ffffff";
    const fg = isDark ? "#ffffff" : "#0d0f14";
    const fg3 = isDark ? "#b0b0b0" : "#9499ad";
    const acc = isDark ? "#00ff87" : "#00b87a";
    const red = isDark ? "#ff4d6d" : "#e63757";
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 600, 320);
    ctx.fillStyle = isDark ? "#111" : "#f4f5f7"; ctx.roundRect(20, 20, 560, 280, 12); ctx.fill();
    ctx.fillStyle = acc; ctx.font = "bold 11px monospace";
    ctx.fillText("LOG-FOLIO", 40, 52);
    ctx.fillStyle = fg3; ctx.font = "11px monospace";
    ctx.fillText(fmtDate(trade.date), 520 - ctx.measureText(fmtDate(trade.date)).width, 52);
    ctx.fillStyle = fg; ctx.font = "bold 28px monospace";
    ctx.fillText(trade.ticker || "", 40, 98);
    ctx.fillStyle = fg3; ctx.font = "13px monospace";
    ctx.fillText(`${trade.type || ""} · ${trade.strategy || ""} · ${(trade.direction || "").toUpperCase()}`, 40, 122);
    ctx.strokeStyle = isDark ? "#222" : "#e2e4e9"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 138); ctx.lineTo(560, 138); ctx.stroke();
    ctx.fillStyle = fg3; ctx.font = "10px monospace";
    ctx.fillText("ENTRY", 40, 162); ctx.fillText("EXIT", 180, 162); ctx.fillText("SIZE", 320, 162);
    ctx.fillStyle = fg; ctx.font = "bold 16px monospace";
    ctx.fillText(`$${trade.entryPrice ?? "—"}`, 40, 184);
    ctx.fillText(`$${trade.exitPrice ?? "—"}`, 180, 184);
    ctx.fillText(`${trade.shares ?? "—"} ${typeLabels(trade.type || "stock").units.toLowerCase()}`, 320, 184);
    ctx.strokeStyle = isDark ? "#222" : "#e2e4e9";
    ctx.beginPath(); ctx.moveTo(40, 200); ctx.lineTo(560, 200); ctx.stroke();
    const plStr = (pl >= 0 ? "+" : "") + fmt(pl);
    ctx.fillStyle = pl >= 0 ? acc : red; ctx.font = "bold 32px monospace";
    ctx.fillText(plStr, 40, 246);
    ctx.fillStyle = pl >= 0 ? acc : red; ctx.font = "bold 14px monospace";
    ctx.fillText(pl >= 0 ? "WIN" : "LOSS", 40, 270);
    if (trade.emotion && trade.emotion !== "None") {
      ctx.fillStyle = fg3; ctx.font = "12px monospace";
      ctx.fillText(`Emotion: ${trade.emotion}`, 320, 246);
    }
    if (trade.r != null) {
      ctx.fillStyle = trade.r >= 0 ? acc : red; ctx.font = "bold 14px monospace";
      ctx.fillText(`${trade.r >= 0 ? "+" : ""}${trade.r.toFixed(2)}R`, 200, 246);
    }
    if (trade.strategy) {
      ctx.fillStyle = fg3; ctx.font = "12px monospace";
      ctx.fillText(trade.strategy, 320, 270);
    }
    // Branded footer strip
    ctx.fillStyle = isDark ? "#0a0a0a" : "#d8dbe4";
    ctx.fillRect(20, 278, 560, 22);
    ctx.fillStyle = acc; ctx.font = "bold 9px monospace";
    ctx.fillText("LOG-FOLIO", 36, 293);
    ctx.fillStyle = fg3; ctx.font = "9px monospace";
    ctx.fillText("· Trade Smarter ·", 108, 293);
    const urlW = ctx.measureText("log-folio.com").width;
    ctx.fillStyle = fg3; ctx.font = "9px monospace";
    ctx.fillText("log-folio.com", 576 - urlW, 293);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${trade.ticker || "trade"}-${trade.date || "card"}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize" : "modal-maximize"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 480, padding: sm ? 14 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Share Trade</div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ background: isDark ? "#111" : "#f4f5f7", borderRadius: 12, padding: "20px 24px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: t.text }}>{trade.ticker}</div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>{trade.type} · {trade.strategy} · {fmtDate(trade.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: pl >= 0 ? t.accent : t.danger }}>{pl >= 0 ? "+" : ""}{fmt(pl)}</div>
              <div style={{ fontSize: 12, color: pl >= 0 ? t.accent : t.danger, marginTop: 2 }}>{pl >= 0 ? "WIN" : "LOSS"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: t.text2 }}>
            <span>Entry: <strong>${trade.entryPrice ?? "—"}</strong></span>
            <span>Exit: <strong>${trade.exitPrice ?? "—"}</strong></span>
            <span>{typeLabels(trade.type || "stock").units}: <strong>{trade.shares ?? "—"}</strong></span>
          </div>
          {trade.emotion && trade.emotion !== "None" && (
            <div style={{ fontSize: 11, color: t.text3, marginTop: 8 }}>Emotion: {trade.emotion}</div>
          )}
          {trade.r != null && (
            <div style={{ fontSize: 11, color: trade.r >= 0 ? t.accent : t.danger, marginTop: 4, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{trade.r >= 0 ? "+" : ""}{trade.r.toFixed(2)}R</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "6px 0 0", borderTop: `1px solid ${isDark ? "#222" : "#dde0e8"}` }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, color: isDark ? "#00ff87" : "#00b87a", letterSpacing: 1 }}>LOG-FOLIO</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: t.text3 }}>log-folio.com</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={downloadCard} style={{ flex: 1, background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>Download PNG</button>
          <button onClick={() => trigger(onClose)} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
