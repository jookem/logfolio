import { useState } from "react";
import { STRATEGIES, EMOTIONS, MISTAKES } from "../lib/constants";

export default function BulkEditModal({ count, onApply, onClose, t }) {
  const [strategy, setStrategy] = useState("");
  const [emotion, setEmotion] = useState("");
  const [mistake, setMistake] = useState("");
  const [addTag, setAddTag] = useState("");

  const sel = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, padding: "8px 12px", fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%" };

  const apply = () => {
    const changes = {};
    if (strategy) changes.strategy = strategy;
    if (emotion) changes.emotion = emotion;
    if (mistake) changes.mistake = mistake;
    if (addTag.trim()) changes.addTag = addTag.trim();
    onApply(changes);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 400, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: t.accent }}>Bulk Edit — {count} trade{count !== 1 ? "s" : ""}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginBottom: 16 }}>Only filled fields will be applied. Leave blank to keep existing values.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>Strategy</div>
            <select style={sel} value={strategy} onChange={e => setStrategy(e.target.value)}>
              <option value="">— keep existing —</option>
              {STRATEGIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>Emotion</div>
            <select style={sel} value={emotion} onChange={e => setEmotion(e.target.value)}>
              <option value="">— keep existing —</option>
              {EMOTIONS.map(em => <option key={em}>{em}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>Mistake</div>
            <select style={sel} value={mistake} onChange={e => setMistake(e.target.value)}>
              <option value="">— keep existing —</option>
              {MISTAKES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>Add Tag</div>
            <input style={sel} value={addTag} onChange={e => setAddTag(e.target.value)} placeholder="e.g. reviewed" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 11, cursor: "pointer", fontSize: 12 }}>Cancel</button>
          <button onClick={apply} style={{ flex: 2, background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: 11, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>Apply to {count} Trade{count !== 1 ? "s" : ""}</button>
        </div>
      </div>
    </div>
  );
}
