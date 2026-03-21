import { useState } from "react";
import { todayStr } from "../lib/utils";

export default function JournalView({ journals, onSave, t, mobile }) {
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  const text = journals[date] || "";

  const handleChange = (val) => {
    onSave(date, val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const datesWithEntries = Object.keys(journals).filter((d) => journals[d]?.trim()).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "220px 1fr", gap: 16, alignItems: "start" }}>
      {/* Sidebar: past entries */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>
          Entries
        </div>
        {datesWithEntries.length === 0 ? (
          <div style={{ padding: "16px", fontSize: 12, color: t.text3 }}>No entries yet.</div>
        ) : (
          datesWithEntries.slice(0, 30).map((d) => (
            <div
              key={d}
              onClick={() => setDate(d)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                borderBottom: `1px solid ${t.border}`,
                background: d === date ? t.accent + "15" : "transparent",
                borderLeft: d === date ? `3px solid ${t.accent}` : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (d !== date) e.currentTarget.style.background = t.hoverBg; }}
              onMouseLeave={(e) => { if (d !== date) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: d === date ? t.accent : t.text, fontWeight: d === date ? 700 : 400 }}>{d}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(journals[d] || "").slice(0, 40)}…
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 7, color: t.text, padding: "6px 10px", fontSize: 13, fontFamily: "'Space Mono',monospace", outline: "none", cursor: "pointer" }}
          />
          {saved && (
            <span style={{ fontSize: 11, color: t.accent, fontFamily: "'Space Mono',monospace" }}>✓ Saved</span>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Journal entry for ${date}…\n\nReflect on today's trades, market conditions, mental state, lessons learned.`}
          style={{
            width: "100%",
            minHeight: 340,
            background: t.input,
            border: `1px solid ${t.inputBorder}`,
            borderRadius: 8,
            color: t.text,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.7,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <div style={{ fontSize: 11, color: t.text3, marginTop: 8 }}>
          Auto-saved · {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} words` : "Start writing…"}
        </div>
      </div>
    </div>
  );
}
