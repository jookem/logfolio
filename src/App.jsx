import { useState, useMemo, useEffect } from "react";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(t.getDate()).padStart(2, "0")}`;
};

function calcPL(trade) {
  if (trade.type === "stock") {
    const dir = trade.direction === "long" ? 1 : -1;
    return dir * (trade.exitPrice - trade.entryPrice) * trade.shares;
  }
  return (trade.legs || []).reduce((sum, l) => {
    const dir = l.position === "buy" ? 1 : -1;
    return sum + dir * (l.exitPremium - l.entryPremium) * l.contracts * 100;
  }, 0);
}

function calcR(trade) {
  if (!trade.stopLoss || !trade.entryPrice) return null;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  if (risk === 0) return null;
  if (trade.type === "stock") {
    const pl = (trade.exitPrice - trade.entryPrice) * (trade.direction === "long" ? 1 : -1);
    return pl / risk;
  }
  return null;
}

function fmtR(r) {
  if (r === null || r === undefined) return null;
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}
const STRATEGIES = [
  "Breakout",
  "Pullback",
  "Reversal",
  "Scalp",
  "Long Call",
  "Long Put",
  "Bull Call Spread",
  "Bear Put Spread",
  "Iron Condor",
  "Straddle",
  "Strangle",
  "Covered Call",
  "Cash Secured Put",
  "Butterfly",
  "endar Spread",
];
const EMOTIONS = [
  "m",
  "Confident",
  "Anxious",
  "FOMO",
  "Revenge",
  "Overconfident",
  "Disciplined",
];
const MISTAKES = [
  "None",
  "FOMO Entry",
  "Revenge Trade",
  "Broke Stop Loss",
  "Overtrading",
  "No Plan",
  "Sized Too Large",
  "Held Too Long",
];
const SUGGESTED_TAGS = [
  "Earnings",
  "Pre-Market",
  "News Driven",
  "Gap Fill",
  "Trend Follow",
  "Counter Trend",
  "High Volume",
  "Low Float",
  "Overnight",
  "Hedge",
];
const STORAGE_KEY = "tradelog_trades";
const THEME_KEY = "tradelog_theme";

const SEED_TRADES = [
  {
    id: 1,
    date: "2026-03-01",
    ticker: "AAPL",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    entryPrice: 190,
    exitPrice: 196,
    shares: 50,
    notes: "Clean breakout above resistance.",
    emotion: "Confident",
    mistake: "None",
    tags: ["High Volume"],
  },
  {
    id: 2,
    date: "2026-03-03",
    ticker: "NVDA",
    type: "stock",
    strategy: "Pullback",
    direction: "long",
    entryPrice: 870,
    exitPrice: 855,
    shares: 20,
    notes: "Entered too early.",
    emotion: "FOMO",
    mistake: "FOMO Entry",
    tags: ["Trend Follow"],
  },
  {
    id: 3,
    date: "2026-03-05",
    ticker: "TSLA",
    type: "options",
    strategy: "Long Call",
    direction: "long",
    legs: [
      {
        position: "buy",
        type: "call",
        strike: 250,
        expiration: "2026-04-18",
        entryPremium: 4.2,
        exitPremium: 7.8,
        contracts: 3,
      },
    ],
    notes: "Earnings play.",
    emotion: "Disciplined",
    mistake: "None",
    tags: ["Earnings"],
  },
  {
    id: 4,
    date: "2026-03-07",
    ticker: "SPY",
    type: "options",
    strategy: "Iron Condor",
    direction: "neutral",
    legs: [
      {
        position: "buy",
        type: "put",
        strike: 490,
        expiration: "2026-03-21",
        entryPremium: 0.8,
        exitPremium: 0.3,
        contracts: 5,
      },
      {
        position: "sell",
        type: "put",
        strike: 495,
        expiration: "2026-03-21",
        entryPremium: 2.1,
        exitPremium: 0.6,
        contracts: 5,
      },
      {
        position: "sell",
        type: "call",
        strike: 520,
        expiration: "2026-03-21",
        entryPremium: 1.9,
        exitPremium: 0.45,
        contracts: 5,
      },
      {
        position: "buy",
        type: "call",
        strike: 525,
        expiration: "2026-03-21",
        entryPremium: 0.7,
        exitPremium: 0.2,
        contracts: 5,
      },
    ],
    notes: "Theta decay.",
    emotion: "Calm",
    mistake: "None",
    tags: ["Hedge"],
  },
  {
    id: 5,
    date: "2026-03-09",
    ticker: "META",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    entryPrice: 570,
    exitPrice: 582,
    shares: 30,
    notes: "Strong momentum.",
    emotion: "Disciplined",
    mistake: "None",
    tags: ["Trend Follow", "High Volume"],
  },
  {
    id: 6,
    date: "2026-03-10",
    ticker: "AMD",
    type: "stock",
    strategy: "Reversal",
    direction: "short",
    entryPrice: 155,
    exitPrice: 162,
    shares: 40,
    notes: "Bad read.",
    emotion: "Anxious",
    mistake: "No Plan",
    tags: [],
  },
];

function loadTrades() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return null;
}
function saveTrades(t) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {}
}
function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {}
  return "dark";
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 680);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function tk(dark) {
  return dark
    ? {
        bg: "#000",
        surface: "rgba(255,255,255,0.03)",
        border: "#1a1a1a",
        border2: "#222",
        text: "#ffff",
        text2: "#f4f5f7",
        text3: "#b0b0b0",
        text4: "#333",
        input: "#111",
        inputBorder: "#2a2a2a",
        card: "#0d0d0d",
        card2: "#111",
        accent: "#00ff87",
        danger: "#ff4d6d",
        navBg: "#070707",
        navBorder: "#111",
        hoverBg: "#0d0d0d",
        tagBg: "#1a1a1a",
        tagText: "#888",
      }
    : {
        bg: "#f4f5f7",
        surface: "rgba(0,0,0,0.02)",
        border: "#e2e4e9",
        border2: "#d5d8e0",
        text: "#0d0f14",
        text2: "#4a5068",
        text3: "#9499ad",
        text4: "#c5c8d4",
        input: "#fff",
        inputBorder: "#d0d4de",
        card: "#fff",
        card2: "#f8f9fb",
        accent: "#00b87a",
        danger: "#e63757",
        navBg: "#fff",
        navBorder: "#e2e4e9",
        hoverBg: "#eef0f5",
        tagBg: "#e8eaf0",
        tagText: "#6b7280",
      };
}

function StatCard({ label, value, sub, color, t }) {
  const c = color || t.accent;
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: t.text3,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 6,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: c,
          fontFamily: "'Space Mono', monospace",
          letterSpacing: -1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

function MiniBar({ value, max, t }) {
  const w = (Math.abs(value) / Math.abs(max)) * 100;
  return (
    <div
      style={{
        height: 4,
        width: "100%",
        background: t.border2,
        borderRadius: 2,
        marginTop: 5,
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: value >= 0 ? t.accent : t.danger,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

function Tag({ label, t, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: t.tagBg,
        color: t.tagText,
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 11,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {label}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6 }}>
          ×
        </span>
      )}
    </span>
  );
}

function EquityCurve({ trades, t }) {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  let running = 0;
  const points = sorted.map((tr) => {
    running += calcPL(tr);
    return { val: running };
  });
  if (points.length < 2)
    return (
      <div
        style={{
          height: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.text4,
          fontSize: 12,
          fontFamily: "monospace",
        }}
      >
        Add more trades to see curve
      </div>
    );
  const min = Math.min(0, ...points.map((p) => p.val)),
    max = Math.max(...points.map((p) => p.val));
  const range = max - min || 1,
    W = 500,
    H = 90;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.val - min) / range) * H);
  const path = points
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]},${ys[i]}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 90 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${xs[xs.length - 1]},${H} L 0,${H} Z`}
        fill="url(#eg)"
      />
      <path
        d={path}
        fill="none"
        stroke={t.accent}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xs[i]}
          cy={ys[i]}
          r="3"
          fill={t.accent}
          opacity="0.6"
        />
      ))}
    </svg>
  );
}
function PlanModal({ onClose, onSave, t }) {
  const [form, setForm] = useState({
    date: todayStr(),
    ticker: "",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    notes: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const plannedR = form.entryPrice && form.stopLoss && form.takeProfit
    ? ((+form.takeProfit - +form.entryPrice) * (form.direction === "long" ? 1 : -1)) /
      Math.abs(+form.entryPrice - +form.stopLoss)
    : null;

  const riskAmount = form.entryPrice && form.stopLoss
    ? Math.abs(+form.entryPrice - +form.stopLoss)
    : null;

  const addTag = (tag) => {
    const c = tag.trim();
    if (c && !(form.tags || []).includes(c)) set("tags", [...(form.tags || []), c]);
    setTagInput("");
  };
  const removeTag = (tag) => set("tags", (form.tags || []).filter((tg) => tg !== tag));

  const save = () => {
    if (!form.ticker || !form.entryPrice || !form.stopLoss) return;
    onSave({
      ...form,
      ticker: form.ticker.toUpperCase(),
      id: Date.now(),
      entryPrice: +form.entryPrice,
      stopLoss: +form.stopLoss,
      takeProfit: form.takeProfit ? +form.takeProfit : null,
      plannedR: plannedR,
      status: "planned",
      tags: form.tags || [],
      legs: [],
    });
  };

  const inp = {
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    color: t.text,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  };
  const lbl = {
    fontSize: 11,
    color: t.text3,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    display: "block",
    fontFamily: "'Space Mono', monospace",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent }}>
            📋 Plan Trade
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Live R preview */}
        {plannedR !== null && (
          <div style={{
            background: plannedR >= 2 ? t.accent + "15" : t.danger + "15",
            border: `1px solid ${plannedR >= 2 ? t.accent : t.danger}30`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Planned R</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: plannedR >= 2 ? t.accent : t.danger }}>
                +{plannedR.toFixed(2)}R
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Risk per Share</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, color: t.danger }}>${riskAmount?.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Ticker</label>
            <input style={inp} value={form.ticker} onChange={(e) => set("ticker", e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
          <div>
            <label style={lbl}>Date</label>
            <input style={inp} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select style={inp} value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="stock">Stock</option>
              <option value="options">Options</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Strategy</label>
            <select style={inp} value={form.strategy} onChange={(e) => set("strategy", e.target.value)}>
              {(form.type === "stock"
                ? ["Breakout", "Pullback", "Reversal", "Scalp"]
                : ["Long Call", "Long Put", "Bull Call Spread", "Bear Put Spread", "Iron Condor", "Straddle", "Strangle", "Covered Call", "Cash Secured Put", "Butterfly", "Calendar Spread"]
              ).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Direction</label>
            <select style={inp} value={form.direction} onChange={(e) => set("direction", e.target.value)}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Entry Price</label>
            <input style={inp} type="number" value={form.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} placeholder="190.00" />
          </div>
          <div>
            <label style={lbl}>Stop Loss ⚠</label>
            <input style={{ ...inp, borderColor: form.stopLoss ? t.danger + "80" : t.inputBorder }} type="number" value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} placeholder="185.00" />
          </div>
          <div>
            <label style={lbl}>Take Profit 🎯</label>
            <input style={{ ...inp, borderColor: form.takeProfit ? t.accent + "80" : t.inputBorder }} type="number" value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} placeholder="200.00" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {(form.tags || []).map((tg) => <Tag key={tg} label={tg} t={t} onRemove={() => removeTag(tg)} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED_TAGS.filter((s) => !(form.tags || []).includes(s)).map((s) => (
              <span key={s} onClick={() => addTag(s)} style={{ background: t.tagBg, color: t.text3, borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
                + {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Trade Thesis</label>
          <textarea style={{ ...inp, height: 80, resize: "none" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Why are you taking this trade? What's your edge?" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 12, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={save} disabled={!form.ticker || !form.entryPrice || !form.stopLoss} style={{
            flex: 2, background: (!form.ticker || !form.entryPrice || !form.stopLoss) ? t.card2 : t.accent,
            border: "none", color: (!form.ticker || !form.entryPrice || !form.stopLoss) ? t.text3 : "#000",
            borderRadius: 8, padding: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace",
          }}>
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}
function TradeFormModal({ initial, onClose, onSave, t }) {
  const blank = {
    date: todayStr(),
    ticker: "",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    entryPrice: "",
    exitPrice: "",
    shares: "",
    emotion: "Calm",
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
  const [tagInput, setTagInput] = useState("");
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
  const save = () => {
    if (!form.ticker) return;
    const trade = {
      ...form,
      ticker: form.ticker.toUpperCase(),
      id: form.id || Date.now(),
      tags: form.tags || [],
    };
    if (form.type === "stock") {
      trade.entryPrice = +form.entryPrice;
      trade.exitPrice = +form.exitPrice;
      trade.shares = +form.shares;
    } else {
      trade.legs = form.legs.map((l) => ({
        ...l,
        strike: +l.strike,
        entryPremium: +l.entryPremium,
        exitPremium: +l.exitPremium,
        contracts: +l.contracts,
      }));
    }
    onSave(trade);
  };
  const inp = {
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    color: t.text,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  };
  const lbl = {
    fontSize: 11,
    color: t.text3,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    display: "block",
    fontFamily: "'Space Mono', monospace",
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 24,
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
            }}
          >
            {form.id ? "✏ Edit Trade" : "+ New Trade"}
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
            ✕
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={lbl}>Ticker</label>
            <input
              style={inp}
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              placeholder="AAPL"
            />
          </div>
          <div>
            <label style={lbl}>Date</label>
            <input
              style={inp}
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select
              style={inp}
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="stock">Stock</option>
              <option value="options">Options</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Strategy</label>
            <select
              style={inp}
              value={form.strategy}
              onChange={(e) => set("strategy", e.target.value)}
            >
              {(form.type === "stock"
                ? ["Breakout", "Pullback", "Reversal", "Scalp"]
                : [
                    "Long Call",
                    "Long Put",
                    "Bull Call Spread",
                    "Bear Put Spread",
                    "Iron Condor",
                    "Straddle",
                    "Strangle",
                    "Covered Call",
                    "Cash Secured Put",
                    "Butterfly",
                    "Calendar Spread",
                  ]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {form.type === "stock" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={lbl}>Direction</label>
              <select
                style={inp}
                value={form.direction}
                onChange={(e) => set("direction", e.target.value)}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Shares</label>
              <input
                style={inp}
                type="number"
                value={form.shares}
                onChange={(e) => set("shares", e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <label style={lbl}>Entry $</label>
              <input
                style={inp}
                type="number"
                value={form.entryPrice}
                onChange={(e) => set("entryPrice", e.target.value)}
                placeholder="190"
              />
            </div>
            <div>
              <label style={lbl}>Exit $</label>
              <input
                style={inp}
                type="number"
                value={form.exitPrice}
                onChange={(e) => set("exitPrice", e.target.value)}
                placeholder="196"
              />
            </div>
          </div>
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
                    style={inp}
                    value={leg.position}
                    onChange={(e) => setLeg(i, "position", e.target.value)}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                  <select
                    style={inp}
                    value={leg.type}
                    onChange={(e) => setLeg(i, "type", e.target.value)}
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                  <input
                    style={inp}
                    type="number"
                    placeholder="Strike"
                    value={leg.strike}
                    onChange={(e) => setLeg(i, "strike", e.target.value)}
                  />
                  <input
                    style={inp}
                    type="date"
                    value={leg.expiration}
                    onChange={(e) => setLeg(i, "expiration", e.target.value)}
                  />
                  <input
                    style={inp}
                    type="number"
                    placeholder="Entry $"
                    value={leg.entryPremium}
                    onChange={(e) => setLeg(i, "entryPremium", e.target.value)}
                  />
                  <input
                    style={inp}
                    type="number"
                    placeholder="Exit $"
                    value={leg.exitPremium}
                    onChange={(e) => setLeg(i, "exitPremium", e.target.value)}
                  />
                  <input
                    style={inp}
                    type="number"
                    placeholder="Contracts"
                    value={leg.contracts}
                    onChange={(e) => setLeg(i, "contracts", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={lbl}>Emotion</label>
            <select
              style={inp}
              value={form.emotion}
              onChange={(e) => set("emotion", e.target.value)}
            >
              {EMOTIONS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Mistake</label>
            <select
              style={inp}
              value={form.mistake}
              onChange={(e) => set("mistake", e.target.value)}
            >
              {MISTAKES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Tags</label>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inp, flex: 1 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)}
              placeholder="Type tag + Enter"
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
              }}
            >
              Add
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED_TAGS.filter((s) => !(form.tags || []).includes(s)).map(
              (s) => (
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
              )
            )}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Notes</label>
          <textarea
            style={{ ...inp, height: 80, resize: "none" }}
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
            Save Trade
          </button>
        </div>
      </div>
    </div>
  );
}

function CSVModal({ onClose, on, t }) {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const TEMPLATE = `Supported brokers: Webull, Robinhood, TD Ameritrade, Interactive Brokers\nPaste your exported CSV/TSV directly — broker format is auto-detected.`;

  const detectBroker = (headers) => {
    if (headers.includes("symbol") && headers.includes("side") && headers.includes("filled time")) return "webull";
    if (headers.includes("symbol") && headers.includes("side") && headers.includes("state")) return "robinhood";
    if (headers.includes("symbol") && headers.includes("buy/sell") && headers.includes("exec time")) return "tdameritrade";
    if (headers.includes("symbol") && headers.includes("buy/sell") && headers.includes("date/time")) return "ibkr";
    return "unknown";
  };

  const parse = () => {
    setError("");
    try {
      const lines = csv.trim().split("\n").filter(Boolean);
      if (lines.length < 2) { setError("Need at least a header row and one data row."); return; }

      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, " "));
      const broker = detectBroker(headers);

      const rows = lines.slice(1).map(line => {
        const vals = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });

      const parseDate = (str) => {
        if (!str) return todayStr();
        const clean = str.split(" ")[0];
        if (clean.includes("/")) {
          const parts = clean.split("/");
          if (parts[2]?.length === 4) return `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
          if (parts[0]?.length === 4) return `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}`;
        }
        if (clean.includes("-")) return clean.slice(0, 10);
        return todayStr();
      };

      const parsePrice = (v) => parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0;

      let orders = [];

      if (broker === "webull") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker) return;
          orders.push({
            ticker,
            side: (row.side || "").toLowerCase(),
            price: parsePrice(row["avg price"] || row.price),
            shares: parsePrice(row.filled || row["total qty"]),
            date: parseDate(row["filled time"] || row["placed time"]),
          });
        });
      } else if (broker === "robinhood") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker || row.state?.toLowerCase() !== "filled") return;
          orders.push({
            ticker,
            side: (row.side || "").toLowerCase(),
            price: parsePrice(row["average price"] || row.price),
            shares: parsePrice(row["filled quantity"] || row.quantity),
            date: parseDate(row["last transaction at"] || row.date),
          });
        });
      } else if (broker === "tdameritrade") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker) return;
          orders.push({
            ticker,
            side: (row["buy/sell"] || "").toLowerCase(),
            price: parsePrice(row.price),
            shares: parsePrice(row.quantity),
            date: parseDate(row["exec time"] || row.date),
          });
        });
      } else if (broker === "ibkr") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker || row["asset category"]?.toLowerCase() !== "stocks") return;
          const side = parsePrice(row.quantity) > 0 ? "buy" : "sell";
          orders.push({
            ticker,
            side,
            price: parsePrice(row["t. price"] || row.price),
            shares: Math.abs(parsePrice(row.quantity)),
            date: parseDate(row["date/time"] || row.date),
          });
        });
      } else {
        rows.forEach(row => {
          const ticker = (row.symbol || row.ticker || "").toUpperCase();
          if (!ticker) return;
          const side = (row.side || row["buy/sell"] || row.action || "").toLowerCase();
          orders.push({
            ticker,
            side: side.includes("buy") ? "buy" : "sell",
            price: parsePrice(row["avg price"] || row.price || row["average price"]),
            shares: parsePrice(row.filled || row.quantity || row.shares),
            date: parseDate(row.date || row["filled time"] || row["exec time"]),
          });
        });
      }

      const byTicker = {};
      orders.forEach(o => {
        if (!byTicker[o.ticker]) byTicker[o.ticker] = { buys: [], sells: [] };
        if (o.side === "buy") byTicker[o.ticker].buys.push(o);
        else byTicker[o.ticker].sells.push(o);
      });

      const trades = [];
      Object.entries(byTicker).forEach(([ticker, { buys, sells }]) => {
        const buyQueue = [...buys];
        sells.forEach(sell => {
          const buy = buyQueue.shift();
          if (buy) {
            trades.push({
              id: Date.now() + Math.random(),
              date: buy.date,
              ticker,
              type: "stock",
              direction: "long",
              entryPrice: buy.price,
              exitPrice: sell.price,
              shares: Math.min(buy.shares, sell.shares),
              strategy: "Breakout",
              emotion: "Calm",
              mistake: "None",
              notes: `ed from ${broker}`,
              tags: [],
              legs: [],
            });
          }
        });
      });

      if (trades.length === 0) { setError("No completed trades found. Only closed trades will ."); return; }
      trades.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPreview(trades);
    } catch (e) {
      setError("Could not parse file. " + e.message);
    }
  };

  const inp = {
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    color: t.text,
    padding: "10px 14px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "monospace",
    outline: "none",
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent }}>CSV Import</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Format</div>
          <pre style={{ fontSize: 10, color: t.text2, margin: 0, overflowX: "auto", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{TEMPLATE}</pre>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <label
  style={{
    flex: 1,
    background: t.accent + "15",
    border: `1px solid ${t.accent}40`,
    color: t.accent,
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "'Space Mono',monospace",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  }}
>
  <img src="/images/import.svg" alt="folder" style={{ height: 32, width: 32 }} /> Choose File
              <input type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setCsv(ev.target.result);
                reader.readAsText(file);
              }} />
            </label>
          </div>
          <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Or paste CSV/TSV content here..." />
        </div>
        {error && <div style={{ color: t.danger, fontSize: 13, marginBottom: 10, fontFamily: "monospace" }}>⚠ {error}</div>}
        {preview.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.accent, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>✓ {preview.length} trades ready</div>
            <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
              {preview.slice(0, 4).map((tr, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderBottom: i < preview.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text }}>{tr.ticker}</span>
                  <span style={{ fontSize: 12, color: t.text3 }}>{tr.notes}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: t.text3 }}>{tr.date}</span>
                </div>
              ))}
              {preview.length > 4 && <div style={{ padding: "7px 12px", fontSize: 12, color: t.text3 }}>+{preview.length - 4} more...</div>}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onClose} style={{ flex: 1, minWidth: 80, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 11, cursor: "pointer" }}>Cancel</button>
          <button onClick={parse} style={{ flex: 1, minWidth: 80, background: t.card2, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: 11, cursor: "pointer" }}>Preview</button>
          {preview.length > 0 && (
            <button onClick={() => onImport(preview)} style={{ flex: 2, minWidth: 120, background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: 11, cursor: "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
              Import {preview.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade, onClick, onEdit, onDelete, t, mobile }) {
  const pl = calcPL(trade);
  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: `1px solid ${t.border}`,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {mobile ? (
        <div onClick={onClick}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 15,
                fontWeight: 700,
                color: t.text,
              }}
            >
              {trade.ticker}
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 15,
                fontWeight: 700,
                color: pl >= 0 ? t.accent : t.danger,
              }}
            >
              {pl >= 0 ? "+" : ""}
              {fmt(pl)}
               {trade.r !== null && trade.r !== undefined && (
    <div style={{ fontSize: 10, color: trade.r >= 0 ? t.accent : t.danger, opacity: 0.8 }}>
      {fmtR(trade.r)}
    </div>
  )}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: t.text3 }}>
              {trade.strategy} · {fmtDate(trade.date)}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  background: "none",
                  border: `1px solid ${t.border}`,
                  color: t.text3,
                  borderRadius: 5,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  background: "none",
                  border: `1px solid ${t.danger}40`,
                  color: t.danger,
                  borderRadius: 5,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Del
              </button>
            </div>
          </div>
          {trade.tags?.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                marginTop: 5,
                flexWrap: "wrap",
              }}
            >
              {trade.tags.map((tg) => (
                <Tag key={tg} label={tg} t={t} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "85px 70px 1fr auto 90px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span
            onClick={onClick}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: t.text3,
            }}
          >
            {fmtDate(trade.date)}
          </span>
          <span
            onClick={onClick}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              fontWeight: 700,
              color: t.text,
            }}
          >
            {trade.ticker}
          </span>
          <span onClick={onClick} style={{ fontSize: 13, color: t.text3 }}>
            {trade.strategy}
            {trade.tags?.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  color: t.accent,
                  background: t.accent + "15",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                {trade.tags[0]}
                {trade.tags.length > 1 ? ` +${trade.tags.length - 1}` : ""}
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.text3,
                borderRadius: 6,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                background: "none",
                border: `1px solid ${t.danger}40`,
                color: t.danger,
                borderRadius: 6,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Del
            </button>
          </div>
          <span
            onClick={onClick}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: pl >= 0 ? t.accent : t.danger,
              textAlign: "right",
            }}
          >
            {pl >= 0 ? "+" : ""}
            {fmt(pl)}
          </span>
        </div>
      )}
    </div>
  );
}

function TradeDetail({ trade, onClose, onEdit, t }) {
  const pl = calcPL(trade);
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
        <div>
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
            <div
              style={{
                display: "flex",
                gap: 5,
                marginTop: 7,
                flexWrap: "wrap",
              }}
            >
              {trade.tags.map((tg) => (
                <Tag key={tg} label={tg} t={t} />
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 22,
              fontWeight: 700,
              color: pl >= 0 ? t.accent : t.danger,
            }}
          >
            {pl >= 0 ? "+" : ""}
            {fmt(pl)}
          </div>
          <div
            style={{
              display: "flex",
              gap: 7,
              marginTop: 7,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onEdit}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.text3,
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ✏ Edit
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                color: t.text3,
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      {trade.type === "stock" ? (
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
            ["Exit", fmt(trade.exitPrice)],
            ["Shares", trade.shares],
            ["Direction", trade.direction],...(trade.stopLoss ? [["Stop Loss", fmt(trade.stopLoss)]] : []),
  ...(trade.takeProfit ? [["Take Profit", fmt(trade.takeProfit)]] : []),
  ...(trade.plannedR != null ? [["Planned R", `+${trade.plannedR?.toFixed(2)}R`]] : []),
  ...(trade.r != null ? [["R-Multiple", fmtR(trade.r)]] : []),
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
          gridTemplateColumns: "1fr 1fr",
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
      </div>
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
    </div>
  );
}

function CalendarView({ plList, t, mobile }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const tStr = todayStr();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const prev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };
  const dayMap = useMemo(() => {
    const m = {};
    plList.forEach((tr) => {
      const k = tr.date.slice(0, 10);
      if (!m[k]) m[k] = { pl: 0, trades: [] };
      m[k].pl += tr.pl;
      m[k].trades.push(tr);
    });
    return m;
  }, [plList]);
  const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthTrades = plList.filter((tr) => tr.date.startsWith(prefix));
  const monthPL = monthTrades.reduce((s, tr) => s + tr.pl, 0);
  const monthWins = monthTrades.filter((tr) => tr.pl > 0).length;
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const selectedKey = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
        selectedDay
      ).padStart(2, "0")}`
    : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;
  const bestDay = (() => {
    const days = Object.entries(dayMap).filter(([k]) => k.startsWith(prefix));
    return days.length ? fmt(Math.max(...days.map(([, v]) => v.pl))) : "$0";
  })();

  return (
    <div>
      {/* Stats — always single column on mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Month P/L"
          value={fmt(monthPL)}
          sub={`${monthTrades.length} trades`}
          color={monthPL >= 0 ? t.accent : t.danger}
          t={t}
        />
        <StatCard
          label="Win Rate"
          value={
            monthTrades.length
              ? `${((monthWins / monthTrades.length) * 100).toFixed(0)}%`
              : "—"
          }
          sub={`${monthWins}W / ${monthTrades.length - monthWins}L`}
          t={t}
        />
        <StatCard
          label="Days"
          value={Object.keys(dayMap).filter((k) => k.startsWith(prefix)).length}
          sub="active trading days"
          t={t}
        />
        <StatCard label="Best Day" value={bestDay} t={t} />
      </div>

      {/* Calendar grid — always full width */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <button
            onClick={prev}
            style={{
              background: t.card2,
              border: `1px solid ${t.border}`,
              color: t.text2,
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ‹
          </button>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              color: t.text,
            }}
          >
            {monthName}
          </div>
          <button
            onClick={next}
            style={{
              background: t.card2,
              border: `1px solid ${t.border}`,
              color: t.text2,
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ›
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 3,
            marginBottom: 6,
          }}
        >
          {(mobile
            ? ["S", "M", "T", "W", "T", "F", "S"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: 10,
                color: t.text4,
                fontFamily: "'Space Mono', monospace",
                padding: "3px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: mobile ? 2 : 3,
          }}
        >
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            const data = dayMap[key];
            const isToday = key === tStr,
              isSelected = selectedDay === day,
              isGreen = data?.pl > 0;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                style={{
                  borderRadius: 7,
                  padding: mobile ? "4px 2px" : "5px 3px",
                  minHeight: mobile ? 44 : 52,
                  cursor: data ? "pointer" : "default",
                  border: isSelected
                    ? `1px solid ${t.accent}`
                    : isToday
                    ? `1px solid ${t.border2}`
                    : `1px solid transparent`,
                  background: isSelected
                    ? t.accent + "10"
                    : data
                    ? isGreen
                      ? t.accent + "08"
                      : t.danger + "08"
                    : "transparent",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: mobile ? 10 : 11,
                    color: isToday ? t.accent : data ? t.text : t.text4,
                    fontWeight: isToday ? 700 : 400,
                    marginBottom: 2,
                  }}
                >
                  {day}
                </div>
                {data && (
                  <>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: mobile ? 9 : 10,
                        color: isGreen ? t.accent : t.danger,
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {isGreen ? "+" : ""}
                      {fmt(data.pl)}
                    </div>
                    {!mobile && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 2,
                          marginTop: 2,
                        }}
                      >
                        {data.trades.slice(0, 3).map((_, ti) => (
                          <div
                            key={ti}
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: "50%",
                              background: isGreen ? t.accent : t.danger,
                              opacity: 0.7,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail — always full width below calendar */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
        }}
      >
        {!selectedDay ? (
          <div
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: t.text4,
              textAlign: "center",
              gap: 8,
            }}
          >
            <img src="/images/calendar.svg" alt="calendar" style={{ height: 28, width: 28 }} />
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Tap a day to see trades
            </div>
          </div>
        ) : !selectedData ? (
          <div
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: t.text4,
              textAlign: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28 }}>—</div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              No trades on this day
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  color: t.text3,
                  marginBottom: 3,
                }}
              >
                {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" }
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: selectedData.pl >= 0 ? t.accent : t.danger,
                }}
              >
                {selectedData.pl >= 0 ? "+" : ""}
                {fmt(selectedData.pl)}
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>
                {selectedData.trades.length} trade
                {selectedData.trades.length !== 1 ? "s" : ""} ·{" "}
                {selectedData.trades.filter((tr) => tr.pl > 0).length} wins
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedData.trades.map((tr) => (
                <div
                  key={tr.id}
                  style={{
                    background: t.card2,
                    borderRadius: 8,
                    padding: "11px 13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: t.text,
                      }}
                    >
                      {tr.ticker}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: tr.pl >= 0 ? t.accent : t.danger,
                      }}
                    >
                      {tr.pl >= 0 ? "+" : ""}
                      {fmt(tr.pl)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: t.text3 }}>
                    {tr.strategy} ·{" "}
                    {tr.type === "options"
                      ? `${tr.legs?.length}L options`
                      : `${tr.shares} shares`}
                  </div>
                  {tr.tags?.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {tr.tags.map((tg) => (
                        <Tag key={tg} label={tg} t={t} />
                      ))}
                    </div>
                  )}
                  {tr.mistake !== "None" && (
                    <div
                      style={{ fontSize: 11, color: t.danger, marginTop: 3 }}
                    >
                      ⚠ {tr.mistake}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function QuoteOfDay({ t }) {
  const [quote, setQuote] = useState(null);

  const FALLBACK_QUOTES = [
    { content: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
    { content: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { content: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
    { content: "In trading, the impossible happens about twice a year.", author: "Henri M. Cauvin" },
    { content: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { content: "The secret to being successful from a trading perspective is to have an indefatigable and an undying and unquenchable thirst for information.", author: "Paul Tudor Jones" },
    { content: "It's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
    { content: "The most important thing is to have a method for staying with your winners and cutting your losers.", author: "Michael Covel" },
    { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { content: "Plan your trade and trade your plan.", author: "Unknown" },
  ];

  useEffect(() => {
    const today = todayStr();
    const cached = localStorage.getItem("quote_cache");
    if (cached) {
      const { date, data } = JSON.parse(cached);
      if (date === today) { setQuote(data); return; }
    }
    fetch("https://api.quotable.io/random?tags=success|inspirational|wisdom&maxLength=180")
      .then(r => r.json())
      .then(data => {
        const q = { content: data.content, author: data.author };
        localStorage.setItem("quote_cache", JSON.stringify({ date: today, data: q }));
        setQuote(q);
      })
      .catch(() => {
        const idx = new Date().getDate() % FALLBACK_QUOTES.length;
        setQuote(FALLBACK_QUOTES[idx]);
      });
  }, []);

  if (!quote) return null;

  return (
    <div style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 24,
      position: "relative",
    }}>
      <div style={{
        fontSize: 10, color: t.accent, fontFamily: "'Space Mono',monospace",
        textTransform: "uppercase", letterSpacing: 2, marginBottom: 8,
      }}>
        Quote of the Day
      </div>
      <div style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, fontStyle: "italic", marginBottom: 8 }}>
        "{quote.content}"
      </div>
      <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace" }}>
        — {quote.author}
      </div>
    </div>
  );
}
function DaySession({ plList, onAddTrade, t, mobile }) {
  const today = todayStr();
  const todayTrades = plList.filter((tr) => tr.date === today);
  const sessionPL = todayTrades.reduce((s, tr) => s + tr.pl, 0);
  const wins = todayTrades.filter((tr) => tr.pl > 0).length;
  const losses = todayTrades.filter((tr) => tr.pl < 0).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayName = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div>
      <QuoteOfDay t={t} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: t.text3,
              marginBottom: 4,
            }}
          >
            {dayName}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: mobile ? 32 : 42,
              fontWeight: 700,
              color: sessionPL >= 0 ? t.accent : t.danger,
              letterSpacing: -2,
            }}
          >
            {sessionPL >= 0 ? "+" : ""}
            {fmt(sessionPL)}
          </div>
          <div style={{ fontSize: 13, color: t.text3, marginTop: 5 }}>
            Session P&L · {todayTrades.length} trades · {wins}W {losses}L
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: mobile ? "flex-start" : "flex-end",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20,
              color: t.text3,
            }}
          >
            {timeStr}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                background: t.accent + "15",
                border: `1px solid ${t.accent}30`,
                borderRadius: 8,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.accent,
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: 2,
                }}
              >
                WINS
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: t.accent,
                }}
              >
                {wins}
              </div>
            </div>
            <div
              style={{
                background: t.danger + "15",
                border: `1px solid ${t.danger}30`,
                borderRadius: 8,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.danger,
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: 2,
                }}
              >
                LOSSES
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: t.danger,
                }}
              >
                {losses}
              </div>
            </div>
          </div>
        </div>
      </div>
      {todayTrades.length > 0 && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            Running P&L
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 56,
            }}
          >
            {(() => {
              let running = 0;
              const runs = todayTrades.map((tr) => {
                running += tr.pl;
                return running;
              });
              const max = Math.max(...runs.map(Math.abs), 1);
              return runs.map((val, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(Math.abs(val) / max) * 46 + 10}px`,
                      background: val >= 0 ? t.accent : t.danger,
                      borderRadius: 3,
                      opacity: 0.8,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 9,
                      color: t.text3,
                      fontFamily: "monospace",
                      overflow: "hidden",
                      maxWidth: "100%",
                      textAlign: "center",
                    }}
                  >
                    {todayTrades[i].ticker}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Today's Trades
          </div>
          <button
            onClick={onAddTrade}
            style={{
              background: t.accent,
              border: "none",
              color: "#000",
              borderRadius: 7,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            + Log Trade
          </button>
        </div>
        {todayTrades.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: t.text4,
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
            }}
          >
            No trades logged today yet
          </div>
        ) : (
          [...todayTrades].reverse().map((tr, i) => (
            <div
              key={tr.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom:
                  i < todayTrades.length - 1 ? `1px solid ${t.border}` : "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                    marginBottom: 3,
                  }}
                >
                  {tr.ticker}
                </div>
                <div style={{ fontSize: 12, color: t.text3 }}>
                  {tr.strategy} ·{" "}
                  {tr.type === "options"
                    ? `${tr.legs?.length}L options`
                    : `${tr.shares} shares`}
                </div>
                {tr.tags?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {tr.tags.map((tg) => (
                      <Tag key={tg} label={tg} t={t} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: tr.pl >= 0 ? t.accent : t.danger,
                  }}
                >
                  {tr.pl >= 0 ? "+" : ""}
                  {fmt(tr.pl)}
                </div>
                {tr.mistake !== "None" && (
                  <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>
                    ⚠ {tr.mistake}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WeeklyReview({ plList, t, mobile }) {
  const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  };
  const weeks = useMemo(() => {
    const map = {};
    plList.forEach((tr) => {
      const ws = getWeekStart(tr.date);
      if (!map[ws]) map[ws] = { trades: [], pl: 0, wins: 0 };
      map[ws].trades.push(tr);
      map[ws].pl += tr.pl;
      if (tr.pl > 0) map[ws].wins++;
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [plList]);
  if (!weeks.length)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: t.text4,
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
        }}
      >
        No trades to review yet.
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {weeks.map(([weekStart, data]) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `${fmtDate(weekStart)} – ${fmtDate(
          weekEnd.toISOString()
        )}`;
        const best = data.trades.reduce(
          (b, tr) => (tr.pl > b.pl ? tr : b),
          data.trades[0]
        );
        const worst = data.trades.reduce(
          (w, tr) => (tr.pl < w.pl ? tr : w),
          data.trades[0]
        );
        const mistakes = data.trades.filter((tr) => tr.mistake !== "None");
        return (
          <div
            key={weekStart}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${t.border}`,
                background: data.pl >= 0 ? t.accent + "08" : t.danger + "08",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: t.text3,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Week of {label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 20,
                    fontWeight: 700,
                    color: data.pl >= 0 ? t.accent : t.danger,
                  }}
                >
                  {data.pl >= 0 ? "+" : ""}
                  {fmt(data.pl)}
                </span>
                <span style={{ fontSize: 13, color: t.text3 }}>
                  {data.trades.length} trades · {data.wins}W{" "}
                  {data.trades.length - data.wins}L ·{" "}
                  {((data.wins / data.trades.length) * 100).toFixed(0)}% WR
                </span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr",
                gap: 0,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRight: `1px solid ${t.border}`,
                  borderBottom: mobile ? `1px solid ${t.border}` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 5,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Best
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: t.accent,
                    fontWeight: 700,
                  }}
                >
                  {best.ticker} {fmt(best.pl)}
                </div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                  {best.strategy}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRight: mobile ? "none" : `1px solid ${t.border}`,
                  borderBottom: mobile ? `1px solid ${t.border}` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 5,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Worst
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: t.danger,
                    fontWeight: 700,
                  }}
                >
                  {worst.ticker} {fmt(worst.pl)}
                </div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                  {worst.strategy}
                </div>
              </div>
              {!mobile && (
                <div style={{ padding: "12px 16px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: t.text3,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 5,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    Strategies
                  </div>
                  <div
                    style={{ fontSize: 12, color: t.text2, lineHeight: 1.6 }}
                  >
                    {[...new Set(data.trades.map((tr) => tr.strategy))].join(
                      ", "
                    )}
                  </div>
                </div>
              )}
            </div>
            {mistakes.length > 0 && (
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: `1px solid ${t.border}`,
                  background: t.danger + "06",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: t.danger,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ⚠ {mistakes.length} mistake{mistakes.length > 1 ? "s" : ""}:{" "}
                </span>
                <span style={{ fontSize: 12, color: t.text3 }}>
                  {[...new Set(mistakes.map((m) => m.mistake))].join(", ")}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function AIInsights({ plList, t, mobile }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analysePatterns = async () => {
    if (plList.length < 3) {
      setError("Add at least 3 trades to generate insights.");
      return;
    }
    setLoading(true);
    setError(null);
    setInsights(null);

    const summary = plList.map((tr) => ({
      date: tr.date,
      ticker: tr.ticker,
      strategy: tr.strategy,
      type: tr.type,
      pl: tr.pl,
      emotion: tr.emotion,
      mistake: tr.mistake,
      tags: tr.tags,
      direction: tr.direction,
      dayOfWeek: new Date(tr.date).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      hour: new Date(tr.date).getHours(),
    }));

    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const wins = plList.filter((t) => t.pl > 0);
    const losses = plList.filter((t) => t.pl < 0);
    const winRate = ((wins.length / plList.length) * 100).toFixed(0);

    try {
const response = await fetch("/api/analyse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: `You are an expert trading coach analysing a trader's journal data. Identify patterns, weaknesses and strengths. Be specific with numbers and percentages from the data.

Here is their trade history:
${JSON.stringify(summary, null, 2)}

Overall stats:
- Total trades: ${plList.length}
- Win rate: ${winRate}%
- Total P&L: $${totalPL.toFixed(0)}
- Avg win: $${
                  wins.length
                    ? (
                        wins.reduce((s, t) => s + t.pl, 0) / wins.length
                      ).toFixed(0)
                    : 0
                }
- Avg loss: $${
                  losses.length
                    ? (
                        losses.reduce((s, t) => s + t.pl, 0) / losses.length
                      ).toFixed(0)
                    : 0
                }

Return ONLY a JSON object with no markdown, no backticks, no preamble. Use exactly this structure:
{
  "score": <overall trader score 0-100>,
  "scoreLabel": "<one word label like Developing/Consistent/Strong/Elite>",
  "patterns": [
    {
      "type": "warning|strength|neutral",
      "title": "<short title>",
      "detail": "<specific insight with numbers from the data>",
      "action": "<one concrete recommended action>"
    }
  ]
}
Provide 4-6 patterns. Be brutally honest but constructive.`,
              },
            ],
          }),
        });

      const data = await response.json();
      console.log("API response:", JSON.stringify(data));
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setInsights(parsed);
    } catch (e) {
      setError("Could not generate insights. Please try again. " + e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    analysePatterns();
  }, []);

  const scoreColor = insights
    ? insights.score >= 70
      ? t.accent
      : insights.score >= 40
      ? "#f59e0b"
      : t.danger
    : t.text3;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            AI Pattern Detector
          </div>
          <div style={{ fontSize: 13, color: t.text3 }}>
            Powered by Claude · Based on {plList.length} trades
          </div>
        </div>
        <button
          onClick={analysePatterns}
          disabled={loading}
          style={{
            background: t.accent,
            border: "none",
            color: "#000",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Space Mono',monospace",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Analysing..." : "↻ Re-analyse"}
        </button>
      </div>

      {loading && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 13,
              color: t.accent,
              marginBottom: 8,
            }}
          >
            Analysing your trading patterns...
          </div>
          <div style={{ fontSize: 12, color: t.text3 }}>
            Claude is reviewing your trade history
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: t.danger + "10",
            border: `1px solid ${t.danger}30`,
            borderRadius: 12,
            padding: 20,
            color: t.danger,
            fontSize: 13,
            fontFamily: "'Space Mono',monospace",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {insights && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: `3px solid ${scoreColor}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 22,
                    fontWeight: 700,
                    color: scoreColor,
                    lineHeight: 1,
                  }}
                >
                  {insights.score}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: t.text3,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  score
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 18,
                    fontWeight: 700,
                    color: scoreColor,
                    marginBottom: 4,
                  }}
                >
                  {insights.scoreLabel}
                </div>
                <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>
                  Overall trader rating based on consistency, discipline and
                  execution
                </div>
              </div>
            </div>
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: t.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                Pattern Summary
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  ["warning", t.danger, "⚠ Warnings"],
                  ["strength", t.accent, "✓ Strengths"],
                  ["neutral", t.text3, "○ Neutral"],
                ].map(([type, color, label]) => (
                  <div key={type} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 22,
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {insights.patterns.filter((p) => p.type === type).length}
                    </div>
                    <div style={{ fontSize: 11, color: t.text3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.patterns.map((p, i) => {
              const color =
                p.type === "warning"
                  ? t.danger
                  : p.type === "strength"
                  ? t.accent
                  : t.text3;
              const icon =
                p.type === "warning" ? "⚠" : p.type === "strength" ? "✓" : "○";
              return (
                <div
                  key={i}
                  style={{
                    background: t.surface,
                    border: `1px solid ${color}25`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 18px",
                      borderBottom: `1px solid ${color}15`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>
                      {icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          color,
                          marginBottom: 5,
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: t.text2,
                          lineHeight: 1.6,
                        }}
                      >
                        {p.detail}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "11px 18px",
                      background: color + "08",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color,
                        fontFamily: "'Space Mono',monospace",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      ACTION
                    </span>
                    <div
                      style={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}
                    >
                      {p.action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export default function TradingJournal() {
  const [trades, setTrades] = useState(() => loadTrades() ?? SEED_TRADES);
  const [isDark, setIsDark] = useState(() => loadTheme() === "dark");
  const [tab, setTab] = useState("today");
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
  type: "all",
  strategy: "all",
  tag: "all",
});
const [search, setSearch] = useState("");
const [perPage, setPerPage] = useState(30);
const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const mobile = useIsMobile();
  const T = tk(isDark);

  useEffect(() => {
    saveTrades(trades);
  }, [trades]);
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  const showToast = (msg, color) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2200);
  };
  const addTrade = (trade) => {
    setTrades((p) => [...p, trade]);
    setShowAdd(false);
    showToast("✓ Trade saved", T.accent);
  };
  const saveTrade = (trade) => {
    setTrades((p) => p.map((tr) => (tr.id === trade.id ? trade : tr)));
    setEditTrade(null);
    setSelected(trade);
    showToast("✓ Trade updated", T.accent);
  };
  const savePlan = (plan) => {
  setTrades((p) => [...p, plan]);
  setShowPlan(false);
  showToast("📋 Trade plan saved", T.accent);
};
  const deleteTrade = (id) => {
    if (window.confirm("Delete this trade?")) {
      setTrades((p) => p.filter((tr) => tr.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Trade deleted", T.danger);
    }
  };
const importTrades = (incoming) => {
  setTrades((p) => [...p, ...incoming]);
  setShowCSV(false);
  setPage(1);
  showToast(`✓ Imported ${incoming.length} trades`, T.accent);
};
  const clearAll = () => {
    if (window.confirm("Clear all trades?")) {
      setTrades([]);
      setSelected(null);
      localStorage.removeItem(STORAGE_KEY);
      showToast("All trades cleared", T.danger);
    }
  };

  const plList = useMemo(
  () => trades.map((t) => ({ ...t, pl: calcPL(t), r: calcR(t) })),
  [trades]
);
  const allTags = useMemo(
    () => [...new Set(plList.flatMap((t) => t.tags || []))],
    [plList]
  );

  const stats = useMemo(() => {
    const wins = plList.filter((t) => t.pl > 0),
      losses = plList.filter((t) => t.pl < 0);
    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const winRate = plList.length ? wins.length / plList.length : 0;
    const avgWin = wins.length
      ? wins.reduce((s, t) => s + t.pl, 0) / wins.length
      : 0;
    const avgLoss = losses.length
      ? losses.reduce((s, t) => s + t.pl, 0) / losses.length
      : 0;
    const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
    const profitFactor = losses.length
      ? Math.abs(
          wins.reduce((s, t) => s + t.pl, 0) /
            losses.reduce((s, t) => s + t.pl, 0)
        )
      : Infinity;
    return {
      totalPL,
      winRate,
      avgWin,
      avgLoss,
      expectancy,
      profitFactor,
      total: plList.length,
      wins: wins.length,
    };
  }, [plList]);

  const stratStats = useMemo(() => {
    const map = {};
    plList.forEach((t) => {
      if (!map[t.strategy]) map[t.strategy] = { pl: 0, wins: 0, total: 0 };
      map[t.strategy].pl += t.pl;
      map[t.strategy].total++;
      if (t.pl > 0) map[t.strategy].wins++;
    });
    return Object.entries(map)
      .map(([s, d]) => ({ strategy: s, ...d, winRate: d.wins / d.total }))
      .sort((a, b) => b.pl - a.pl);
  }, [plList]);

  const mistakeStats = useMemo(() => {
    const map = {};
    plList.forEach((t) => {
      if (t.mistake && t.mistake !== "None") {
        if (!map[t.mistake]) map[t.mistake] = 0;
        map[t.mistake] += t.pl;
      }
    });
    return Object.entries(map)
      .map(([m, cost]) => ({ mistake: m, cost }))
      .sort((a, b) => a.cost - b.cost);
  }, [plList]);
const avgR = useMemo(() => {
  const withR = plList.filter(t => t.r !== null && t.r !== undefined);
  return withR.length ? withR.reduce((s, t) => s + t.r, 0) / withR.length : null;
}, [plList]);
  const filtered = useMemo(() => {
  const q = search.toLowerCase().trim();
  return plList.filter((t) =>
    (filter.type === "all" || t.type === filter.type) &&
    (filter.strategy === "all" || t.strategy === filter.strategy) &&
    (filter.tag === "all" || (t.tags || []).includes(filter.tag)) &&
    (!q || [
      t.ticker,
      t.strategy,
      t.emotion,
      t.mistake,
      t.notes,
      ...(t.tags || []),
    ].some((f) => (f || "").toLowerCase().includes(q)))
  );
}, [plList, filter, search]);

const totalPages = Math.ceil(filtered.length / perPage);
const paginated = filtered
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice((page - 1) * perPage, page * perPage);
  const maxPL = Math.max(...plList.map((t) => Math.abs(t.pl)), 1);
  const nav = [
    ["today", "Today"],
    ["dashboard", "Dashboard"],
    ["weekly", "Weekly"],
    ["calendar", "Calendar"],
    ["trades", "Trades"],
    ["analytics", "Analytics"],
    ["ai", "AI Insights"],
  ];
  const sel = {
    background: T.input,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 8,
    color: T.text2,
    padding: "7px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        transition: "background 0.2s,color 0.2s",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: ${T.bg}; }`}</style>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 16,
            left: mobile ? 16 : "auto",
            zIndex: 300,
            background: toast.color + "20",
            border: `1px solid ${toast.color}50`,
            borderRadius: 10,
            padding: "11px 16px",
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            color: toast.color,
            textAlign: mobile ? "center" : "left",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        style={{
          borderBottom: `1px solid ${T.navBorder}`,
          background: T.navBg,
          padding: `0 ${mobile ? 14 : 24}px`,
          display: "flex",
          alignItems: "center",
          height: 54,
          position: "sticky",
          top: 0,
          zIndex: 50,
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <img
          src="images/logo.png"
          alt="logo"
          style={{ height: 28, width: 28 }}
        />
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            color: T.accent,
            letterSpacing: 2,
          }}
        >
          LOG FOLIO
        </div>
        {mobile ? (
          <>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setMenuOpen((o) => !o)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 7,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ☰
              </button>
              <button
                onClick={() => setIsDark((d) => !d)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "5px",
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={
                    isDark ? "/images/light-mode.svg" : "/images/dark-mode.svg"
                  }
                  alt="theme"
                  style={{ width: 20, height: 20 }}
                />
              </button>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 7,
                  padding: "6px 13px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                + ADD
              </button>
              <button
  onClick={() => setShowPlan(true)}
  style={{
    background: T.surface,
    border: `1px solid ${T.accent}40`,
    color: T.accent,
    borderRadius: 8,
    padding: "7px 16px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "'Space Mono',monospace",
  }}
>
  📋 PLAN
</button>
            </div>
            {menuOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 54,
                  left: 0,
                  right: 0,
                  background: T.navBg,
                  borderBottom: `1px solid ${T.navBorder}`,
                  zIndex: 49,
                  padding: "8px 0",
                }}
              >
                {nav.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setSelected(null);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: tab === id ? T.accent : T.text2,
                      cursor: "pointer",
                      fontSize: 15,
                      padding: "12px 20px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      borderLeft:
                        tab === id
                          ? `3px solid ${T.accent}`
                          : "3px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
                <div
                  style={{
                    padding: "12px 20px",
                    display: "flex",
                    gap: 10,
                    borderTop: `1px solid ${T.border}`,
                    marginTop: 4,
                  }}
                >
                  <button
                    onClick={() => {
                      setShowCSV(true);
                      setMenuOpen(false);
                    }}
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      color: T.text2,
                      borderRadius: 7,
                      padding: "7px 14px",
                      cursor: "pointer",
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    CSV Import
                  </button>
                  <button
                    onClick={() => {
                      clearAll();
                      setMenuOpen(false);
                    }}
                    style={{
                      background: "none",
                      border: `1px solid ${T.border}`,
                      color: T.text3,
                      borderRadius: 7,
                      padding: "7px 14px",
                      cursor: "pointer",
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {nav.map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setSelected(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: tab === id ? T.text : T.text3,
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 10px",
                  borderBottom:
                    tab === id
                      ? `2px solid ${T.accent}`
                      : "2px solid transparent",
                  height: 54,
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            ))}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setIsDark((d) => !d)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "5px",
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <object
                  data={
                    isDark ? "/images/light-mode.svg" : "/images/dark-mode.svg"
                  }
                  type="image/svg+xml"
                  style={{
                    width: 20,
                    height: 20,
                    pointerEvents: "none",
                    filter: isDark
                      ? "brightness(0) invert(1)"
                      : "brightness(0) invert(0.4)",
                  }}
                />
              </button>
              <button
                onClick={() => setShowCSV(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "6px 11px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                CSV
              </button>
              <button
                onClick={clearAll}
                style={{
                  background: "none",
                  border: `1px solid ${T.border}`,
                  color: T.text3,
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                + ADD
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: mobile ? 14 : 28 }}>
        {tab === "ai" && <AIInsights plList={plList} t={T} mobile={mobile} />}
        {tab === "today" && (
          <DaySession
            plList={plList}
            onAddTrade={() => setShowAdd(true)}
            t={T}
            mobile={mobile}
          />
        )}

        {tab === "dashboard" && (
          <div>
            {/* Single column on mobile */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "repeat(4,1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <StatCard
                label="Total P/L"
                value={fmt(stats.totalPL)}
                sub={`${stats.total} trades`}
                color={stats.totalPL >= 0 ? T.accent : T.danger}
                t={T}
              />
              <StatCard
                label="Win Rate"
                value={`${(stats.winRate * 100).toFixed(0)}%`}
                sub={`${stats.wins}W/${stats.total - stats.wins}L`}
                t={T}
              />
              <StatCard
                label="Expectancy"
                value={fmt(stats.expectancy)}
                sub="per trade"
                color={stats.expectancy >= 0 ? T.accent : T.danger}
                t={T}
              />
              <StatCard
                label="Profit Factor"
                value={
                  isFinite(stats.profitFactor)
                    ? stats.profitFactor.toFixed(2)
                    : "∞"
                }
                sub="wins/losses"
                t={T}
              />          
              {avgR !== null && (
  <StatCard
    label="Avg R"
    value={fmtR(avgR)}
    sub="per closed trade"
    color={avgR >= 0 ? T.accent : T.danger}
    t={T}
  />
)}
            </div>
  
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 12,
                  }}
                >
                  Equity Curve
                </div>
                <EquityCurve trades={plList} t={T} />
              </div>
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 12,
                  }}
                >
                  Strategy Snapshot
                </div>
                {stratStats.slice(0, 5).map((s) => (
                  <div key={s.strategy} style={{ marginBottom: 11 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.text2 }}>
                        {s.strategy}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          color: s.pl >= 0 ? T.accent : T.danger,
                        }}
                      >
                        {s.pl >= 0 ? "+" : ""}
                        {fmt(s.pl)}
                      </span>
                    </div>
                    <MiniBar value={s.pl} max={maxPL} t={T} />
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: T.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Recent Trades
              </div>
              {[...plList]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((tr) => (
                  <TradeRow
                    key={tr.id}
                    trade={tr}
                    onClick={() => {
                      setSelected(tr);
                      setTab("trades");
                    }}
                    onEdit={() => setEditTrade(tr)}
                    onDelete={() => deleteTrade(tr.id)}
                    t={T}
                    mobile={mobile}
                  />
                ))}
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <CalendarView plList={plList} t={T} mobile={mobile} />
        )}

{tab === "trades" && (
  <div>
    {selected ? (
      <TradeDetail
        trade={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setEditTrade(selected);
          setSelected(null);
        }}
        t={T}
      />
    ) : (
      <div>
        <div style={{ marginBottom: 12 }}>
          <input
            style={{
              background: T.input,
              border: `1px solid ${T.inputBorder}`,
              borderRadius: 8,
              color: T.text,
              padding: "9px 14px",
              fontSize: 13,
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
              outline: "none",
            }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search ticker, strategy, tags, notes..."
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr auto auto",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <select
            style={sel}
            value={filter.type}
            onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); setPage(1); }}
          >
            <option value="all">All Types</option>
            <option value="stock">Stock</option>
            <option value="options">Options</option>
          </select>
          <select
            style={sel}
            value={filter.strategy}
            onChange={(e) => { setFilter((f) => ({ ...f, strategy: e.target.value })); setPage(1); }}
          >
            <option value="all">All Strategies</option>
            {[...new Set(trades.map((t) => t.strategy))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            style={sel}
            value={filter.tag}
            onChange={(e) => { setFilter((f) => ({ ...f, tag: e.target.value })); setPage(1); }}
          >
            <option value="all">All Tags</option>
            {allTags.map((tg) => (
              <option key={tg}>{tg}</option>
            ))}
          </select>
          <select
            style={{ ...sel, width: mobile ? "100%" : "auto" }}
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          {!mobile && (
            <div
              style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                color: T.text3,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              {filtered.length} trades
            </div>
          )}
        </div>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
          }}
        >
          {paginated.map((tr) => (
            <TradeRow
              key={tr.id}
              trade={tr}
              onClick={() => setSelected(tr)}
              onEdit={() => setEditTrade(tr)}
              onDelete={() => deleteTrade(tr.id)}
              t={T}
              mobile={mobile}
            />
          ))}
          {!paginated.length && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.text4,
                fontFamily: "'Space Mono',monospace",
                fontSize: 12,
              }}
            >
              No trades found
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.text2,
                borderRadius: 7,
                padding: "6px 12px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.4 : 1,
                fontSize: 13,
              }}
            >
              ‹ Prev
            </button>
            <span style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: T.text3,
            }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.text2,
                borderRadius: 7,
                padding: "6px 12px",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                opacity: page === totalPages ? 0.4 : 1,
                fontSize: 13,
              }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}

        {tab === "weekly" && (
          <WeeklyReview plList={plList} t={T} mobile={mobile} />
        )}

        {tab === "analytics" && (
          <div>
            {/* Single column on mobile */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "repeat(5,1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <StatCard
                label="Avg Win"
                value={fmt(stats.avgWin)}
                color={T.accent}
                t={T}
              />
              <StatCard
                label="Avg Loss"
                value={fmt(stats.avgLoss)}
                color={T.danger}
                t={T}
              />
              <StatCard
                label="Best Trade"
                value={fmt(Math.max(...plList.map((t) => t.pl)))}
                t={T}
              />
              <StatCard
                label="Worst Trade"
                value={fmt(Math.min(...plList.map((t) => t.pl)))}
                color={T.danger}
                t={T}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  Strategy Performance
                </div>
                {stratStats.map((s) => (
                  <div key={s.strategy} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.text2 }}>
                        {s.strategy}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: T.text3,
                            fontFamily: "monospace",
                          }}
                        >
                          {(s.winRate * 100).toFixed(0)}%WR
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 12,
                            color: s.pl >= 0 ? T.accent : T.danger,
                          }}
                        >
                          {s.pl >= 0 ? "+" : ""}
                          {fmt(s.pl)}
                        </span>
                      </div>
                    </div>
                    <MiniBar value={s.pl} max={maxPL} t={T} />
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  Tag Performance
                </div>
                {allTags.length === 0 ? (
                  <div style={{ color: T.text4, fontSize: 13 }}>
                    No tags added yet
                  </div>
                ) : (
                  allTags.map((tag) => {
                    const tagged = plList.filter((tr) =>
                      (tr.tags || []).includes(tag)
                    );
                    const tagPL = tagged.reduce((s, tr) => s + tr.pl, 0);
                    const tagWR = tagged.length
                      ? tagged.filter((tr) => tr.pl > 0).length / tagged.length
                      : 0;
                    return (
                      <div key={tag} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ fontSize: 13, color: T.text2 }}>
                            {tag}{" "}
                            <span style={{ fontSize: 10, color: T.text3 }}>
                              ({tagged.length})
                            </span>
                          </span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span
                              style={{
                                fontSize: 10,
                                color: T.text3,
                                fontFamily: "monospace",
                              }}
                            >
                              {(tagWR * 100).toFixed(0)}%WR
                            </span>
                            <span
                              style={{
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                color: tagPL >= 0 ? T.accent : T.danger,
                              }}
                            >
                              {tagPL >= 0 ? "+" : ""}
                              {fmt(tagPL)}
                            </span>
                          </div>
                        </div>
                        <MiniBar value={tagPL} max={maxPL} t={T} />
                      </div>
                    );
                  })
                )}
                <div
                  style={{
                    marginTop: 18,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 10,
                    color: T.text3,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 10,
                  }}
                >
                  Emotion Impact
                </div>
                {Object.entries(
                  plList.reduce((acc, tr) => {
                    if (!acc[tr.emotion]) acc[tr.emotion] = 0;
                    acc[tr.emotion] += tr.pl;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([em, val]) => (
                    <div
                      key={em}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.text2 }}>{em}</span>
                      <span
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          color: val >= 0 ? T.accent : T.danger,
                        }}
                      >
                        {val >= 0 ? "+" : ""}
                        {fmt(val)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "mistakes" && (
          <div>
            <div
              style={{
                background: T.danger + "08",
                border: `1px solid ${T.danger}20`,
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: T.danger,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 5,
                }}
              >
                Total Cost of Mistakes
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  color: T.danger,
                }}
              >
                {fmt(mistakeStats.reduce((s, m) => s + m.cost, 0))}
              </div>
            </div>
            {mistakeStats.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: T.text4,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 12,
                }}
              >
                No mistakes logged — nice discipline.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {mistakeStats.map((m) => (
                  <div
                    key={m.mistake}
                    style={{
                      background: T.danger + "06",
                      border: `1px solid ${T.danger}15`,
                      borderRadius: 10,
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 14, color: T.text, marginBottom: 3 }}
                      >
                        {m.mistake}
                      </div>
                      <div style={{ fontSize: 12, color: T.text3 }}>
                        {plList.filter((tr) => tr.mistake === m.mistake).length}{" "}
                        occurrence(s)
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.danger,
                      }}
                    >
                      {fmt(m.cost)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: T.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Flagged Trades
              </div>
              {plList
                .filter((tr) => tr.mistake && tr.mistake !== "None")
                .map((tr) => (
                  <div
                    key={tr.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {mobile ? (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 14,
                              fontWeight: 700,
                              color: T.text,
                            }}
                          >
                            {tr.ticker}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 13,
                              fontWeight: 700,
                              color: tr.pl >= 0 ? T.accent : T.danger,
                            }}
                          >
                            {tr.pl >= 0 ? "+" : ""}
                            {fmt(tr.pl)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.danger,
                            background: T.danger + "12",
                            borderRadius: 5,
                            padding: "2px 7px",
                          }}
                        >
                          {tr.mistake}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "85px 65px 1fr 100px 85px",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: T.text3,
                          }}
                        >
                          {fmtDate(tr.date)}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {tr.ticker}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: T.danger,
                            background: T.danger + "12",
                            borderRadius: 5,
                            padding: "2px 7px",
                            display: "inline-block",
                          }}
                        >
                          {tr.mistake}
                        </span>
                        <span style={{ fontSize: 12, color: T.text3 }}>
                          {tr.strategy}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            color: tr.pl >= 0 ? T.accent : T.danger,
                            textAlign: "right",
                          }}
                        >
                          {tr.pl >= 0 ? "+" : ""}
                          {fmt(tr.pl)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <TradeFormModal
          onClose={() => setShowAdd(false)}
          onSave={addTrade}
          t={T}
        />
      )}
      {editTrade && (
        <TradeFormModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={saveTrade}
          t={T}
        />
      )}
      {showCSV && (
        <CSVModal
          onClose={() => setShowCSV(false)}
          onImport={importTrades}
          t={T}
        />
      )}
      {showPlan && (
  <PlanModal
    onClose={() => setShowPlan(false)}
    onSave={savePlan}
    t={T}
  />
)}
    </div>
  );
}
