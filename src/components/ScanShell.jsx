import { CloseIcon, TrendUpIcon, TrendDownIcon } from "../lib/icons";

const DIRS = [
  { id: "bullish", label: "Bullish Scan", Icon: TrendUpIcon },
  { id: "bearish", label: "Bearish Scan", Icon: TrendDownIcon },
];

// Shared frame for the Bullish / Bearish scans. Closed, it shows the two
// scan buttons side by side. Open, it shows a direction switch, a refresh
// button and the scan results passed in as children.
export default function ScanShell({ t, dir, loading, onScan, onClose, description, children }) {
  const dirColor = (id) => id === "bullish" ? t.positive : t.danger;
  const btn = (id, active) => ({
    background: active ? dirColor(id) + "22" : "none",
    border: `1px solid ${dirColor(id)}`,
    color: dirColor(id),
    borderRadius: 8,
    padding: "11px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Space Mono', monospace",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
  });

  if (!dir) {
    return (
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {DIRS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => onScan(id)} style={btn(id, false)}><Icon size={16} />{label}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.card2 || t.card, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {DIRS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => id !== dir && onScan(id)} disabled={loading}
              style={{ ...btn(id, id === dir), flex: "none", padding: "5px 10px", fontSize: 11, opacity: id === dir ? 1 : 0.6 }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => onScan(dir)} disabled={loading}
            style={{ background: "none", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
            {loading ? "Scanning..." : "Refresh"}
          </button>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer" }}><CloseIcon size="1em" /></button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: t.text4, marginBottom: 8, lineHeight: 1.5 }}>{description}</div>
      {children}
    </div>
  );
}
