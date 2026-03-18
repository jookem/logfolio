import { useState, useMemo, useEffect, useRef } from "react"
import { supabase } from "./lib/supabase"
import { useAuth } from "./contexts/AuthContext"
import AuthScreen from "./components/AuthScreen"

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

const STOCK_LIKE = ["stock", "forex", "crypto"];

function calcPL(trade) {
  if (STOCK_LIKE.includes(trade.type)) {
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
  if (STOCK_LIKE.includes(trade.type)) {
    const pl = (trade.exitPrice - trade.entryPrice) * (trade.direction === "long" ? 1 : -1);
    return pl / risk;
  }
  return null;
}

function typeLabels(type) {
  if (type === "forex")  return { ticker: "Pair",   units: "Units",  section: "Forex Details" };
  if (type === "crypto") return { ticker: "Symbol", units: "Amount", section: "Crypto Details" };
  return { ticker: "Ticker Symbol", units: "Shares", section: "Stock Details" };
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
  "Calendar Spread",
];
const EMOTIONS = [
  "None",
  "Calm",
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

function EquityCurve({ trades, t, spyData, spyError }) {
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  // Start from 0, then add each trade
  const points = [{ val: 0, date: null }, ...sorted.map((tr) => {
    running += calcPL(tr);
    return { val: running, date: tr.date };
  })];
  if (points.length < 3)
    return (
      <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", color: t.text3, fontSize: 12, fontFamily: "monospace" }}>
        Add more trades to see curve
      </div>
    );
  const min = Math.min(...points.map((p) => p.val)),
    max = Math.max(...points.map((p) => p.val));
  const range = max - min || 1, W = 500, H = 90;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.val - min) / range) * H);
  const path = points.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]},${ys[i]}`).join(" ");
  let spyPath = null;
  if (spyData?.length >= 2 && sorted.length >= 2) {
    const base = spyData[0].close;
    // SPY Y positions aligned to the same scale as equity (0 return = 0 PL)
    const spyYs = points.map((pt) => {
      if (!pt.date) return H - ((0 - min) / range) * H; // starting point = 0 return
      const match = spyData.filter(s => s.date <= pt.date);
      if (!match.length) return null;
      const close = match[match.length - 1].close;
      const spyPL = ((close - base) / base) * (max - min || 1);
      const clamped = Math.min(Math.max(spyPL, min - range * 0.1), max + range * 0.1);
      return H - ((clamped - min) / range) * H;
    });
    const segs = spyYs.map((y, i) => y != null ? `${i === 0 ? "M" : "L"} ${xs[i]},${y}` : null).filter(Boolean);
    if (segs.length >= 2) spyPath = segs.join(" ");
  }
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${xs[xs.length - 1]},${H} L 0,${H} Z`} fill="url(#eg)" />
        <path d={path} fill="none" stroke={t.accent} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => i > 0 && (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill={t.accent} opacity="0.6" />
        ))}
        {spyPath && (
          <path d={spyPath} fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" opacity="0.7" />
        )}
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginTop: 4, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 2, background: t.accent, borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace" }}>Your P/L</span>
        </div>
        {spyPath ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: "#3B82F6", borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace" }}>SPY</span>
          </div>
        ) : (
          <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", opacity: 0.5 }}>
            {spyError ? "SPY data unavailable" : "Loading SPY..."}
          </span>
        )}
      </div>
    </div>
  );
}
// REPLACE the entire function with this:
function ScreenshotUpload({ value = [], onChange, t }) {
const fileInputRef = useRef(null);
const [lightbox, setLightbox] = useState(null);

const handleFiles = (files) => {
const newImages = [];
let processed = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push({ id: Date.now() + Math.random(), src: e.target.result, name: file.name });
        processed++;
        if (processed === Array.from(files).filter(f => f.type.startsWith("image/")).length) {
          onChange([...value, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id) => onChange(value.filter((img) => img.id !== id));

  return (
    <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
        Chart Screenshots
      </div>

      {/* Upload button */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `1px dashed ${t.accent}40`, borderRadius: 8,
          padding: "14px", textAlign: "center", cursor: "pointer",
          background: t.accent + "08", marginBottom: value.length > 0 ? 10 : 0,
        }}
      >
        <div style={{ fontSize: 20, marginBottom: 4, color: t.accent }}>
         <svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
>
    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
   <path d="M2 13.3636C2 10.2994 2 8.76721 2.74902 7.6666C3.07328 7.19014 3.48995 6.78104 3.97524 6.46268C4.69555 5.99013 5.59733 5.82123 6.978 5.76086C7.63685 5.76086 8.20412 5.27068 8.33333 4.63636C8.52715 3.68489 9.37805 3 10.3663 3H13.6337C14.6219 3 15.4728 3.68489 15.6667 4.63636C15.7959 5.27068 16.3631 5.76086 17.022 5.76086C18.4027 5.82123 19.3044 5.99013 20.0248 6.46268C20.51 6.78104 20.9267 7.19014 21.251 7.6666C22 8.76721 22 10.2994 22 13.3636C22 16.4279 22 17.9601 21.251 19.0607C20.9267 19.5371 20.51 19.9462 20.0248 20.2646C18.9038 21 17.3433 21 14.2222 21H9.77778C6.65675 21 5.09624 21 3.97524 20.2646C3.48995 19.9462 3.07328 19.5371 2.74902 19.0607C2.53746 18.7498 2.38566 18.4045 2.27673 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
<path d="M19 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg></div>
        <div style={{ fontSize: 13, color: t.accent, fontFamily: "'Space Mono', monospace" }}>
          Click or drag & drop charts
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>PNG, JPG, WebP supported</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {value.map((img) => (
            <div key={img.id} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "16/9", background: t.border }}>
              <img
                src={img.src}
                alt={img.name}
                onClick={() => setLightbox(img.src)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                style={{
                  position: "absolute", top: 3, right: 3,
                  background: "rgba(0,0,0,0.7)", border: "none",
                  color: "#fff", borderRadius: "50%", width: 18, height: 18,
                  cursor: "pointer", fontSize: 11, display: "flex",
                  alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
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
          ><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
<path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg></button>
        </div>
      )}
    </div>
  );
}
function VoiceNote({ value, onChange, t }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(value || null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const clearRecording = () => {
    setAudioUrl(null);
    onChange(null);
  };

  return (
    <div style={{
      background: t.card2, border: `1px solid ${t.border}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{
        fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10,
      }}>Voice Note</div>

      {!audioUrl ? (
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{
            width: "100%",
            background: recording ? t.danger + "20" : t.accent + "15",
            border: `1px solid ${recording ? t.danger : t.accent}40`,
            color: recording ? t.danger : t.accent,
            borderRadius: 8, padding: "10px 14px", cursor: "pointer",
            fontSize: 13, fontFamily: "'Space Mono', monospace",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {recording ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: t.danger, display: "inline-block",
                animation: "pulse 1s infinite",
              }} />
              Stop Recording
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11C17 13.7614 14.7614 16 12 16C9.23858 16 7 13.7614 7 11V8Z" stroke="currentColor" strokeWidth="2"/>
  <path d="M13 8L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 11L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M4 11C4 15.4183 7.58172 19 12 19C16.4183 19 20 15.4183 20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg> Record Voice Note</>
          )}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36 }} />
          <button
            onClick={clearRecording}
            style={{
              background: "none", border: `1px solid ${t.danger}40`,
              color: t.danger, borderRadius: 7, padding: "6px 12px",
              cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace",
            }}
          >
            × Delete Recording
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );
}
// ── Black-Scholes helpers ──
function normCDF(x) {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t2 = 1 / (1 + p * ax);
  const poly = ((((a[4]*t2 + a[3])*t2 + a[2])*t2 + a[1])*t2 + a[0]) * t2;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-ax * ax)));
}
function bsPrice(S, K, T, sigma, type) {
  if (T <= 0) return type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
  const r = 0.045;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return type === "call"
    ? S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2)
    : K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}

function PlanModal({ onClose, onSave, t, isDark, initial }) {
  const OPTION_STRATEGIES = {
    "Long Call":        { stockLabel: "Underlying Stock (optional)", showStock: true, legs: [{ position: "buy", type: "call" }], writeLocked: true },
    "Long Put":         { stockLabel: "Underlying Stock (optional)", showStock: true, legs: [{ position: "buy", type: "put" }], writeLocked: true },
    "Covered Call":     { stockLabel: "Stock Purchase", showStock: true, stockRequired: true, legs: [{ position: "sell", type: "call" }], writeLocked: true },
    "Cash Secured Put": { stockLabel: "Cash Secured (Collateral)", showStock: true, legs: [{ position: "sell", type: "put" }], writeLocked: true },
    "Naked Call":       { stockLabel: "Underlying Stock (optional)", showStock: true, legs: [{ position: "sell", type: "call" }], writeLocked: true },
    "Naked Put":        { stockLabel: "Underlying Stock (optional)", showStock: true, legs: [{ position: "sell", type: "put" }], writeLocked: true },
  };

  const OPTION_STRATEGY_NAMES = Object.keys(OPTION_STRATEGIES);
  const STOCK_STRATEGIES = ["Breakout", "Pullback", "Reversal", "Scalp"];

  const blankLeg = (pos = "buy", type = "call") => ({
    position: pos, type, strike: "", expiration: "", entryPremium: "", contracts: 1, iv: "",
  });
  const [tickerLoading, setTickerLoading] = useState(false);
const [chainLoading, setChainLoading] = useState(false);
const [expiryDates, setExpiryDates] = useState([]);
const [strikes, setStrikes] = useState([]);
const YF = "https://corsproxy.io/?https://query2.finance.yahoo.com";
const YF1 = "https://corsproxy.io/?https://query1.finance.yahoo.com";

const fetchStockPrice = async (ticker) => {
  if (!ticker || ticker.length < 1) return;
  setTickerLoading(true);
  try {
    const res = await fetch(`${YF1}/v8/finance/chart/${ticker}?interval=1d&range=1d`);
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) {
      set("currentPrice", price.toFixed(2));
      set("purchasePrice", price.toFixed(2));
    }
  } catch {}
  setTickerLoading(false);
};

const fetchExpiryDates = async (ticker) => {
  if (!ticker) return;
  setChainLoading(true);
  setExpiryDates([]);
  setStrikes([]);
  try {
    const res = await fetch(`${YF}/v7/finance/options/${ticker}`);
    const data = await res.json();
    const timestamps = data?.optionChain?.result?.[0]?.expirationDates;
    if (timestamps?.length) {
      setExpiryDates(timestamps.map(ts => new Date(ts * 1000).toISOString().slice(0, 10)));
    }
  } catch {}
  setChainLoading(false);
};

const fetchStrikes = async (ticker, expiry, optionType) => {
  if (!ticker || !expiry) return;
  try {
    const ts = Math.floor(new Date(expiry).getTime() / 1000);
    const res = await fetch(`${YF}/v7/finance/options/${ticker}?date=${ts}`);
    const data = await res.json();
    const opts = data?.optionChain?.result?.[0]?.options?.[0];
    const contracts = optionType === "call" ? opts?.calls : opts?.puts;
    if (contracts?.length) {
      setStrikes(contracts.map(c => ({ strike: c.strike, ticker: c.contractSymbol })));
    }
  } catch {}
};

const fetchPremium = async (contractSymbol, legIndex, underlyingTicker) => {
  if (!contractSymbol) return;
  const underlying = underlyingTicker || form.ticker;
  try {
    // Parse OCC symbol (e.g. AAPL250117C00150000) to extract expiry date
    const match = contractSymbol.match(/^[A-Z]+(\d{2})(\d{2})(\d{2})[CP]/);
    if (!match) return;
    const expiry = `20${match[1]}-${match[2]}-${match[3]}`;
    const ts = Math.floor(new Date(expiry).getTime() / 1000);
    const res = await fetch(`${YF}/v7/finance/options/${underlying}?date=${ts}`);
    const data = await res.json();
    const opts = data?.optionChain?.result?.[0]?.options?.[0];
    const all = [...(opts?.calls || []), ...(opts?.puts || [])];
    const contract = all.find(c => c.contractSymbol === contractSymbol);
    if (!contract) return;
    const premium = contract.bid && contract.ask
      ? (contract.bid + contract.ask) / 2
      : contract.lastPrice || null;
    if (premium) setLeg(legIndex, "entryPremium", premium.toFixed(2));
    if (contract.impliedVolatility) setLeg(legIndex, "iv", (contract.impliedVolatility * 100).toFixed(1));
  } catch {}
};
const [form, setForm] = useState(initial ? {
    date: initial.date || todayStr(),
    ticker: initial.ticker || "",
    type: initial.type || "stock",
    strategy: initial.strategy || "Breakout",
    direction: initial.direction || "long",
    stockDirection: initial.direction === "short" ? "sell" : "buy",
    currentPrice: initial.entryPrice || "",
    purchasePrice: initial.entryPrice || "",
    numShares: initial.shares || "",
    legs: initial.legs?.length ? initial.legs : [blankLeg()],
    stopLoss: initial.stopLoss || "",
    takeProfit: initial.takeProfit || "",
    notes: initial.notes || "",
    tags: initial.tags || [],
    emotion: initial.emotion || "None",
  } : {
    date: todayStr(),
    ticker: "",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    stockDirection: "buy",
    currentPrice: "",
    purchasePrice: "",
    numShares: "",
    legs: [blankLeg()],
    stopLoss: "",
    takeProfit: "",
    notes: "",
    tags: [],
    emotion: "None",
  });

const DEFAULT_CHECKLIST = [
    "Checked trend direction",
    "Checked support/resistance",
    "Set stop loss",
    "Checked news/earnings",
    "Sized position correctly",
    "Checked risk/reward ratio",
    "Confirmed entry signal",
    "Checked market conditions",
  ];

const [checklist, setChecklist] = useState(
    initial?.checklist?.length
      ? initial.checklist
      : DEFAULT_CHECKLIST.map((item) => ({ label: item, checked: false, custom: false }))
  );
const [newCheckItem, setNewCheckItem] = useState("");

const toggleCheck = (i) =>
    setChecklist((c) => c.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item));

const addCheckItem = () => {
    const val = newCheckItem.trim();
    if (!val) return;
    setChecklist((c) => [...c, { label: val, checked: false, custom: true }]);
    setNewCheckItem("");
  };

const removeCheckItem = (i) =>
    setChecklist((c) => c.filter((_, idx) => idx !== i));

const allChecked = checklist.every((item) => item.checked);
const checkedCount = checklist.filter((item) => item.checked).length;
const [tagInput, setTagInput] = useState("");
const [customEmotions, setCustomEmotions] = useState([]);
const [emotionInput, setEmotionInput] = useState("");
const [showSizeCalc, setShowSizeCalc] = useState(false);
const [calcAccountSize, setCalcAccountSize] = useState("");
const [calcRiskPct, setCalcRiskPct] = useState("1");
const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

const setLeg = (i, k, v) =>
    setForm((f) => {
      const legs = [...f.legs];
      legs[i] = { ...legs[i], [k]: v };
      return { ...f, legs };
    });

  // When strategy changes, sync legs to template
  const handleStrategyChange = (strat) => {
    set("strategy", strat);
    if (OPTION_STRATEGIES[strat]) {
      const template = OPTION_STRATEGIES[strat].legs;
      setForm((f) => ({
        ...f,
        strategy: strat,
        legs: template.map((tpl) => ({ ...blankLeg(tpl.position, tpl.type) })),
      }));
    }
  };

  const handleTypeChange = (type) => {
    set("type", type);
    if (type === "options") {
      handleStrategyChange("Long Call");
    } else {
      set("strategy", "Breakout");
    }
  };

  const addLeg = () =>
    setForm((f) => ({ ...f, legs: [...f.legs, blankLeg()] }));

  const removeLeg = (i) =>
    setForm((f) => ({ ...f, legs: f.legs.filter((_, idx) => idx !== i) }));

  const addTag = (tag) => {
    const c = tag.trim();
    if (c && !(form.tags || []).includes(c)) set("tags", [...(form.tags || []), c]);
    setTagInput("");
  };
  const removeTag = (tag) => set("tags", (form.tags || []).filter((tg) => tg !== tag));

  const optConfig = form.type === "options" ? OPTION_STRATEGIES[form.strategy] : null;
  const isMultiLeg = form.type === "options" && !optConfig?.writeLocked;

  // R calculation (stock only)
  const plannedR =
    STOCK_LIKE.includes(form.type) && form.purchasePrice && form.stopLoss && form.takeProfit
      ? ((+form.takeProfit - +form.purchasePrice) * (form.stockDirection === "buy" ? 1 : -1)) /
        Math.abs(+form.purchasePrice - +form.stopLoss)
      : null;

  const save = () => {
    if (!form.ticker) return;
const base = {
      ...form,
      ticker: form.ticker.toUpperCase(),
      id: initial?.id ?? Date.now(),
      status: "planned",
      tags: form.tags || [],
      checklist: checklist,
      checklistComplete: allChecked,
    };
    if (STOCK_LIKE.includes(form.type)) {
      base.entryPrice = +form.purchasePrice;
      base.stopLoss = form.stopLoss ? +form.stopLoss : null;
      base.takeProfit = form.takeProfit ? +form.takeProfit : null;
      base.shares = +form.numShares;
      base.direction = form.stockDirection === "buy" ? "long" : "short";
      base.plannedR = plannedR;
      base.legs = [];
    } else {
      base.direction = "long";
      base.legs = form.legs.map((l) => ({
        ...l,
        strike: +l.strike,
        entryPremium: +l.entryPremium,
        exitPremium: "",
        contracts: +l.contracts,
      }));
      base.entryPrice = +form.currentPrice || 0;
      base.shares = +form.numShares || 0;
    }
    onSave(base);
  };

  const canSave = form.ticker && (
    STOCK_LIKE.includes(form.type)
      ? form.purchasePrice
      : form.legs.every((l) => l.strike && l.entryPremium && l.expiration)
  );

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
  const sectionHeader = (title) => (
    <div style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      color: t.accent,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 10,
      marginTop: 18,
      paddingBottom: 6,
      borderBottom: `1px solid ${t.border}`,
    }}>{title}</div>
  );

  return (
    <div className="backdrop-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, minHeight: "100vh" }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "93vh", overflowY: "auto", padding: 24 }}>

       {/* Header */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
  <div style={{
    fontFamily: "'Space Mono', monospace",
    fontSize: 16,
    fontWeight: 700,
    color: t.accent,
    display: "flex",
    alignItems: "center",
    gap: 6,
  }}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block" }}>
      <path d="M6 15.8L7.14286 17L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 8.8L7.14286 10L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 9L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M13 16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    {initial ? "Edit Plan" : "Plan A Trade"}
  </div>
  <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </button>
</div>

        {/* ── Ticker / Date / Type / Strategy ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
<div>
  <label style={lbl}>{typeLabels(form.type).ticker}</label>
  <div style={{ position: "relative" }}>
    <input
      style={{ ...inp, paddingRight: tickerLoading ? 36 : 14 }}
      value={form.ticker}
      onChange={(e) => {
        const val = e.target.value.toUpperCase();
        set("ticker", val);
      }}
      onBlur={(e) => {
        const val = e.target.value.toUpperCase();
        if (val.length >= 1) {
          fetchStockPrice(val);
          if (form.type === "options") fetchExpiryDates(val);
        }
      }}
      placeholder="AAPL"
    />
    {tickerLoading && (
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: t.text3 }}>...</span>
    )}
  </div>
</div>
          <div>
            <label style={lbl}>Date</label>
            <input style={inp} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select style={inp} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="stock">Stock</option>
              <option value="options">Options</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Strategy</label>
            <select style={inp} value={form.strategy} onChange={(e) => handleStrategyChange(e.target.value)}>
              {(form.type === "options" ? OPTION_STRATEGY_NAMES : STOCK_STRATEGIES).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ══ STOCK SECTION ══ */}
        {sectionHeader(form.type === "options" ? (optConfig?.stockLabel || "Underlying Stock") : typeLabels(form.type).section)}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Current price — always shown */}
          <div>
            <label style={lbl}>Current Price</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
              <input style={{ ...inp, paddingLeft: 26 }} type="number" value={form.currentPrice}
                onChange={(e) => set("currentPrice", e.target.value)} placeholder="190.00" />
            </div>
          </div>

          {/* Buy / Short toggle — for stock type or covered call */}
          {(STOCK_LIKE.includes(form.type) || optConfig?.stockRequired) && (
            <div>
              <label style={lbl}>Buy or Short</label>
              <select style={inp} value={form.stockDirection} onChange={(e) => set("stockDirection", e.target.value)}>
                <option value="buy">Buy</option>
                <option value="short">Short</option>
              </select>
            </div>
          )}

          {/* Purchase Price */}
          <div>
            <label style={lbl}>{form.type === "options" ? "Purchase Price" : "Entry Price"}</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
              <input style={{ ...inp, paddingLeft: 26 }} type="number" value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)} placeholder="190.00" />
            </div>
          </div>

          {/* Num Shares */}
          <div>
            <label style={lbl}>Num. {typeLabels(form.type).units}</label>
            <input style={inp} type="number" value={form.numShares}
              onChange={(e) => set("numShares", e.target.value)} placeholder="100" />
          </div>

          {/* Cost display (read-only) */}
          {form.purchasePrice && form.numShares && (
            <div style={{ gridColumn: "span 2" }}>
              <div style={{
                background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8,
                padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>Cost</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, color: t.text }}>
                  ${(+form.purchasePrice * +form.numShares).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ══ OPTION SECTION ══ */}
        {form.type === "options" && (
          <>
            {sectionHeader("Option")}

            {/* Header row for multi-leg */}
            {form.legs.length > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace" }}>LEGS</span>
                <button onClick={addLeg} style={{
                  background: t.accent + "20", border: `1px solid ${t.accent}40`,
                  color: t.accent, borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer",
                }}>+ Add Leg</button>
              </div>
            )}

 {form.legs.map((leg, i) => (
  <div key={i} style={{
    background: t.card2, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: 14, marginBottom: 10,
  }}>
    {form.legs.length > 1 && (
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: t.accent, fontFamily: "'Space Mono', monospace" }}>Leg {i + 1}</span>
        <button onClick={() => removeLeg(i)} style={{ background: "none", border: "none", color: t.danger, cursor: "pointer", fontSize: 12 }}>Remove</button>
      </div>
    )}

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {/* Buy / Write */}
      <div>
        <label style={lbl}>Buy or Write</label>
        <select style={inp} value={leg.position}
          onChange={(e) => {
            setLeg(i, "position", e.target.value);
            if (form.ticker && leg.expiration) fetchStrikes(form.ticker, leg.expiration, leg.type);
          }}>
          <option value="buy">Buy</option>
          <option value="sell">Write</option>
        </select>
      </div>

      {/* Call / Put */}
      <div>
        <label style={lbl}>Call or Put</label>
        <select style={inp} value={leg.type}
          onChange={(e) => {
            setLeg(i, "type", e.target.value);
            if (form.ticker && leg.expiration) fetchStrikes(form.ticker, leg.expiration, e.target.value);
          }}>
          <option value="call">Call</option>
          <option value="put">Put</option>
        </select>
      </div>

{/* Expiry — calendar input */}
      <div>
        <label style={lbl}>Expiry</label>
        <input
          style={{
            ...inp,
            borderColor: leg.expiration && expiryDates.length > 0 && !expiryDates.includes(leg.expiration)
              ? t.danger + "80"
              : t.inputBorder,
          }}
          type="date"
          value={leg.expiration}
          min={todayStr()}
          onChange={(e) => {
            setLeg(i, "expiration", e.target.value);
            if (form.ticker) fetchStrikes(form.ticker, e.target.value, leg.type);
          }}
        />
        {leg.expiration && expiryDates.length > 0 && !expiryDates.includes(leg.expiration) && (
          <div style={{ fontSize: 10, color: t.danger, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
            No contracts found for this date
          </div>
        )}
      </div>
      
      {/* Strike — dropdown from chain */}
      <div>
        <label style={lbl}>Strike Price</label>
        {strikes.length > 0 ? (
          <select style={inp} value={leg.strike}
            onChange={(e) => {
              const selected = strikes.find(s => String(s.strike) === e.target.value);
              setLeg(i, "strike", e.target.value);
              if (selected?.ticker) fetchPremium(selected.ticker, i);
            }}>
            <option value="">Select strike</option>
            {strikes.map(s => (
              <option key={s.strike} value={s.strike}>${s.strike}</option>
            ))}
          </select>
        ) : (
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
            <input style={{ ...inp, paddingLeft: 26 }} type="number"
              value={leg.strike} onChange={(e) => setLeg(i, "strike", e.target.value)} placeholder="200" />
          </div>
        )}
      </div>

      {/* Price per option — auto-filled */}
      <div>
        <label style={lbl}>Price per Option</label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
          <input style={{ ...inp, paddingLeft: 26 }} type="number"
            value={leg.entryPremium} onChange={(e) => setLeg(i, "entryPremium", e.target.value)} placeholder="4.20" />
        </div>
      </div>

      {/* Contracts */}
      <div>
        <label style={lbl}>Contracts</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input style={{ ...inp, flex: 1 }} type="number"
            value={leg.contracts} onChange={(e) => setLeg(i, "contracts", e.target.value)} placeholder="1" />
          <span style={{ fontSize: 12, color: t.text3, whiteSpace: "nowrap" }}>× 100</span>
        </div>
      </div>

      {/* IV */}
      <div>
        <label style={lbl}>IV (Implied Vol.) %</label>
        <input style={inp} type="number"
          value={leg.iv} onChange={(e) => setLeg(i, "iv", e.target.value)} placeholder="30" />
      </div>

      {/* Total cost */}
      {leg.entryPremium && leg.contracts && (
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{
            background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8,
            padding: "10px 14px", width: "100%", display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase" }}>Total Cost</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: t.text }}>
              ${(+leg.entryPremium * +leg.contracts * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
))}
            {/* Multi-leg add button for unlocked strategies */}
            {!optConfig?.writeLocked && (
              <button onClick={addLeg} style={{
                width: "100%", background: t.accent + "15", border: `1px dashed ${t.accent}40`,
                color: t.accent, borderRadius: 8, padding: "10px", cursor: "pointer",
                fontSize: 13, fontFamily: "'Space Mono', monospace", marginBottom: 4,
              }}>+ Add Leg</button>
            )}
          </>
        )}

        {/* ══ OPTIONS P&L BY DATE ══ */}
        {form.type === "options" && (() => {
          const leg = form.legs[0];
          if (!leg?.strike || !leg?.expiration || !leg?.entryPremium || !form.currentPrice) return null;
          const S = +form.currentPrice;
          const K = +leg.strike;
          const sigma = Math.max(0.01, (+leg.iv || 30) / 100);
          const entry = +leg.entryPremium;
          const contracts = +leg.contracts || 1;
          const isWrite = leg.position === "sell";
          const today = new Date(); today.setHours(0,0,0,0);
          const expDate = new Date(leg.expiration + "T00:00:00");
          const daysToExp = Math.max(0, Math.round((expDate - today) / 86400000));
          if (daysToExp === 0) return null;

          // Generate date steps (daily if ≤14 days, else weekly)
          const step = daysToExp > 14 ? 7 : 1;
          const days = [];
          for (let d = 0; d < daysToExp; d += step) days.push(d);
          days.push(daysToExp);
          const maxShow = 10;
          const shown = days.length > maxShow
            ? [...days.slice(0, maxShow - 1), daysToExp]
            : days;

          const cells = shown.map(d => {
            const T = Math.max(0, daysToExp - d) / 365;
            const price = bsPrice(S, K, T, sigma, leg.type);
            const pct = entry > 0 ? (price / entry) * 100 : 0;
            const dt = new Date(today); dt.setDate(dt.getDate() + d);
            const label = d === 0 ? "Now"
              : d === daysToExp ? "Exp"
              : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return { label, pct, price };
          });

          const getCell = (pct) => {
            if (pct >= 120) return { bg: "#16a34a", color: "#fff" };
            if (pct >= 105) return { bg: "#22c55e", color: "#fff" };
            if (pct >= 95)  return { bg: "#86efac", color: "#000" };
            if (pct >= 80)  return { bg: "#bbf7d0", color: "#000" };
            if (pct >= 60)  return { bg: "#fef08a", color: "#000" };
            if (pct >= 40)  return { bg: "#fca5a5", color: "#000" };
            return { bg: "#ef4444", color: "#fff" };
          };

          return (
            <div style={{ marginBottom: 4 }}>
              {sectionHeader("P&L by Date")}
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>
                % of entry premium · IV {(sigma*100).toFixed(0)}% · {isWrite ? "Written" : "Bought"} {leg.type}
              </div>
              <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${t.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: t.card2 }}>
                      <td style={{ padding: "6px 10px", color: t.text3, fontSize: 10, whiteSpace: "nowrap" }}>
                        {form.ticker || "—"} @ ${S}
                      </td>
                      {cells.map((c, i) => (
                        <td key={i} style={{ padding: "6px 8px", color: c.label === "Exp" ? t.danger : t.text3, textAlign: "center", fontWeight: c.label === "Exp" ? 700 : 400, whiteSpace: "nowrap" }}>
                          {c.label}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 10px", color: t.text2, fontSize: 10 }}>
                        K ${K} {leg.type}
                      </td>
                      {cells.map((c, i) => {
                        const style = getCell(c.pct);
                        return (
                          <td key={i} style={{
                            padding: "7px 8px", textAlign: "center",
                            background: style.bg, color: style.color,
                            fontWeight: 600, whiteSpace: "nowrap",
                          }}>
                            {c.pct.toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", marginTop: 6, lineHeight: 1.6 }}>
                100% = break even · &gt;100% = profit · &lt;100% = loss
              </div>
            </div>
          );
        })()}

        {/* ══  SECTION (stock-like only) ══ */}
        {STOCK_LIKE.includes(form.type) && (
          <>
            {sectionHeader("Risk Plan")}

            {/* Live R preview */}
            {plannedR !== null && (
              <div style={{
                background: plannedR >= 2 ? t.accent + "15" : t.danger + "15",
                border: `1px solid ${plannedR >= 2 ? t.accent : t.danger}30`,
                borderRadius: 10, padding: "12px 16px", marginBottom: 14,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Planned R</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: plannedR >= 2 ? t.accent : t.danger }}>
                    +{plannedR.toFixed(2)}R
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Risk/Share</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, color: t.danger }}>
                    ${Math.abs(+form.purchasePrice - +form.stopLoss).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 5 }}>Stop Loss <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 15H12.01M12 12V9M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 15.9923L13.7276 3.96153C12.9558 2.63852 11.0442 2.63852 10.2724 3.96153L3.25452 15.9923C2.47675 17.3256 3.43849 19 4.98207 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
                  <input style={{ ...inp, paddingLeft: 26, borderColor: form.stopLoss ? t.danger + "80" : t.inputBorder }}
                    type="number" value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} placeholder="185.00" />
                </div>
              </div>
              <div>
                <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 5 }}>Take Profit <svg width="13" height="13" viewBox="0 0 512 512"><path fill="currentColor" d="M204.762,254.456l34.212-34.204c-39.807-18.293-88.544-11.079-121.29,21.675c-42.013,42.006-42.013,110.372,0,152.393c42.005,42.014,110.38,42.014,152.386,0c32.746-32.745,39.968-81.49,21.675-121.298l-34.211,34.211c3.381,19.976-2.553,41.224-17.939,56.604c-25.21,25.218-66.225,25.218-91.434,0c-25.21-25.21-25.21-66.224,0-91.427C163.546,257.016,184.794,251.074,204.762,254.456z"/><path fill="currentColor" d="M323.628,241.146c34.324,57.876,26.642,133.939-23.076,183.65c-58.826,58.826-154.527,58.826-213.345,0c-58.826-58.817-58.826-154.527,0-213.352c49.703-49.711,125.775-57.393,183.65-23.076l31.216-31.225c-75.387-50.693-178.754-42.77-245.35,23.817c-75.629,75.621-75.629,198.69,0,274.311c75.63,75.638,198.683,75.638,274.312,0c66.603-66.595,74.518-169.962,23.809-245.358L323.628,241.146z"/><path fill="currentColor" d="M511.279,84.84c-1.61-4.195-5.684-6.78-10.298-6.57l-70.565,3.31l3.318-70.556c0.201-4.622-2.384-8.68-6.578-10.306c-4.17-1.61-9.122-0.451-12.52,2.931l-75.299,75.306l-3.809,81.322L198.634,297.162c-6.964-1.578-14.565,0.29-19.992,5.716c-8.422,8.422-8.422,22.062,0,30.484c8.414,8.422,22.062,8.422,30.484,0c5.418-5.427,7.295-13.028,5.716-20l136.886-136.894l81.314-3.8l75.307-75.316C511.739,93.963,512.89,89.026,511.279,84.84z"/></svg></label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
                  <input style={{ ...inp, paddingLeft: 26, borderColor: form.takeProfit ? t.accent + "80" : t.inputBorder }}
                    type="number" value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} placeholder="200.00" />
                </div>
              </div>
            </div>

            {/* Position Size Calculator */}
            {(() => {
              const account = parseFloat(calcAccountSize);
              const risk = parseFloat(calcRiskPct) / 100;
              const entry = parseFloat(form.purchasePrice);
              const stop = parseFloat(form.stopLoss);
              const calcShares = (account && risk && entry && stop && entry !== stop)
                ? Math.floor((account * risk) / Math.abs(entry - stop)) : null;
              const riskAmt = calcShares ? (calcShares * Math.abs(entry - stop)).toFixed(2) : null;
              return (
                <div style={{ marginBottom: 14, marginTop: 14 }}>
                  <button
                    onClick={() => setShowSizeCalc(s => !s)}
                    style={{ width: "100%", background: t.card2, border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>Position Size Calculator</span>
                    <span style={{ color: t.accent }}>{showSizeCalc ? "▲" : "▼"}</span>
                  </button>
                  {showSizeCalc && (
                    <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: "0 0 8px 8px", borderTop: "none", padding: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={lbl}>Account Size $</label>
                          <input style={inp} type="number" value={calcAccountSize} onChange={e => setCalcAccountSize(e.target.value)} placeholder="50000" />
                        </div>
                        <div>
                          <label style={lbl}>Risk %</label>
                          <input style={inp} type="number" value={calcRiskPct} onChange={e => setCalcRiskPct(e.target.value)} placeholder="1" step="0.1" />
                        </div>
                      </div>
                      {calcShares !== null ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.accent + "10", border: `1px solid ${t.accent}30`, borderRadius: 8, padding: "10px 14px" }}>
                          <div>
                            <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace" }}>Suggested size</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: t.accent, fontFamily: "'Space Mono', monospace" }}>{calcShares} {typeLabels(form.type).units.toLowerCase()}</div>
                            <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Max risk: ${riskAmt}</div>
                          </div>
                          <button onClick={() => set("numShares", String(calcShares))} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>Apply</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textAlign: "center", padding: "8px 0" }}>
                          Fill in Entry $, Stop Loss $, Account Size and Risk % to calculate
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
{/* ══ PRE-TRADE CHECKLIST ══ */}
        {sectionHeader("Pre-Trade Checklist")}

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace" }}>
              {checkedCount}/{checklist.length} completed
            </span>
            {allChecked && (
              <span style={{ fontSize: 11, color: t.accent, fontFamily: "'Space Mono', monospace" }}>✓ Ready to trade</span>
            )}
            {!allChecked && checkedCount > 0 && (
              <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>⚠ {checklist.length - checkedCount} remaining</span>
            )}
          </div>
          <div style={{ height: 4, background: t.border2, borderRadius: 2 }}>
            <div style={{
              height: "100%",
              width: `${(checkedCount / checklist.length) * 100}%`,
              background: allChecked ? t.accent : "#f59e0b",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        {/* Checklist items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {checklist.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: item.checked ? t.accent + "10" : t.card2,
              border: `1px solid ${item.checked ? t.accent + "40" : t.border}`,
              borderRadius: 8, padding: "10px 12px",
              cursor: "pointer", transition: "all 0.15s",
            }}
              onClick={() => toggleCheck(i)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${item.checked ? t.accent : t.text4}`,
                background: item.checked ? t.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {item.checked && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: 13, flex: 1,
                color: item.checked ? t.accent : t.text2,
                textDecoration: item.checked ? "line-through" : "none",
                opacity: item.checked ? 0.7 : 1,
              }}>
                {item.label}
              </span>
              {item.custom && (
                <button onClick={(e) => { e.stopPropagation(); removeCheckItem(i); }}
                  style={{ background: "none", border: "none", color: t.danger, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add custom item */}
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <input
            style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
            value={newCheckItem}
            onChange={(e) => setNewCheckItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
            placeholder="Add custom checklist item..."
          />
          <button onClick={addCheckItem} style={{
            background: t.accent + "20", border: `1px solid ${t.accent}40`,
            color: t.accent, borderRadius: 8, padding: "0 14px",
            cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
          }}>+ Add</button>
        </div>
{/* ══ EMOTION ══ */}
        {sectionHeader("Mindset")}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Emotion</label>
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
              style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
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
{/* ══ TAGS + THESIS ══ */}
        {sectionHeader("Notes")}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {(form.tags || []).map((tg) => <Tag key={tg} label={tg} t={t} onRemove={() => removeTag(tg)} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {SUGGESTED_TAGS.filter((s) => !(form.tags || []).includes(s)).map((s) => (
              <span key={s} onClick={() => addTag(s)} style={{ background: t.tagBg, color: t.text3, borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
                + {s}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)}
              placeholder="Add tag..."
            />
            <button onClick={() => addTag(tagInput)} style={{ background: t.accent + "20", border: `1px solid ${t.accent}40`, color: t.accent, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>+ Add</button>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <VoiceNote value={form.voiceNote} onChange={(v) => set("voiceNote", v)} t={t} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <ScreenshotUpload value={form.screenshots || []} onChange={(v) => set("screenshots", v)} t={t} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Trade Thesis</label>
          <textarea style={{ ...inp, height: 76, resize: "none" }} value={form.notes}
            onChange={(e) => set("notes", e.target.value)} placeholder="Why are you taking this trade? What's your edge?" />
        </div>

        {/* Footer buttons */}
        <div style={{
  fontSize: 10, color: t.text3, fontFamily: "'Space Mono', monospace",
  textAlign: "center", marginBottom: 14, letterSpacing: 1,
}}>
  ⏱ Market data is delayed 15 minutes · Powered by Polygon.io
</div>
       <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 12, cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button onClick={() => {
            if (!allChecked && canSave) {
              if (!window.confirm(`${checklist.length - checkedCount} checklist item(s) incomplete. Save anyway?`)) return;
            }
            save();
          }} disabled={!canSave} style={{
            flex: 2, background: canSave ? (allChecked ? t.accent : "#f59e0b") : t.card2,
            border: "none", color: canSave ? "#000" : t.text3,
            borderRadius: 8, padding: 12, cursor: canSave ? "pointer" : "not-allowed",
            fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace",
          }}>{allChecked ? "Save Plan ✓" : "Save Plan ⚠"}</button>
        </div>
      </div>
    </div>
  );
}
function TradeFormModal({ initial, onClose, onSave, onCSVImport, t, editLabel }) {
  const blank = {
    date: todayStr(),
    ticker: "",
    type: "stock",
    strategy: "Breakout",
    direction: "long",
    entryPrice: "",
    exitPrice: "",
    shares: "",
    stopLoss: "",
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
  const [tagInput, setTagInput] = useState("");
  const [customEmotions, setCustomEmotions] = useState([]);
  const [customMistakes, setCustomMistakes] = useState([]);
  const [emotionInput, setEmotionInput] = useState("");
  const [mistakeInput, setMistakeInput] = useState("");
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
    if (STOCK_LIKE.includes(form.type)) {
      trade.entryPrice = +form.entryPrice;
      trade.exitPrice = +form.exitPrice;
      trade.shares = +form.shares;
      if (form.stopLoss) trade.stopLoss = +form.stopLoss;
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
  const sectionHeader = (title) => (
    <div style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      color: t.accent,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 10,
      marginTop: 18,
      paddingBottom: 6,
      borderBottom: `1px solid ${t.border}`,
    }}>{title}</div>
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
        padding: 16,
      }}
    >
      <div
        className="modal-enter"
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
              display: "flex",
              alignItems: "center",
              gap: 6
              }}
          >
           {form.id ? (
  <>
    <svg width="1em" 
          height="1em" 
          viewBox="0 0 24 24" 
          fill="none" 
          style={{ display: "block" }}>
<path d="M21.2799 6.40005L11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7C6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284C18.7956 1.99914 19.139 1.92124 19.4875 1.9139C19.8359 1.90657 20.1823 1.96991 20.5056 2.10012C20.8289 2.23033 21.1225 2.42473 21.3686 2.67153C21.6147 2.91833 21.8083 3.21243 21.9376 3.53609C22.0669 3.85976 22.1294 4.20626 22.1211 4.55471C22.1128 4.90316 22.0339 5.24635 21.8894 5.5635C21.7448 5.88065 21.5375 6.16524 21.2799 6.40005V6.40005Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
<path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> {editLabel || "Edit Trade"}
  </>
) : (
  <>
    <svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> Log A Trade
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
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
<path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg>
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
            <label style={lbl}>{typeLabels(form.type).ticker}</label>
            <input
              style={inp}
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value.toUpperCase())}
              placeholder={form.type === "forex" ? "EUR/USD" : form.type === "crypto" ? "BTC/USDT" : "AAPL"}
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
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Strategy</label>
            <select
              style={inp}
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
              <label style={lbl}>{typeLabels(form.type).units}</label>
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
            <div>
              <label style={lbl}>Stop Loss $</label>
              <input
                style={inp}
                type="number"
                value={form.stopLoss || ""}
                onChange={(e) => set("stopLoss", e.target.value)}
                placeholder="185"
              />
            </div>
            <div>
              <label style={lbl}>Entry Time</label>
              <input
                style={inp}
                type="time"
                value={form.entryTime || ""}
                onChange={(e) => set("entryTime", e.target.value)}
              />
            </div>
            <div>
              <label style={lbl}>Exit Time</label>
              <input
                style={inp}
                type="time"
                value={form.exitTime || ""}
                onChange={(e) => set("exitTime", e.target.value)}
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
        {sectionHeader("Mindset")}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Emotion</label>
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
              style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
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
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Mistake</label>
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
              style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
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
        {sectionHeader("Notes")}
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
              style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }}
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
        <div style={{ marginBottom: 12 }}>
          <VoiceNote value={form.voiceNote} onChange={(v) => set("voiceNote", v)} t={t} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <ScreenshotUpload value={form.screenshots || []} onChange={(v) => set("screenshots", v)} t={t} />
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
            Save Trade
          </button>
    </div>
    </div>
    </div>
  );
}

function CSVModal({ onClose, onImport, t }) {
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
              notes: `Imported from ${broker}`,
              tags: [],
              legs: [],
            });
          }
        });
      });

      if (trades.length === 0) { setError("No completed trades found. Only closed trades will be imported."); return; }
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
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, minHeight: "100vh" }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent }}>CSV Import</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
<path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg></button>
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
  <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none">
<path d="M12 10V16M12 16L10 14M12 16L14 14M12.0627 6.06274L11.9373 5.93726C11.5914 5.59135 11.4184 5.4184 11.2166 5.29472C11.0376 5.18506 10.8425 5.10425 10.6385 5.05526C10.4083 5 10.1637 5 9.67452 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.07989 19 6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V10.2C21 9.0799 21 8.51984 20.782 8.09202C20.5903 7.71569 20.2843 7.40973 19.908 7.21799C19.4802 7 18.9201 7 17.8 7H14.3255C13.8363 7 13.5917 7 13.3615 6.94474C13.1575 6.89575 12.9624 6.81494 12.7834 6.70528C12.5816 6.5816 12.4086 6.40865 12.0627 6.06274Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> Choose File
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

function TradeRow({ trade, onClick, onEdit, onDelete, t, mobile, isFirst, editLabel }) {
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
              <span style={{ marginLeft: 6, fontSize: 10, color: t.text3, display: "inline-flex", alignItems: "center", gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/><path d="M2 13.3636C2 10.2994 2 8.76721 2.74902 7.6666C3.07328 7.19014 3.48995 6.78104 3.97524 6.46268C4.69555 5.99013 5.59733 5.82123 6.978 5.76086C7.63685 5.76086 8.20412 5.27068 8.33333 4.63636C8.52715 3.68489 9.37805 3 10.3663 3H13.6337C14.6219 3 15.4728 3.68489 15.6667 4.63636C15.7959 5.27068 16.3631 5.76086 17.022 5.76086C18.4027 5.82123 19.3044 5.99013 20.0248 6.46268C20.51 6.78104 20.9267 7.19014 21.251 7.6666C22 8.76721 22 10.2994 22 13.3636C22 16.4279 22 17.9601 21.251 19.0607C20.9267 19.5371 20.51 19.9462 20.0248 20.2646C18.9038 21 17.3433 21 14.2222 21H9.77778C6.65675 21 5.09624 21 3.97524 20.2646C3.48995 19.9462 3.07328 19.5371 2.74902 19.0607C2.53746 18.7498 2.38566 18.4045 2.27673 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> {trade.screenshots.length}</span>
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
function TradeDetail({ trade, onClose, onEdit, onExecute, onSave, onShare, t }) {
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
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
<path d="M10 21H6.2C5.0799 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V8.2C3 7.0799 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H17.8C18.9201 5 19.4802 5 19.908 5.21799C20.2843 5.40973 20.5903 5.71569 20.782 6.09202C21 6.51984 21 7.0799 21 8.2V10M7 3V5M17 3V5M3 9H21M13.5 13.0001L7 13M10 17.0001L7 17M14 21L16.025 20.595C16.2015 20.5597 16.2898 20.542 16.3721 20.5097C16.4452 20.4811 16.5147 20.4439 16.579 20.399C16.6516 20.3484 16.7152 20.2848 16.8426 20.1574L21 16C21.5523 15.4477 21.5523 14.5523 21 14C20.4477 13.4477 19.5523 13.4477 19 14L14.8426 18.1574C14.7152 18.2848 14.6516 18.3484 14.601 18.421C14.5561 18.4853 14.5189 18.5548 14.4903 18.6279C14.458 18.7102 14.4403 18.7985 14.405 18.975L14 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg>

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
                      : `${tr.shares} ${typeLabels(tr.type).units.toLowerCase()}`}
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
  { content: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
  { content: "The trend is your friend until the end when it bends.", author: "Ed Seykota" },
  { content: "Win or lose, everybody gets what they want out of the market.", author: "Ed Seykota" },
  { content: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
  { content: "The market is a device for transferring money from the active to the patient.", author: "Warren Buffett" },
  { content: "Cut your losses quickly and let your winners run.", author: "David Ricardo" },
  { content: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager" },
  { content: "The hard work in trading comes in the preparation. The actual process of trading should be effortless.", author: "Jack Schwager" },
  { content: "You don’t need to be a rocket scientist. Investing is not a game where the guy with the 160 IQ beats the guy with the 130 IQ.", author: "Warren Buffett" },
  { content: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { content: "The elements of good trading are: cutting losses, cutting losses, and cutting losses.", author: "Ed Seykota" },
  { content: "The market pays you to be disciplined.", author: "Unknown" },
  { content: "A good trader has no ego. You have to swallow your pride and get out of the losses.", author: "Tom Baldwin" },
  { content: "The key to trading success is emotional discipline.", author: "Alexander Elder" },
  { content: "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble.", author: "Warren Buffett" },
  { content: "The market can stay irrational longer than you can stay solvent.", author: "John Maynard Keynes" },
  { content: "Cut your losses short and let your winners run.", author: "David Ricardo" },
  { content: "Wide diversification is only required when investors do not understand what they are doing.", author: "Warren Buffett" },
  { content: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham" },
  { content: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.", author: "Benjamin Graham" },
  { content: "Markets are constantly in a state of uncertainty and flux and money is made by discounting the obvious and betting on the unexpected.", author: "George Soros" },
  { content: "Losers average losers.", author: "Paul Tudor Jones" },
  { content: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
  { content: "A trader who is not disciplined is a trader who will not last.", author: "Mark Douglas" },
  { content: "The consistency you seek is in your mind, not in the markets.", author: "Mark Douglas" },
  { content: "Every battle is won before it is fought.", author: "Sun Tzu" },
  { content: "He who knows when he can fight and when he cannot will be victorious.", author: "Sun Tzu" },
  { content: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { content: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { content: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { content: "Know what you own, and know why you own it.", author: "Peter Lynch" },
  { content: "The time of maximum pessimism is the best time to buy.", author: "Sir John Templeton" },
  { content: "Investing without research is like playing poker without looking at your cards.", author: "Peter Lynch" },
  { content: "The intelligent investor is a realist who sells to optimists and buys from pessimists.", author: "Benjamin Graham" },
  { content: "Behind every stock is a company. Find out what it's doing.", author: "Peter Lynch" },
  { content: "October is one of the peculiarly dangerous months to speculate in stocks.", author: "Mark Twain" },
  { content: "A peak performance trader is totally committed to being the best and doing whatever it takes.", author: "Van K. Tharp" },
  { content: "Trade the market in front of you, not the one you want.", author: "Unknown" },
  { content: "The market will pay you back for your patience.", author: "Unknown" },
  { content: "If you don't find a way to make money while you sleep, you will work until you die.", author: "Warren Buffett" },
  { content: "Good investing is boring. If you're entertained, you're probably speculating.", author: "George Soros" },
  { content: "The most contrarian thing of all is not to oppose the crowd but to think for yourself.", author: "Peter Thiel" },
  { content: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { content: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { content: "Do not anticipate and move without market confirmation.", author: "Jesse Livermore" },
  { content: "There is only one side to the stock market and it is not the bull side or the bear side, but the right side.", author: "Jesse Livermore" },
  { content: "Markets are never wrong, opinions often are.", author: "Jesse Livermore" },
  { content: "It was never my thinking that made big money for me. It was always my sitting.", author: "Jesse Livermore" },
  { content: "The game of speculation is the most uniformly fascinating game in the world.", author: "Jesse Livermore" },
  { content: "Wall Street never changes. The pockets change, the suckers change, but Wall Street never changes.", author: "Jesse Livermore" },
  { content: "I made my money by selling too soon.", author: "Bernard Baruch" },
  { content: "Never follow the crowd.", author: "Bernard Baruch" },
  { content: "Do more of what works and less of what doesn't.", author: "Steve Clark" },
  { content: "The best traders have no ego.", author: "Unknown" },
  { content: "Every trader has strengths and weaknesses. Know yours.", author: "Unknown" },
  { content: "Confidence is not about being right. It's about being okay with being wrong.", author: "Unknown" },
  { content: "A loss never bothers me after I take it. I forget it overnight. But being wrong and not taking the loss — that is what does the damage.", author: "Jesse Livermore" },
  { content: "To be a successful trader you have to be able to admit mistakes.", author: "William O'Neil" },
  { content: "The whole secret to winning in the stock market is to lose the least amount possible when you're not right.", author: "William O'Neil" },
  { content: "What seems too high and risky to the majority generally goes higher, and what seems low and cheap generally goes lower.", author: "William O'Neil" },
  { content: "Buy the best and forget the rest.", author: "Unknown" },
  { content: "Protect your capital as if it were your life.", author: "Unknown" },
  { content: "Your first loss is your best loss.", author: "Unknown" },
  { content: "Never let a winner turn into a loser.", author: "Unknown" },
  { content: "Trade what you see, not what you think.", author: "Unknown" },
  { content: "Patience is the most powerful edge in trading.", author: "Unknown" },
  { content: "The market rewards preparation and punishes impulse.", author: "Unknown" },
  { content: "Small losses kept small is the hallmark of a professional trader.", author: "Unknown" },
  { content: "Size your positions so that a loss won't change your behavior.", author: "Unknown" },
  { content: "The best trade is sometimes no trade.", author: "Unknown" },
  { content: "Fear and greed are the two enemies of rational investing.", author: "Unknown" },
  { content: "You don't have to be in the market every day.", author: "Unknown" },
  { content: "Preparation is the foundation of all profitable trading.", author: "Unknown" },
  { content: "Never risk more than you can afford to lose emotionally.", author: "Unknown" },
  { content: "The market is a mirror of human psychology.", author: "Unknown" },
  { content: "It's not about being perfect. It's about being consistent.", author: "Unknown" },
  { content: "Even the best traders are wrong half the time. What separates them is how they handle it.", author: "Unknown" },
  { content: "Volatility is the price you pay for returns.", author: "Unknown" },
  { content: "Every great trader was once a losing trader who refused to quit.", author: "Unknown" },
  { content: "Your edge comes from discipline, not prediction.", author: "Unknown" },
  { content: "A trading journal is a trader's most powerful tool.", author: "Unknown" },
  { content: "Review your trades as if someone else made them.", author: "Unknown" },
  { content: "The market doesn't care about your feelings.", author: "Unknown" },
  { content: "Simplicity is the ultimate sophistication in trading.", author: "Unknown" },
  { content: "Master one setup before learning another.", author: "Unknown" },
  { content: "The less you trade, the more you may earn.", author: "Unknown" },
  { content: "Price action is the purest form of market information.", author: "Unknown" },
  { content: "Risk management is not optional. It is the job.", author: "Unknown" },
  { content: "The market will humble you the moment you think you've mastered it.", author: "Unknown" },
  { content: "Great traders think in probabilities, not certainties.", author: "Unknown" },
  { content: "A good setup without discipline is just a good idea.", author: "Unknown" },
  { content: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { content: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { content: "Success is where preparation and opportunity meet.", author: "Bobby Unser" },
  { content: "It takes 20 years to build a reputation and five minutes to ruin it.", author: "Warren Buffett" },
  { content: "Forecasts may tell you a great deal about the forecaster; they tell you nothing about the future.", author: "Warren Buffett" },
  { content: "Diversification is protection against ignorance.", author: "Warren Buffett" },
  { content: "Only buy something that you'd be perfectly happy to hold if the market shut down for 10 years.", author: "Warren Buffett" },
  { content: "The market is a pendulum that forever swings between unsustainable optimism and unjustified pessimism.", author: "Benjamin Graham" },
  { content: "Confronted with a challenge to distill the secret of sound investment into three words, we venture the motto: Margin of Safety.", author: "Benjamin Graham" },
  { content: "The investor's chief problem — and even his worst enemy — is likely to be himself.", author: "Benjamin Graham" },
  { content: "Bull markets are born on pessimism, grown on skepticism, mature on optimism, and die on euphoria.", author: "Sir John Templeton" },
  { content: "If you want to have a better performance than the crowd, you must do things differently from the crowd.", author: "Sir John Templeton" },
  { content: "Compound interest is the eighth wonder of the world.", author: "Albert Einstein" },
  { content: "The most important quality for an investor is temperament, not intellect.", author: "Warren Buffett" },
  { content: "In the short run the market is a voting machine, but in the long run it is a weighing machine.", author: "Warren Buffett" },
  { content: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { content: "The philosophy of the rich versus the poor is this: the rich invest their money and spend what is left; the poor spend their money and invest what is left.", author: "Robert Kiyosaki" },
  { content: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { content: "Don't work for money; make money work for you.", author: "Robert Kiyosaki" },
  { content: "The single greatest edge an investor can have is a long-term orientation.", author: "Seth Klarman" },
  { content: "Value investing is at its core the marriage of a contrarian streak and a calculator.", author: "Seth Klarman" },
  { content: "The stock market is the story of cycles and of the human behavior that is responsible for overreactions in both directions.", author: "Seth Klarman" },
  { content: "Successful investing is anticipating the anticipations of others.", author: "John Maynard Keynes" },
  { content: "The engine of capitalism is self-interest; the brakes are wisdom.", author: "Unknown" },
  { content: "A rising tide lifts all boats, but when the tide goes out you see who is swimming naked.", author: "Warren Buffett" },
  { content: "In trading you have to be defensive and aggressive at the same time.", author: "Paul Tudor Jones" },
  { content: "I am always thinking about losing money as opposed to making money.", author: "Paul Tudor Jones" },
  { content: "Trading is a mental game. Master your mind and you master the market.", author: "Unknown" },
  { content: "The goal is not to be right. The goal is to make money.", author: "Unknown" },
  { content: "Every day the market gives you an opportunity. The question is whether you're ready.", author: "Unknown" },
  { content: "Your net worth will never exceed your self worth.", author: "Unknown" },
  { content: "The market is the ultimate teacher. Pay attention to its lessons.", author: "Unknown" },
];

useEffect(() => {
  const idx =
  Math.floor(Date.now() / 86400000) % FALLBACK_QUOTES.length;
  setQuote(FALLBACK_QUOTES[idx]);
}, []);

if (!quote) return null;

return (
  <div
    style={{
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 24,
      position: "relative",
    }}
  >
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
function DaySession({ plList, plans, onAddTrade, onAddPlan, t, mobile, isDark, journalText = "", onJournalChange }) {
  const today = todayStr();
  const todayTrades = plList.filter((tr) => tr.date === today);
  const sessionPL = todayTrades.reduce((s, tr) => s + tr.pl, 0);
  const wins = todayTrades.filter((tr) => tr.pl > 0).length;
  const losses = todayTrades.filter((tr) => tr.pl < 0).length;
  const [now, setNow] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

const timeStr = now.toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
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
              marginBottom: 20,
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
                      background: todayTrades[i].pl >= 0 ? t.accent : t.danger,
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
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> LOG
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
                    : `${tr.shares} ${typeLabels(tr.type).units.toLowerCase()}`}
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
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 12, overflow: "hidden", marginTop: 20,
      }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 16px", borderBottom: `1px solid ${t.border}`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10,
              color: t.text3, textTransform: "uppercase", letterSpacing: 2,
            }}>
              Trade Plans
            </div>
            <button
              onClick={onAddPlan}
              style={{
                background: t.accent, border: "none", color: "#000",
                borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
                <path d="M6 15.8L7.14286 17L10 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 8.8L7.14286 10L10 7" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 9L18 9" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                <path d="M13 16L18 16" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
              </svg> PLAN
            </button>
          </div>
          {plans.map((plan, i) => (
            <div key={plan.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px",
              borderBottom: i < plans.length - 1 ? `1px solid ${t.border}` : "none",
            }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>
                  {plan.ticker}
                </div>
                <div style={{ fontSize: 12, color: t.text3 }}>
                  {plan.strategy} · {plan.type === "options" ? `${plan.legs?.length}L options` : `${plan.numShares || plan.shares || "—"} ${typeLabels(plan.type).units.toLowerCase()}`}
                </div>
                {plan.checklist?.length > 0 && (
                  <div style={{ fontSize: 11, color: plan.checklistComplete ? t.accent : "#f59e0b", marginTop: 3, fontFamily: "'Space Mono', monospace" }}>
                    {plan.checklistComplete ? "✓ Checklist complete" : `⚠ ${(plan.checklist || []).filter(c => c.checked).length}/${plan.checklist.length} checked`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {STOCK_LIKE.includes(plan.type) && plan.purchasePrice && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text3 }}>
                    @ ${(+plan.purchasePrice).toFixed(2)}
                  </div>
                )}
                {plan.plannedR && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.accent }}>
                    +{plan.plannedR.toFixed(2)}R
                  </div>
                )}
                {plan.stopLoss && (
                  <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>
                    SL ${plan.stopLoss}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <div style={{ padding: 48, textAlign: "center", color: t.text4, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
              No trade plans yet
            </div>
          )}
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
          <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
            Today's Journal
          </div>
          <textarea
            value={journalText}
            onChange={(e) => onJournalChange(e.target.value)}
            placeholder="How was your session? What did you learn? What would you do differently?"
            style={{ width: "100%", minHeight: 100, background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
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
            model: "claude-sonnet-4-6",
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
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      if (!data.content) throw new Error("Empty response from API");
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
function SettingsModal({ onClose, isDark, setIsDark, onClear, t, onSignOut, isPro, onUpgrade, onManageBilling }) {
  return (
    <div className="backdrop-enter" style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16 }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 380, maxHeight: "92vh", overflowY: "auto", padding: 24, marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent, display: "flex", alignItems: "center", gap: 6}}>
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
<path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg> Settings</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
            <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Appearance</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: t.text }}>Theme</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setIsDark(false)} style={{ background: !isDark ? t.accent : t.card2, border: `1px solid ${!isDark ? t.accent : t.border}`, color: !isDark ? "#000" : t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: !isDark ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7.28451 10.3333C7.10026 10.8546 7 11.4156 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C11.4156 7 10.8546 7.10026 10.3333 7.28451" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M22 12L20 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19.7778 4.22266L17.5558 6.25424" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4.22217 4.22266L6.44418 6.25424" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6.44434 17.5557L4.22211 19.7779" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19.7778 19.7773L17.5558 17.5551" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Light
              </button>
              <button onClick={() => setIsDark(true)} style={{ background: isDark ? t.accent : t.card2, border: `1px solid ${isDark ? t.accent : t.border}`, color: isDark ? "#000" : t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: isDark ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19.9001 2.30719C19.7392 1.8976 19.1616 1.8976 19.0007 2.30719L18.5703 3.40247C18.5212 3.52752 18.4226 3.62651 18.298 3.67583L17.2067 4.1078C16.7986 4.26934 16.7986 4.849 17.2067 5.01054L18.298 5.44252C18.4226 5.49184 18.5212 5.59082 18.5703 5.71587L19.0007 6.81115C19.1616 7.22074 19.7392 7.22074 19.9001 6.81116L20.3305 5.71587C20.3796 5.59082 20.4782 5.49184 20.6028 5.44252L21.6941 5.01054C22.1022 4.849 22.1022 4.26934 21.6941 4.1078L20.6028 3.67583C20.4782 3.62651 20.3796 3.52752 20.3305 3.40247L19.9001 2.30719Z" stroke="currentColor"/><path d="M16.0328 8.12967C15.8718 7.72009 15.2943 7.72009 15.1333 8.12967L14.9764 8.52902C14.9273 8.65407 14.8287 8.75305 14.7041 8.80237L14.3062 8.95987C13.8981 9.12141 13.8981 9.70107 14.3062 9.86261L14.7041 10.0201C14.8287 10.0694 14.9273 10.1684 14.9764 10.2935L15.1333 10.6928C15.2943 11.1024 15.8718 11.1024 16.0328 10.6928L16.1897 10.2935C16.2388 10.1684 16.3374 10.0694 16.462 10.0201L16.8599 9.86261C17.268 9.70107 17.268 9.12141 16.8599 8.95987L16.462 8.80237C16.3374 8.75305 16.2388 8.65407 16.1897 8.52902L16.0328 8.12967Z" stroke="currentColor"/><path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM7.37554 20.013C7.017 19.8056 6.5582 19.9281 6.3508 20.2866C6.14339 20.6452 6.26591 21.104 6.62446 21.3114L7.37554 20.013ZM2.68862 17.3755C2.89602 17.7341 3.35482 17.8566 3.71337 17.6492C4.07191 17.4418 4.19443 16.983 3.98703 16.6245L2.68862 17.3755ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447ZM12 21.25C10.3139 21.25 8.73533 20.7996 7.37554 20.013L6.62446 21.3114C8.2064 22.2265 10.0432 22.75 12 22.75V21.25ZM3.98703 16.6245C3.20043 15.2647 2.75 13.6861 2.75 12H1.25C1.25 13.9568 1.77351 15.7936 2.68862 17.3755L3.98703 16.6245Z" fill="currentColor"/></svg>
                Dark
              </button>
            </div>
          </div>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Account</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>Plan</div>
              <div style={{ fontSize: 11, color: isPro ? t.accent : t.text3, marginTop: 2 }}>{isPro ? "Pro — $15/month" : "Free — 5 trades/month"}</div>
            </div>
            {isPro
              ? <button onClick={onManageBilling} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Manage</button>
              : <button onClick={onUpgrade} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>Upgrade</button>
            }
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: t.text }}>Change Password</div>
            <button onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user?.email) {
                await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
                alert("Password reset email sent to " + user.email);
              }
            }} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Send Reset Email</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: t.text }}>Sign Out</div>
            <button onClick={onSignOut} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Sign Out</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: t.text }}>Clear All Trades</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>Permanently delete all trade data</div>
            </div>
            <button onClick={() => { onClear(); onClose(); }} style={{ background: t.danger + "15", border: `1px solid ${t.danger}40`, color: t.danger, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function UpgradePrompt({ t, onUpgrade, feature }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 12 }}>
        <svg width="48" height="48" viewBox="0 0 45.386 45.386" xmlns="http://www.w3.org/2000/svg">
          <path fill="#3B82F6" d="M25.307,1.294c-1.354-1.726-3.874-1.726-5.229,0C14.344,8.599,2.252,6.517,2.252,16.103c0,11.621,9.023,28.489,20.441,29.283c11.418-0.794,20.441-17.662,20.441-29.283C43.134,6.517,31.042,8.599,25.307,1.294z M28.684,25.249l-5.651,11.515c-0.233,0.476-0.771,0.716-1.281,0.575c-0.51-0.143-0.848-0.718-0.803-1.244l0.633-7.623h-3.635c-0.438,0-0.849-0.113-1.111-0.464c-0.263-0.351-0.343-0.757-0.219-1.177l3.89-13.242c0.174-0.589,0.715-1.118,1.33-1.118h4.51c0.464,0,0.897,0.378,1.154,0.764c0.257,0.387,0.304,1.061,0.125,1.489l-3.582,8.748h3.396c0.479,0,0.924,0.14,1.178,0.546S28.895,24.82,28.684,25.249z"/>
        </svg>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>
        {feature} is a Pro feature
      </div>
      <div style={{ fontSize: 13, color: t.text3, marginBottom: 24, maxWidth: 320 }}>
        Upgrade to Pro for ${15}/month to unlock {feature}, unlimited trades, and options data via Polygon.io.
      </div>
      <button
        onClick={onUpgrade}
        style={{ background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

function ShareModal({ trade, onClose, t, isDark }) {
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
    ctx.fillStyle = fg3; ctx.font = "10px monospace";
    ctx.fillText("logfolio.app", 500, 280);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${trade.ticker || "trade"}-${trade.date || "card"}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };
  return (
    <div className="backdrop-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 480, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Share Trade</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
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
          <div style={{ fontSize: 9, color: t.text4, marginTop: 12, fontFamily: "'Space Mono',monospace", textAlign: "right" }}>LOG-FOLIO</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={downloadCard} style={{ flex: 1, background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>Download PNG</button>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function TradeReplay({ trades, onClose, t }) {
  const sorted = useMemo(() => [...trades].sort((a, b) => a.date.localeCompare(b.date)), [trades]);
  const [step, setStep] = useState(0);
  const current = sorted[step];
  const runningPL = sorted.slice(0, step + 1).reduce((s, tr) => s + calcPL(tr), 0);
  const pl = calcPL(current);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.stopPropagation(); setStep(s => Math.min(s + 1, sorted.length - 1)); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.stopPropagation(); setStep(s => Math.max(s - 1, 0)); }
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [sorted.length, onClose]);
  if (!current) return null;
  return (
    <div className="backdrop-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 520, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>
            Trade Replay — {step + 1} / {sorted.length}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ height: 4, background: t.border, borderRadius: 2, marginBottom: 20 }}>
          <div style={{ height: "100%", width: `${((step + 1) / sorted.length) * 100}%`, background: t.accent, borderRadius: 2, transition: "width 0.2s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: t.text }}>{current.ticker}</div>
            <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>{current.strategy} · {current.type} · {fmtDate(current.date)}</div>
            <div style={{ fontSize: 12, color: current.direction === "long" ? t.accent : t.danger, marginTop: 3, fontFamily: "'Space Mono',monospace" }}>{(current.direction || "").toUpperCase()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 24, fontWeight: 700, color: pl >= 0 ? t.accent : t.danger }}>{pl >= 0 ? "+" : ""}{fmt(pl)}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>Running: <span style={{ color: runningPL >= 0 ? t.accent : t.danger, fontFamily: "'Space Mono',monospace" }}>{runningPL >= 0 ? "+" : ""}{fmt(runningPL)}</span></div>
          </div>
        </div>
        {STOCK_LIKE.includes(current.type) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Entry", `$${current.entryPrice}`], ["Exit", `$${current.exitPrice || "—"}`], ["Size", `${current.shares} ${typeLabels(current.type).units.toLowerCase()}`]].map(([k, v]) => (
              <div key={k} style={{ background: t.surface, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, color: t.text, fontFamily: "'Space Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {current.emotion && current.emotion !== "None" && (
          <div style={{ fontSize: 12, color: t.text3, marginBottom: 8 }}>Emotion: <span style={{ color: t.text }}>{current.emotion}</span></div>
        )}
        {current.notes && (
          <div style={{ background: t.surface, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: t.text2, marginBottom: 16, lineHeight: 1.5 }}>{current.notes}</div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: step === 0 ? t.text4 : t.text2, borderRadius: 8, padding: 12, cursor: step === 0 ? "not-allowed" : "pointer", fontSize: 13 }}>← Prev</button>
          <button onClick={() => setStep(s => Math.min(s + 1, sorted.length - 1))} disabled={step === sorted.length - 1} style={{ flex: 1, background: step === sorted.length - 1 ? t.card2 : t.accent, border: "none", color: step === sorted.length - 1 ? t.text4 : "#000", borderRadius: 8, padding: 12, cursor: step === sorted.length - 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>Next →</button>
        </div>
        <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 10, fontFamily: "'Space Mono',monospace" }}>Use ← → arrow keys to navigate</div>
      </div>
    </div>
  );
}

function exportCSV(trades) {
  const headers = ["Date","Ticker","Type","Strategy","Direction","Entry","Exit","Shares","P/L","R","Emotion","Mistake","Tags","Notes"];
  const rows = trades.map(t => [
    t.date, t.ticker, t.type, t.strategy, t.direction,
    t.entryPrice ?? "", t.exitPrice ?? "", t.shares ?? "",
    calcPL(t).toFixed(2), calcR(t) != null ? calcR(t).toFixed(2) : "",
    t.emotion ?? "", t.mistake ?? "",
    (t.tags || []).join("|"),
    '"' + (t.notes || "").replace(/"/g, '""') + '"'
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `logfolio-trades-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TradingJournal() {
  const { user, profile, loading: authLoading, isPro, canUseAI, aiAnalysesLeft, refreshProfile, signOut } = useAuth();
  const [planSearch, setPlanSearch] = useState("");
  const [planFilter, setPlanFilter] = useState({ type: "all", strategy: "all", tag: "all" });
  const [planPerPage, setPlanPerPage] = useState(30);
  const [planPage, setPlanPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [isDark, setIsDark] = useState(() => loadTheme() === "dark");
  useEffect(() => { if (profile?.theme) setIsDark(profile.theme === "dark"); }, [profile?.theme]);
  const [tab, setTab] = useState("today");
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [planPrefill, setPlanPrefill] = useState(null);
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
  const [showSettings, setShowSettings] = useState(false);
  const [journals, setJournals] = useState({});
  const [showReplay, setShowReplay] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [spyData, setSpyData] = useState(null);
  const [spyError, setSpyError] = useState(false);
  const journalTimerRef = useRef(null);
  const mobile = useIsMobile();
  const T = tk(isDark);

  // Load trades from Supabase on login
  useEffect(() => {
    if (!user) return;
    const loadFromSupabase = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("id, data")
        .eq("user_id", user.id);
      if (error) {
        // Fall back to localStorage if Supabase fails
        const local = loadTrades();
        setTrades(local?.length ? local : []);
      } else {
        const loaded = data.map(row => ({ ...row.data, id: row.id }));
        // Migrate localStorage trades on first load
        if (loaded.length === 0) {
          const local = loadTrades();
          if (local?.length) {
            const rows = local.map(t => ({ id: t.id, user_id: user.id, data: t }));
            await supabase.from("trades").upsert(rows);
            setTrades(local);
          } else {
            setTrades([]);
          }
        } else {
          setTrades(loaded);
        }
      }
      setTradesLoaded(true);
    };
    loadFromSupabase();
  }, [user]);

  // Sync trades to Supabase whenever they change
  useEffect(() => {
    if (!user || !tradesLoaded) return;
    saveTrades(trades); // keep localStorage as backup
    // Supabase sync is done per-operation (add/save/delete) for efficiency
  }, [trades, user, tradesLoaded]);

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    if (user) supabase.from("profiles").update({ theme }).eq("id", user.id).then(() => {});
  }, [isDark, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("journals").select("data").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.data) setJournals(data.data); });
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") {
        setShowAdd(false); setShowPlan(false); setShowCSV(false);
        setShowSettings(false); setSelected(null); setSelectedPlan(null); setEditTrade(null);
      }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowAdd(true); }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); setShowPlan(true); }
      if (e.key === "t" || e.key === "T") { setTab("today"); }
      if (e.key === "w" || e.key === "W") { setTab("weekly"); }
      if (e.key === "c" || e.key === "C") { setTab("calendar"); }
      if (e.key === "l" || e.key === "L") { setTab("trades"); setSelected(null); }
      if (e.key === "p" || e.key === "P") { setTab("plans"); }
      if (e.key === "a" || e.key === "A") { setTab("analytics"); }
      if (e.key === "i" || e.key === "I") { setTab("ai"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const showToast = (msg, color, icon = null) => {
    setToast({ msg, color, icon });
    setTimeout(() => setToast(null), 2200);
  };
  const saveJournal = (date, text) => {
    const updated = { ...journals, [date]: text };
    setJournals(updated);
    clearTimeout(journalTimerRef.current);
    journalTimerRef.current = setTimeout(async () => {
      if (user) await supabase.from("journals").upsert({ user_id: user.id, data: updated });
    }, 1500);
  };
  const addTrade = async (trade) => {
    if (freeTierFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    if (trade.fromPlanId) {
      setTrades((p) => [...p.filter(t => t.id !== trade.fromPlanId), trade]);
      if (user) await supabase.from("trades").delete().eq("id", trade.fromPlanId).eq("user_id", user.id);
    } else {
      setTrades((p) => [...p, trade]);
    }
    setShowAdd(false);
    setPlanPrefill(null);
    setTab("trades");
    showToast("Trade saved", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: trade.id, user_id: user.id, data: trade });
  };
  const executePlan = (plan) => {
    const prefill = {
      date: todayStr(),
      ticker: plan.ticker,
      type: plan.type,
      strategy: plan.strategy,
      direction: plan.direction || (plan.stockDirection === "buy" ? "long" : "short"),
      entryPrice: plan.entryPrice || plan.purchasePrice || "",
      exitPrice: "",
      shares: plan.shares || plan.numShares || "",
      stopLoss: plan.stopLoss || "",
      takeProfit: plan.takeProfit || "",
      tags: plan.tags || [],
      notes: plan.notes || "",
      emotion: plan.emotion || "None",
      mistake: "None",
      legs: plan.legs?.length ? plan.legs.map(l => ({ ...l, exitPremium: "" })) : [{ position:"buy",type:"call",strike:"",expiration:"",entryPremium:"",exitPremium:"",contracts:1 }],
      fromPlanId: plan.id,
    };
    setSelectedPlan(null);
    setPlanPrefill(prefill);
    setShowAdd(true);
  };
  const saveTrade = async (trade) => {
    setTrades((p) => p.map((tr) => (tr.id === trade.id ? trade : tr)));
    setEditTrade(null);
    setSelected(trade);
    showToast("Trade updated", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: trade.id, user_id: user.id, data: trade });
  };
  const savePlan = async (plan) => {
    if (freeTierPlanFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    setTrades((p) => [...p, plan]);
    setShowPlan(false);
    showToast("Trade plan saved", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: plan.id, user_id: user.id, data: plan });
  };
  const handleUpgrade = async () => {
    if (!user) return;
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleManageBilling = async () => {
    if (!user) return;
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const freeTierFull = !isPro && trades.filter(t => t.status !== "planned" && t.date?.startsWith(currentMonth)).length >= 5;
  const freeTierPlanFull = !isPro && trades.filter(t => t.status === "planned" && t.date?.startsWith(currentMonth)).length >= 5;

  const deleteTrade = async (id) => {
    if (window.confirm("Delete this trade?")) {
      setTrades((p) => p.filter((tr) => tr.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Trade deleted", T.danger, "delete");
      if (user) await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
    }
  };
const importTrades = (incoming) => {
  const month = new Date().toISOString().slice(0, 7);
  const thisMonthLogs = trades.filter(t => t.status !== "planned" && t.date?.startsWith(month)).length;
  const toImport = isPro ? incoming : incoming.slice(0, Math.max(0, 5 - thisMonthLogs));
  if (toImport.length === 0) { handleUpgrade(); return; }
  setTrades((p) => [...p, ...toImport]);
  setShowCSV(false);
  setPage(1);
  if (!isPro && toImport.length < incoming.length)
    showToast(`Imported ${toImport.length}/${incoming.length} — free limit reached`, T.accent, "log");
  else
    showToast(`Imported ${toImport.length} trades`, T.accent, "log");
};
  const clearAll = () => {
    if (window.confirm("Clear all trades?")) {
      setTrades([]);
      setSelected(null);
      localStorage.removeItem(STORAGE_KEY);
      showToast("All trades cleared", T.danger, "delete");
    }
  };

const plList = useMemo(
  () => trades
    .filter((t) => t.status !== "planned" && t.date)
    .map((t) => ({ ...t, pl: calcPL(t), r: calcR(t) })),
  [trades]
);

  useEffect(() => {
    if (plList.length < 2) { setSpyData(null); setSpyError(false); return; }
    const sorted = [...plList].sort((a, b) => a.date.localeCompare(b.date));
    const fromTs = Math.floor(new Date(sorted[0].date).getTime() / 1000);
    const toTs = Math.floor(new Date(sorted[sorted.length - 1].date).getTime() / 1000) + 86400;
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${fromTs}&period2=${toTs}&interval=1d`)}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const result = data?.chart?.result?.[0];
        const timestamps = result?.timestamp;
        const closes = result?.indicators?.quote?.[0]?.close;
        if (timestamps?.length && closes?.length) {
          setSpyData(timestamps.map((t, i) => ({
            date: new Date(t * 1000).toISOString().slice(0, 10),
            close: closes[i],
          })).filter(d => d.close != null));
          setSpyError(false);
        } else {
          setSpyData(null);
          setSpyError(true);
        }
      })
      .catch(() => { setSpyData(null); setSpyError(true); });
  }, [plList.length]);

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
      if (!map[t.strategy]) map[t.strategy] = { pl: 0, wins: 0, total: 0, holdSum: 0, holdCount: 0 };
      map[t.strategy].pl += t.pl;
      map[t.strategy].total++;
      if (t.pl > 0) map[t.strategy].wins++;
      if (t.holdMinutes != null) { map[t.strategy].holdSum += t.holdMinutes; map[t.strategy].holdCount++; }
    });
    return Object.entries(map)
      .map(([s, d]) => ({ strategy: s, ...d, winRate: d.wins / d.total, avgHold: d.holdCount ? Math.round(d.holdSum / d.holdCount) : null }))
      .sort((a, b) => b.pl - a.pl);
  }, [plList]);

  const maxDrawdown = useMemo(() => {
    if (!plList.length) return { value: 0, pct: 0 };
    const sorted = [...plList].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0, peak = 0, maxDD = 0;
    sorted.forEach(t => {
      running += t.pl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    return { value: maxDD, pct: peak > 0 ? maxDD / peak : 0 };
  }, [plList]);

  const dayOfWeekStats = useMemo(() => {
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const map = {};
    DAYS.forEach(d => { map[d] = { pl: 0, wins: 0, total: 0 }; });
    plList.forEach(t => {
      if (!t.date) return;
      const [y, mo, d] = t.date.split("-").map(Number);
      const dayName = DAYS[new Date(y, mo - 1, d).getDay()];
      map[dayName].pl += t.pl;
      map[dayName].total++;
      if (t.pl > 0) map[dayName].wins++;
    });
    return ["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => ({
      day: d, short: d.slice(0, 3), ...map[d],
      winRate: map[d].total ? map[d].wins / map[d].total : 0,
    }));
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
  const filteredPlans = useMemo(() => {
  const q = planSearch.toLowerCase().trim();
  return trades
    .filter(t => t.status === "planned")
    .filter(t => planFilter.type === "all" || t.type === planFilter.type)
    .filter(t => planFilter.strategy === "all" || t.strategy === planFilter.strategy)
    .filter(t => planFilter.tag === "all" || (t.tags || []).includes(planFilter.tag))
    .filter(t => !q || [t.ticker, t.strategy, t.notes, ...(t.tags || [])].some(f => (f || "").toLowerCase().includes(q)));
}, [trades, planSearch, planFilter]);
const planList = useMemo(() => trades.filter(t => t.status === "planned"), [trades]);
const planAllTags = useMemo(() => [...new Set(planList.flatMap(t => t.tags || []))], [planList]);
const planAllStrategies = useMemo(() => [...new Set(planList.map(t => t.strategy).filter(Boolean))], [planList]);
const planTotalPages = Math.ceil(filteredPlans.length / planPerPage);
const paginatedPlans = filteredPlans.slice((planPage - 1) * planPerPage, planPage * planPerPage);
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
    ["weekly", "Weekly"],
    ["calendar", "Calendar"],
    ["trades", "Logs"],
    ["plans", "Plans"],
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

  if (authLoading || (user && !tradesLoaded)) {
    return (
      <div style={{ minHeight: "100vh", background: isDark ? "#000" : "#f4f5f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#666" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen isDark={isDark} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        transition: "background 0.2s,color 0.2s",
        position: "relative",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`   * { margin: 0; padding: 0; box-sizing: border-box; }   body { background: ${T.bg}; }   input[type="date"]::-webkit-calendar-picker-indicator {     filter: ${isDark ? "invert(1)" : "none"};     cursor: pointer;   } `}</style>

      {toast && (
        <div
          className="toast-enter"
          style={{
            position: "fixed",
            bottom: 20,
            right: 16,
            left: mobile ? 16 : "auto",
            zIndex: 300,
            background: T.card,
            border: `1px solid ${toast.color}60`,
            borderLeft: `3px solid ${toast.color}`,
            borderRadius: 10,
            padding: "11px 16px",
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            color: toast.color,
            display: "flex",
            alignItems: "center",
            justifyContent: mobile ? "center" : "flex-start",
            gap: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            minWidth: 200,
          }}
        >
          {toast.icon === "log" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {toast.icon === "plan" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 15.8L7.14286 17L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 8.8L7.14286 10L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 9L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13 16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {toast.icon === "delete" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6L18.1245 19.1327C18.0544 20.1846 17.1818 21 16.1275 21H7.8725C6.81818 21 5.94558 20.1846 5.87549 19.1327L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {toast.icon === "warning" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.32 1.55 18.68 1.56 19.04C1.57 19.4 1.68 19.75 1.88 20.06C2.08 20.37 2.36 20.62 2.69 20.79C3.02 20.96 3.39 21.04 3.76 21H20.24C20.61 21.04 20.98 20.96 21.31 20.79C21.64 20.62 21.92 20.37 22.12 20.06C22.32 19.75 22.43 19.4 22.44 19.04C22.45 18.68 22.36 18.32 22.18 18L13.71 3.86C13.52 3.56 13.26 3.31 12.95 3.13C12.64 2.96 12.29 2.87 11.94 2.87C11.59 2.87 11.24 2.96 10.93 3.13C10.62 3.31 10.36 3.56 10.17 3.86H10.29Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
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
        <svg width="28" height="28" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.8" y="14.7" fill="#FF1212" width="4.3" height="12"/>
          <rect x="5.7" y="12.1" fill="#FF1212" width="0.4" height="17.1"/>
          <rect x="11.3" y="18.2" fill="#12B248" width="4.3" height="7.3"/>
          <rect x="13.2" y="16.6" fill="#12B248" width="0.4" height="10.5"/>
          <rect x="20.6" y="7.9" fill="#12B248" width="0.5" height="14.7"/>
          <rect x="18.7" y="9.4" fill="#12B248" width="4.3" height="10.7"/>
          <polyline fill="none" stroke="#3B82F6" strokeLinecap="round" strokeMiterlimit="10" points="5.6,30.7 13.7,29.4 21.3,24.5 28.6,22.2"/>
          <path fill="#87B3F4" d="M30.7,7.2c0-1.2-1-2.2-2.2-2.2c-1.2,0-2.2,1-2.2,2.2l0,0.7c0,0,0,0,0.1,0c0.5,0.2,1.2,0.5,2.1,0.5s1.6-0.2,2.1-0.5c0,0,0,0,0.1,0V7.2z"/>
          <path fill="#3B82F6" d="M26.4,7.8L26.4,7.8C26.4,7.9,26.4,7.9,26.4,7.8c0.5,0.3,1.3,0.5,2.2,0.5c0.9,0,1.6-0.2,2.1-0.5c0,0,0,0,0.1,0l0,6.6c0,0.4,0,0.7,0,0.9c0,0.3-0.1,0.5-0.2,0.8c-0.1,0.2-0.2,0.4-0.4,0.8l-1.1,2.1c-0.1,0.2-0.3,0.3-0.5,0.3c-0.2,0-0.4-0.1-0.5-0.3L27,17c-0.2-0.4-0.3-0.6-0.4-0.8c-0.1-0.2-0.1-0.5-0.2-0.8c0-0.2,0-0.4,0-0.9L26.4,7.8z"/>
        </svg>
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            color: T.accent,
            letterSpacing: 2,
          }}
        >
          LOG-FOLIO
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
                  borderRadius: 8,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono', monospace",
                  display: "flex",
                  alignItems: "center",
                }}
              >
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
          <path d="M6 7H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 17H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg>
              </button>
             <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono', monospace",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
<path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg>
              </button>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 7,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none" style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> LOG
              </button>
              <button
  onClick={() => setShowPlan(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "0 16px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
>
<svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M6 15.8L7.14286 17L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M6 8.8L7.14286 10L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M13 9L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  
</svg> PLAN
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
                onClick={() => setShowSettings(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
<path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg> SETTINGS
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
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
              >
                <svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> LOG
              </button>
              <button
  onClick={() => setShowPlan(true)}
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
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
               >

<svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M6 15.8L7.14286 17L10 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M6 8.8L7.14286 10L10 7" stroke="#000000" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M13 9L18 9" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 16L18 16" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
  <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
  
</svg> PLAN
</button>
            </div>
          </>
        )}
      </div>

      <div key={tab} className="tab-enter" style={{ padding: mobile ? 14 : 28 }}>
        {tab === "ai" && (isPro
          ? <AIInsights plList={plList} t={T} mobile={mobile} />
          : <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="AI Insights" />
        )}
        {tab === "today" && (
<DaySession
            plList={plList}
            plans={trades.filter(t => t.status === "planned")}
            onAddTrade={() => setShowAdd(true)}
            onAddPlan={() => setShowPlan(true)}
            t={T}
            mobile={mobile}
            isDark={isDark}
            journalText={journals[todayStr()] || ""}
            onJournalChange={(text) => saveJournal(todayStr(), text)}
          />
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
        onSave={(updated) => { saveTrade(updated); setSelected(updated); }}
        onShare={() => setShareTarget(selected)}
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
            gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr auto auto auto",
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
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
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
          <button
            onClick={() => exportCSV(filtered)}
            style={{ ...sel, background: T.accent + "15", border: `1px solid ${T.accent}40`, color: T.accent, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: "nowrap", padding: "6px 12px" }}
          >
            Export CSV
          </button>
          {plList.length > 1 && (
            <button
              onClick={() => setShowReplay(true)}
              style={{ ...sel, background: "#3B82F620", border: "1px solid #3B82F640", color: "#3B82F6", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: "nowrap", padding: "6px 12px" }}
            >
              Replay
            </button>
          )}
        </div>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
          }}
        >
          {paginated.map((tr, i) => (
            <TradeRow
              key={tr.id}
              trade={tr}
              isFirst={i === 0}
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
{tab === "plans" && (
  <div>
    {selectedPlan ? (
      <TradeDetail
        trade={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onEdit={() => {
          setEditTrade(selectedPlan);
          setSelectedPlan(null);
        }}
        onExecute={() => executePlan(selectedPlan)}
        onSave={(updated) => { saveTrade(updated); setSelectedPlan(updated); }}
        onShare={() => setShareTarget(selectedPlan)}
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
            value={planSearch}
            onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
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
            value={planFilter.type}
            onChange={(e) => { setPlanFilter(f => ({ ...f, type: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Types</option>
            <option value="stock">Stock</option>
            <option value="options">Options</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
          <select
            style={sel}
            value={planFilter.strategy}
            onChange={(e) => { setPlanFilter(f => ({ ...f, strategy: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Strategies</option>
            {planAllStrategies.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            style={sel}
            value={planFilter.tag}
            onChange={(e) => { setPlanFilter(f => ({ ...f, tag: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Tags</option>
            {planAllTags.map(tg => <option key={tg}>{tg}</option>)}
          </select>
          <select
            style={{ ...sel, width: mobile ? "100%" : "auto" }}
            value={planPerPage}
            onChange={(e) => { setPlanPerPage(Number(e.target.value)); setPlanPage(1); }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          {!mobile && (
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: T.text3, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
              {filteredPlans.length} plans
            </div>
          )}
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          {paginatedPlans.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: T.text4, fontFamily: "'Space Mono',monospace", fontSize: 12 }}>
              No trade plans found
            </div>
          ) : (
            paginatedPlans.map((plan, i) => (
              <TradeRow
                key={plan.id}
                trade={plan}
                isFirst={i === 0}
                onClick={() => setSelectedPlan(plan)}
                onEdit={() => setEditTrade(plan)}
                onDelete={() => deleteTrade(plan.id)}
                t={T}
                mobile={mobile}
              />
            ))
          )}
        </div>
        {planTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
            <button
              style={{ ...sel, padding: "6px 12px", cursor: planPage === 1 ? "default" : "pointer", opacity: planPage === 1 ? 0.4 : 1 }}
              disabled={planPage === 1}
              onClick={() => setPlanPage(p => p - 1)}
            >←</button>
            {Array.from({ length: planTotalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{ ...sel, padding: "6px 12px", cursor: "pointer", background: n === planPage ? T.accent : T.input, color: n === planPage ? "#fff" : T.text }}
                onClick={() => setPlanPage(n)}
              >{n}</button>
            ))}
            <button
              style={{ ...sel, padding: "6px 12px", cursor: planPage === planTotalPages ? "default" : "pointer", opacity: planPage === planTotalPages ? 0.4 : 1 }}
              disabled={planPage === planTotalPages}
              onClick={() => setPlanPage(p => p + 1)}
            >→</button>
          </div>
        )}
      </div>
    )}
  </div>
)}
        {tab === "weekly" && (
          <WeeklyReview plList={plList} t={T} mobile={mobile} />
        )}

        {tab === "analytics" && !isPro && (
          <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="Analytics" />
        )}
        {tab === "analytics" && isPro && (
          <div>
            {/* All key stats */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="Total P/L" value={fmt(stats.totalPL)} sub={`${stats.total} trades`} color={stats.totalPL >= 0 ? T.accent : T.danger} t={T} />
              <StatCard label="Win Rate" value={`${(stats.winRate * 100).toFixed(0)}%`} sub={`${stats.wins}W/${stats.total - stats.wins}L`} t={T} />
              <StatCard label="Expectancy" value={fmt(stats.expectancy)} sub="per trade" color={stats.expectancy >= 0 ? T.accent : T.danger} t={T} />
              <StatCard label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} sub="wins/losses" t={T} />
              <StatCard label="Avg R" value={avgR !== null ? fmtR(avgR) : "—"} sub="per closed trade" color={avgR !== null && avgR >= 0 ? T.accent : avgR !== null ? T.danger : undefined} t={T} />
              <StatCard label="Avg Win" value={fmt(stats.avgWin)} color={T.accent} t={T} />
              <StatCard label="Avg Loss" value={fmt(stats.avgLoss)} color={T.danger} t={T} />
              <StatCard label="Best Trade" value={plList.length ? fmt(Math.max(...plList.map(t => t.pl))) : "—"} color={T.accent} t={T} />
              <StatCard label="Worst Trade" value={plList.length ? fmt(Math.min(...plList.map(t => t.pl))) : "—"} color={T.danger} t={T} />
              <StatCard label="Max Drawdown" value={maxDrawdown.value > 0 ? `-${fmt(maxDrawdown.value)}` : "—"} sub={maxDrawdown.pct > 0 ? `${(maxDrawdown.pct * 100).toFixed(1)}% of peak` : "no drawdown"} color={maxDrawdown.value > 0 ? T.danger : undefined} t={T} />
            </div>

            {/* Equity Curve */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                Equity Curve
              </div>
              <EquityCurve trades={plList} t={T} spyData={spyData} spyError={spyError} />
            </div>

            {/* Strategy + Tag/Emotion */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                  Strategy Performance
                </div>
                {(() => {
                  const maxStratPL = Math.max(...stratStats.map(s => Math.abs(s.pl)), 1);
                  return stratStats.map((s) => (
                    <div key={s.strategy} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: T.text2 }}>{s.strategy}</span>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {s.avgHold != null && (
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>
                              {s.avgHold < 60 ? `${s.avgHold}m` : `${Math.floor(s.avgHold/60)}h${s.avgHold%60}m`}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>{(s.winRate * 100).toFixed(0)}%WR</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: s.pl >= 0 ? T.accent : T.danger }}>{s.pl >= 0 ? "+" : ""}{fmt(s.pl)}</span>
                        </div>
                      </div>
                      <MiniBar value={s.pl} max={maxStratPL} t={T} />
                    </div>
                  ));
                })()}
              </div>

              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                  Tag Performance
                </div>
                {allTags.length === 0 ? (
                  <div style={{ color: T.text3, fontSize: 13 }}>No tags added yet</div>
                ) : (
                  allTags.map((tag) => {
                    const tagged = plList.filter((tr) => (tr.tags || []).includes(tag));
                    const tagPL = tagged.reduce((s, tr) => s + tr.pl, 0);
                    const tagWR = tagged.length ? tagged.filter((tr) => tr.pl > 0).length / tagged.length : 0;
                    return (
                      <div key={tag} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 13, color: T.text2 }}>{tag} <span style={{ fontSize: 10, color: T.text3 }}>({tagged.length})</span></span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>{(tagWR * 100).toFixed(0)}%WR</span>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: tagPL >= 0 ? T.accent : T.danger }}>{tagPL >= 0 ? "+" : ""}{fmt(tagPL)}</span>
                          </div>
                        </div>
                        <MiniBar value={tagPL} max={maxPL} t={T} />
                      </div>
                    );
                  })
                )}
                <div style={{ marginTop: 18, fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
                  Emotion Impact
                </div>
                {Object.entries(
                  plList.reduce((acc, tr) => { if (!acc[tr.emotion]) acc[tr.emotion] = 0; acc[tr.emotion] += tr.pl; return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).map(([em, val]) => (
                  <div key={em} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>{em}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: val >= 0 ? T.accent : T.danger }}>{val >= 0 ? "+" : ""}{fmt(val)}</span>
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
          {/* Day of Week */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
              Performance by Day
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: 10 }}>
              {dayOfWeekStats.map(d => (
                <div key={d.day} style={{ textAlign: "center", background: T.card2, borderRadius: 10, padding: "12px 8px" }}>
                  <div style={{ fontSize: 10, color: T.text3, fontFamily: "'Space Mono',monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{d.short}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: d.total === 0 ? T.text4 : d.pl >= 0 ? T.accent : T.danger }}>
                    {d.total === 0 ? "—" : `${d.pl >= 0 ? "+" : ""}${fmt(d.pl)}`}
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                    {d.total === 0 ? "no trades" : `${(d.winRate * 100).toFixed(0)}% WR · ${d.total}t`}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>

{showAdd && (
        <TradeFormModal
          initial={planPrefill || undefined}
          editLabel={planPrefill ? "Execute Plan" : undefined}
          onClose={() => { setShowAdd(false); setPlanPrefill(null); }}
          onSave={addTrade}
          onCSVImport={() => { setShowAdd(false); setPlanPrefill(null); setShowCSV(true); }}
          t={T}
        />
      )}
      {editTrade && editTrade.status === "planned" && (
        <PlanModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={(plan) => { saveTrade(plan); setEditTrade(null); }}
          t={T}
          isDark={isDark}
        />
      )}
      {editTrade && editTrade.status !== "planned" && (
        <TradeFormModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={saveTrade}
          onCSVImport={() => { setEditTrade(null); setShowCSV(true); }}
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
      {showSettings && (
  <SettingsModal
    onClose={() => setShowSettings(false)}
    isDark={isDark}
    setIsDark={setIsDark}
    onClear={clearAll}
    t={T}
    onSignOut={() => { setShowSettings(false); signOut(); }}
    isPro={isPro}
    onUpgrade={() => { setShowSettings(false); handleUpgrade(); }}
    onManageBilling={() => { setShowSettings(false); handleManageBilling(); }}
  />
)}
      {showPlan && (
  <PlanModal
    onClose={() => setShowPlan(false)}
    onSave={savePlan}
    t={T}
    isDark={isDark}
  />
)}
      {showReplay && plList.length > 0 && (
        <TradeReplay trades={plList} onClose={() => setShowReplay(false)} t={T} />
      )}
      {shareTarget && (
        <ShareModal trade={shareTarget} onClose={() => setShareTarget(null)} t={T} isDark={isDark} />
      )}
    </div>
  );
}
