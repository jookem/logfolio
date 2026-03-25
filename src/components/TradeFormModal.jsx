import { useState } from "react";
import { STOCK_LIKE, SUGGESTED_TAGS, EMOTIONS, MISTAKES } from "../lib/constants";
import { todayStr, typeLabels, fmt } from "../lib/utils";
import Tag from "./Tag";
import VoiceNote from "./VoiceNote";
import ScreenshotUpload from "./ScreenshotUpload";
import { EditIcon, LogIcon, CloseIcon, TodayIcon, ExitIcon, EntryPriceIcon, EntryTimeIcon, ExitTimeIcon, TickerIcon, CategoryIcon, StrategyIcon, DirectionIcon, AmountIcon, WarningIcon, TargetIcon, EmotionIcon, TagsIcon, PenIcon } from "../lib/icons";

export default function TradeFormModal({ initial, defaults, onClose, onSave, onCSVImport, t, editLabel, isDark, trades = [] }) {
  const sm = window.innerWidth < 400;
  const blank = {
    date: todayStr(),
    ticker: "",
    type: defaults?.type || "stock",
    strategy: defaults?.strategy || "Breakout",
    direction: defaults?.direction || "long",
    timeframe: defaults?.timeframe || "Daily",
    entryPrice: "",
    exitPrice: "",
    shares: "",
    stopLoss: "",
    takeProfit: "",
    entryTime: "",
    exitTime: "",
    emotion: "None",
    mistake: "None",
    notes: "",
    tags: [],
    legs: [
      {
        position: "buy",
        type: "call",
        strike: "",
        expiration: "",
        entryPremium: "",
        exitPremium: "",
        contracts: 1,
      },
    ],
  };
  const [form, setForm] = useState(initial || blank);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState("");
  const [customEmotions, setCustomEmotions] = useState([]);
  const [customMistakes, setCustomMistakes] = useState([]);
  const [emotionInput, setEmotionInput] = useState("");
  const [mistakeInput, setMistakeInput] = useState("");
  const [dupWarning, setDupWarning] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLeg = (i, k, v) =>
    setForm((f) => {
      const legs = [...f.legs];
      legs[i] = { ...legs[i], [k]: v };
      return { ...f, legs };
    });
  const addLeg = () =>
    setForm((f) => ({
      ...f,
      legs: [
        ...f.legs,
        {
          position: "buy",
          type: "call",
          strike: "",
          expiration: f.legs[0]?.expiration || "",
          entryPremium: "",
          exitPremium: "",
          contracts: 1,
        },
      ],
    }));
  const removeLeg = (i) =>
    setForm((f) => ({ ...f, legs: f.legs.filter((_, idx) => idx !== i) }));
  const addTag = (tag) => {
    const c = tag.trim();
    if (c && !(form.tags || []).includes(c))
      set("tags", [...(form.tags || []), c]);
    setTagInput("");
  };
  const removeTag = (tag) =>
    set(
      "tags",
      (form.tags || []).filter((tg) => tg !== tag)
    );
  const validate = () => {
    const e = {};
    if (!form.ticker.trim()) e.ticker = "Ticker is required";
    if (STOCK_LIKE.includes(form.type)) {
      if (!form.shares || +form.shares <= 0) e.shares = "Must be > 0";
      if (!form.entryPrice || +form.entryPrice <= 0) e.entryPrice = "Must be > 0";
      if (form.exitPrice !== "" && +form.exitPrice <= 0) e.exitPrice = "Must be > 0";
      if (form.stopLoss) {
        if (+form.stopLoss <= 0) e.stopLoss = "Must be > 0";
        else if (form.entryPrice) {
          if (form.direction === "long" && +form.stopLoss >= +form.entryPrice) e.stopLoss = "Must be below entry for a long";
          if (form.direction === "short" && +form.stopLoss <= +form.entryPrice) e.stopLoss = "Must be above entry for a short";
        }
      }
      if (form.takeProfit) {
        if (+form.takeProfit <= 0) e.takeProfit = "Must be > 0";
        else if (form.entryPrice) {
          if (form.direction === "long" && +form.takeProfit <= +form.entryPrice) e.takeProfit = "Must be above entry for a long";
          if (form.direction === "short" && +form.takeProfit >= +form.entryPrice) e.takeProfit = "Must be below entry for a short";
        }
      }
    } else {
      form.legs.forEach((l, i) => {
        if (!l.strike || +l.strike <= 0) e[`leg_${i}_strike`] = "Required";
        if (!l.entryPremium || +l.entryPremium <= 0) e[`leg_${i}_entryPremium`] = "Required";
        if (!l.expiration) e[`leg_${i}_expiration`] = "Required";
        if (!l.contracts || +l.contracts <= 0) e[`leg_${i}_contracts`] = "Required";
      });
    }
    return e;
  };
  const save = (force = false) => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (!force && !form.id) {
      const dup = trades.some(tr =>
        tr.status !== "planned" &&
        tr.ticker?.toUpperCase() === form.ticker?.toUpperCase() &&
        tr.date === form.date
      );
      if (dup) { setDupWarning(true); return; }
    }
    const trade = {
      ...form,
      ticker: form.ticker.toUpperCase(),
      id: form.id || Date.now(),
      tags: form.tags || [],
    };
    if (STOCK_LIKE.includes(form.type)) {
      trade.entryPrice = +form.entryPrice;
      trade.exitPrice = +form.exitPrice;
      trade.shares = +form.shares;
      if (form.stopLoss) trade.stopLoss = +form.stopLoss;
      if (form.takeProfit) trade.takeProfit = +form.takeProfit;
    } else {
      trade.legs = form.legs.map((l) => ({
        ...l,
        strike: +l.strike,
        entryPremium: +l.entryPremium,
        exitPremium: +l.exitPremium,
        contracts: +l.contracts,
      }));
    }
    if (form.entryTime && form.exitTime) {
      const [eh, em] = form.entryTime.split(":").map(Number);
      const [xh, xm] = form.exitTime.split(":").map(Number);
      let mins = (xh * 60 + xm) - (eh * 60 + em);
      if (mins < 0) mins += 24 * 60;
      trade.holdMinutes = mins;
    }
    onSave(trade);
  };
  const inp = (errKey) => ({
    background: t.input,
    border: `1px solid ${errors[errKey] ? "#ff4d4d" : t.inputBorder}`,
    borderRadius: 8,
    color: t.text,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  });
  const errMsg = (key) => errors[key]
    ? <div style={{ color: "#ff4d4d", fontSize: 10, marginTop: 4, fontFamily: "'Space Mono',monospace" }}>{errors[key]}</div>
    : null;
  const lbl = {
    fontSize: 11,
    color: t.text3,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    display: "block",
    fontFamily: "'Space Mono', monospace",
  };
  const sectionHeader = (title, id, icon) => (
    <div id={id} style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      color: t.accent,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 10,
      marginTop: 18,
      paddingBottom: 6,
      borderBottom: `1px solid ${t.border}`,
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      {icon && icon}
      {title}
    </div>
  );
  return (
    <div
      className="backdrop-enter"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        minHeight: "100%",
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: sm ? 8 : 16,
      }}
    >
      <div
        className="modal-enter"
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: sm ? 12 : 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: sm ? 14 : 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 16,
              fontWeight: 700,
              color: t.accent,
              display: "flex",
              alignItems: "center",
              gap: 6
              }}
          >
           {form.id ? (
  <>
    <EditIcon size="1em" /> {editLabel || "Edit Trade"}
  </>
) : (
  <>
    <LogIcon size="1em" /> Log A Trade
  </>
)}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: t.text3,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            <CloseIcon size="1em" />
          </button>
        </div>
        <div
          id="tut-trade-basic"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TickerIcon size={14} />{typeLabels(form.type).ticker}</label>
            <input
              style={inp("ticker")}
              value={form.ticker}
              onChange={(e) => { set("ticker", e.target.value.toUpperCase()); setErrors((p) => ({ ...p, ticker: undefined })); }}
              placeholder={form.type === "forex" ? "EUR/USD" : form.type === "crypto" ? "BTC/USDT" : "AAPL"}
            />
            {errMsg("ticker")}
          </div>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TodayIcon size={14} />Date</label>
            <input
              style={inp()}
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><CategoryIcon size={14} />Type</label>
            <select
              style={inp()}
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="stock">Stock</option>
              <option value="options">Options</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><StrategyIcon size={14} />Strategy</label>
            <select
              style={inp()}
              value={form.strategy}
              onChange={(e) => set("strategy", e.target.value)}
            >
              {(form.type === "options"
                ? ["Long Call","Long Put","Bull Call Spread","Bear Put Spread","Iron Condor","Straddle","Strangle","Covered Call","Cash Secured Put","Butterfly","Calendar Spread"]
                : ["Breakout","Pullback","Reversal","Scalp","Trend Follow","Range","Swing"]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {STOCK_LIKE.includes(form.type) ? (
          <>
            <div id="tut-trade-direction" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><DirectionIcon size={14} />Direction</label>
                <select
                  style={inp()}
                  value={form.direction}
                  onChange={(e) => set("direction", e.target.value)}
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><AmountIcon size={14} />{typeLabels(form.type).units}</label>
                <input
                  style={inp("shares")}
                  type="number"
                  value={form.shares}
                  onChange={(e) => { set("shares", e.target.value); setErrors((p) => ({ ...p, shares: undefined })); }}
                  placeholder="100"
                />
                {errMsg("shares")}
              </div>
            </div>
            <div id="tut-trade-prices" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><EntryPriceIcon size={14} />Entry</label>
                <input
                  style={inp("entryPrice")}
                  type="number"
                  value={form.entryPrice}
                  onChange={(e) => { set("entryPrice", e.target.value); setErrors((p) => ({ ...p, entryPrice: undefined })); }}
                  placeholder="190"
                />
                {errMsg("entryPrice")}
              </div>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><ExitIcon size={14} />Exit</label>
                <input
                  style={inp("exitPrice")}
                  type="number"
                  value={form.exitPrice}
                  onChange={(e) => { set("exitPrice", e.target.value); setErrors((p) => ({ ...p, exitPrice: undefined })); }}
                  placeholder="196"
                />
                {errMsg("exitPrice")}
                {(() => {
                  const entry = +form.entryPrice;
                  const exit = +form.exitPrice;
                  const qty = +form.shares;
                  if (!entry || !exit || !qty) return null;
                  const dir = form.direction === "long" ? 1 : -1;
                  const pl = dir * (exit - entry) * qty;
                  return (
                    <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: pl >= 0 ? t.accent : t.danger, marginTop: 4 }}>
                      → {pl >= 0 ? "+" : ""}{fmt(pl)}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div id="tut-trade-times" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><EntryTimeIcon size={14} />Entry Time</label>
                <input
                  style={inp()}
                  className={isDark ? "time-dark" : ""}
                  type="time"
                  value={form.entryTime || ""}
                  onChange={(e) => set("entryTime", e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><ExitTimeIcon size={14} />Exit Time</label>
                <input
                  style={inp()}
                  className={isDark ? "time-dark" : ""}
                  type="time"
                  value={form.exitTime || ""}
                  onChange={(e) => set("exitTime", e.target.value)}
                />
              </div>
            </div>
            <div id="tut-trade-stoploss" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><WarningIcon size={14} />Stop Loss</label>
                <input
                  style={inp("stopLoss")}
                  type="number"
                  value={form.stopLoss || ""}
                  onChange={(e) => { set("stopLoss", e.target.value); setErrors((p) => ({ ...p, stopLoss: undefined })); }}
                  placeholder="185"
                />
                {errMsg("stopLoss")}
              </div>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TargetIcon size={14} />Take Profit</label>
                <input
                  style={inp("takeProfit")}
                  type="number"
                  value={form.takeProfit || ""}
                  onChange={(e) => { set("takeProfit", e.target.value); setErrors((p) => ({ ...p, takeProfit: undefined })); }}
                  placeholder="200"
                />
                {errMsg("takeProfit")}
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label style={{ ...lbl, marginBottom: 0 }}>Option Legs</label>
              <button
                onClick={addLeg}
                style={{
                  background: t.accent + "20",
                  border: `1px solid ${t.accent}40`,
                  color: t.accent,
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                + Leg
              </button>
            </div>
            {form.legs.map((leg, i) => (
              <div
                key={i}
                style={{
                  background: t.card2,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: t.accent,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    Leg {i + 1}
                  </span>
                  {form.legs.length > 1 && (
                    <button
                      onClick={() => removeLeg(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: t.danger,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <select
                    style={inp()}
                    value={leg.position}
                    onChange={(e) => setLeg(i, "position", e.target.value)}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                  <select
                    style={inp()}
                    value={leg.type}
                    onChange={(e) => setLeg(i, "type", e.target.value)}
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                  <input
                    style={inp(`leg_${i}_strike`)}
                    type="number"
                    placeholder="Strike"
                    value={leg.strike}
                    onChange={(e) => { setLeg(i, "strike", e.target.value); setErrors((p) => ({ ...p, [`leg_${i}_strike`]: undefined })); }}
                  />
                  <input
                    style={inp(`leg_${i}_expiration`)}
                    type="date"
                    value={leg.expiration}
                    onChange={(e) => { setLeg(i, "expiration", e.target.value); setErrors((p) => ({ ...p, [`leg_${i}_expiration`]: undefined })); }}
                  />
                  <input
                    style={inp(`leg_${i}_entryPremium`)}
                    type="number"
                    placeholder="Entry $"
                    value={leg.entryPremium}
                    onChange={(e) => { setLeg(i, "entryPremium", e.target.value); setErrors((p) => ({ ...p, [`leg_${i}_entryPremium`]: undefined })); }}
                  />
                  <input
                    style={inp()}
                    type="number"
                    placeholder="Exit $"
                    value={leg.exitPremium}
                    onChange={(e) => setLeg(i, "exitPremium", e.target.value)}
                  />
                  <input
                    style={inp(`leg_${i}_contracts`)}
                    type="number"
                    placeholder="Contracts"
                    value={leg.contracts}
                    onChange={(e) => { setLeg(i, "contracts", e.target.value); setErrors((p) => ({ ...p, [`leg_${i}_contracts`]: undefined })); }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {sectionHeader("Mindset", "tut-trade-mindset")}
        <div id="tut-trade-emotion" style={{ marginBottom: 14 }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><EmotionIcon size={14} />Emotion</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 8 }}>
            {[...EMOTIONS.filter((e) => e !== "None"), ...customEmotions].map((e) => {
              const active = form.emotion === e;
              return (
                <span
                  key={e}
                  onClick={() => set("emotion", active ? "None" : e)}
                  style={{
                    background: active ? t.accent + "30" : t.tagBg,
                    color: active ? t.accent : t.text3,
                    border: `1px solid ${active ? t.accent : "transparent"}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    userSelect: "none",
                  }}
                >
                  {e}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp(), flex: 1, padding: "7px 12px", fontSize: 12 }}
              value={emotionInput}
              onChange={(e) => setEmotionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && emotionInput.trim()) {
                  const v = emotionInput.trim();
                  if (!customEmotions.includes(v) && !EMOTIONS.includes(v)) setCustomEmotions(c => [...c, v]);
                  set("emotion", v);
                  setEmotionInput("");
                }
              }}
              placeholder="Add emotion..."
            />
            <button
              onClick={() => {
                const v = emotionInput.trim();
                if (!v) return;
                if (!customEmotions.includes(v) && !EMOTIONS.includes(v)) setCustomEmotions(c => [...c, v]);
                set("emotion", v);
                setEmotionInput("");
              }}
              style={{ background: t.accent + "20", border: `1px solid ${t.accent}40`, color: t.accent, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
            >+ Add</button>
          </div>
        </div>
        <div id="tut-trade-mistake" style={{ marginBottom: 14 }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><WarningIcon size={14} />Mistake</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 8 }}>
            {[...MISTAKES.filter((m) => m !== "None"), ...customMistakes].map((m) => {
              const active = form.mistake === m;
              return (
                <span
                  key={m}
                  onClick={() => set("mistake", active ? "None" : m)}
                  style={{
                    background: active ? t.accent + "30" : t.tagBg,
                    color: active ? t.accent : t.text3,
                    border: `1px solid ${active ? t.accent : "transparent"}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    userSelect: "none",
                  }}
                >
                  {m}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp(), flex: 1, padding: "7px 12px", fontSize: 12 }}
              value={mistakeInput}
              onChange={(e) => setMistakeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mistakeInput.trim()) {
                  const v = mistakeInput.trim();
                  if (!customMistakes.includes(v) && !MISTAKES.includes(v)) setCustomMistakes(c => [...c, v]);
                  set("mistake", v);
                  setMistakeInput("");
                }
              }}
              placeholder="Add mistake..."
            />
            <button
              onClick={() => {
                const v = mistakeInput.trim();
                if (!v) return;
                if (!customMistakes.includes(v) && !MISTAKES.includes(v)) setCustomMistakes(c => [...c, v]);
                set("mistake", v);
                setMistakeInput("");
              }}
              style={{ background: t.accent + "20", border: `1px solid ${t.accent}40`, color: t.accent, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
            >+ Add</button>
          </div>
        </div>
        {sectionHeader("Notes", "tut-trade-notes", <PenIcon size={12} />)}
        <div id="tut-trade-tags" style={{ marginBottom: 12 }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TagsIcon size={14} />Tags</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {(form.tags || []).map((tg) => (
              <Tag key={tg} label={tg} t={t} onRemove={() => removeTag(tg)} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {SUGGESTED_TAGS.filter((s) => !(form.tags || []).includes(s)).map((s) => (
              <span
                key={s}
                onClick={() => addTag(s)}
                style={{
                  background: t.tagBg,
                  color: t.text3,
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                + {s}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp(), flex: 1, padding: "7px 12px", fontSize: 12 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)}
              placeholder="Add tag..."
            />
            <button
              onClick={() => addTag(tagInput)}
              style={{
                background: t.accent + "20",
                border: `1px solid ${t.accent}40`,
                color: t.accent,
                borderRadius: 8,
                padding: "0 14px",
                cursor: "pointer",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              + Add
            </button>
          </div>
        </div>
        <div id="tut-trade-media">
          <div style={{ marginBottom: 12 }}>
            <VoiceNote value={form.voiceNote} onChange={(v) => set("voiceNote", v)} t={t} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <ScreenshotUpload value={form.screenshots || []} onChange={(v) => set("screenshots", v)} t={t} />
          </div>
        </div>
        <div id="tut-trade-notes-text" style={{ marginBottom: 20 }}>
          <label style={lbl}>Notes</label>
          <textarea
            style={{ ...inp(), height: 80, resize: "none" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What happened? What did you learn?"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "none",
              border: `1px solid ${t.border}`,
              color: t.text3,
              borderRadius: 8,
              padding: 12,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            id="tut-trade-csv"
            onClick={onCSVImport}
            style={{
              flex: 1,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.text2,
              borderRadius: 8,
              padding: 12,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            CSV
          </button>
          <button
            onClick={save}
            style={{
              flex: 2,
              background: t.accent,
              border: "none",
              color: "#000",
              borderRadius: 8,
              padding: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {editLabel || "Save Trade"}
          </button>
    </div>
    {dupWarning && (
      <div style={{ marginTop: 10, background: "#f59e0b18", border: "1px solid #f59e0b60", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8 }}>⚠ A trade for <strong>{form.ticker?.toUpperCase()}</strong> on <strong>{form.date}</strong> already exists. Duplicate?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDupWarning(false)} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { setDupWarning(false); save(true); }} style={{ flex: 1, background: "#f59e0b", border: "none", color: "#000", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Save Anyway</button>
        </div>
      </div>
    )}
    </div>
    </div>
  );
}
