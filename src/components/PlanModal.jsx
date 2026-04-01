import { useState, useEffect, useRef } from "react";
import { useModalClose } from "../lib/useModalClose";
import { PlanIcon, CloseIcon, WarningIcon, TargetIcon, TickerIcon, CategoryIcon, StrategyIcon, TodayIcon, DirectionIcon, AmountIcon, EntryPriceIcon, CurrentPriceIcon, EmotionIcon, TagsIcon, PenIcon, ChecklistIcon, RobotIcon, BuySellIcon, CallOrPutIcon, StrikeIcon, PremiumEntryIcon, ContractsIcon, IVIcon, TimeframeIcon } from "../lib/icons";
import { supabase } from "../lib/supabase";
import { STOCK_LIKE, SUGGESTED_TAGS, EMOTIONS, OPTION_STRATEGIES } from "../lib/constants";
import { todayStr, typeLabels, normCDF, bsPrice } from "../lib/utils";
import DateInput from "./DateInput";
import Tag from "./Tag";
import VoiceNote from "./VoiceNote";

// Compress an image to JPEG max 1200px, returns { base64, mediaType }
async function compressChartImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg", previewUrl: dataUrl });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PlanModal({ onClose, onSave, t, isDark, initial, trades = [], spyData = null, isPro = false, isProPlus = false, onUpgrade }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const OPTION_STRATEGY_NAMES = Object.keys(OPTION_STRATEGIES);
  const STOCK_STRATEGIES = ["Breakout", "Pullback", "Reversal", "Scalp"];

  const blankLeg = (pos = "buy", type = "call") => ({
    position: pos, type, strike: "", expiration: "", entryPremium: "", contracts: 1, iv: "",
  });
  const [tickerLoading, setTickerLoading] = useState(false);
const [chainLoading, setChainLoading] = useState(false);
const [chainError, setChainError] = useState(null);
const [expiryDates, setExpiryDates] = useState([]);
const [strikes, setStrikes] = useState([]);
const [strikeManual, setStrikeManual] = useState({});
const [pnlMode, setPnlMode] = useState("pct"); // "pct" | "dollar"
const [gridPriceMin, setGridPriceMin] = useState("");
const [gridPriceMax, setGridPriceMax] = useState("");
const [gridDateFrom, setGridDateFrom] = useState("");
const [gridDateTo, setGridDateTo] = useState("");
const [gridIV, setGridIV] = useState("");
const [gridColOffset, setGridColOffset] = useState(0);
const [gridRowOffset, setGridRowOffset] = useState(0);
const polyFetch = async (path) => {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch("/api/polygon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ path }),
  }).then(r => r.json());
};

const fetchStockPrice = async (ticker) => {
  if (!ticker || ticker.length < 1) return;
  setTickerLoading(true);
  try {
    const data = await polyFetch(`/v2/aggs/ticker/${ticker.toUpperCase()}/prev?adjusted=true`);
    const price = data?.results?.[0]?.c;
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
  setChainError(null);
  try {
    const data = await polyFetch(`/v3/reference/options/contracts?underlying_ticker=${ticker}&limit=250&order=asc&sort=expiration_date`);
    if (data?.error) { setChainError("Too many requests — please try again in a moment."); setChainLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    const dates = [...new Set((data?.results || []).map(c => c.expiration_date))].filter(d => d >= today).sort();
    setExpiryDates(dates);
  } catch { setChainError("Too many requests — please try again in a moment."); }
  setChainLoading(false);
};

const fetchStrikes = async (ticker, expiry, optionType) => {
  if (!ticker || !expiry) return;
  setStrikes([]);
  setChainError(null);
  setStrikeManual({});
  try {
    const contractType = optionType === "call" ? "call" : "put";
    const data = await polyFetch(`/v3/reference/options/contracts?underlying_ticker=${ticker}&expiration_date=${expiry}&contract_type=${contractType}&limit=250&order=asc&sort=strike_price`);
    if (data?.error) { setChainError("Too many requests — please try again in a moment."); return; }
    const contracts = data?.results || [];
    if (!contracts.length) { setChainError(`No ${optionType} contracts for ${ticker} on ${expiry}.`); return; }
    setStrikes(contracts.map(c => ({ strike: c.strike_price, ticker: c.ticker })));
  } catch { setChainError("Too many requests — please try again in a moment."); }
};

const fetchPremium = async (contractTicker, legIndex) => {
  if (!contractTicker) return;
  try {
    // contractTicker is Polygon format: O:SPY251017C00600000
    const data = await polyFetch(`/v2/aggs/ticker/${contractTicker}/prev?adjusted=true`);
    const close = data?.results?.[0]?.c;
    if (close) setLeg(legIndex, "entryPremium", close.toFixed(2));
  } catch {}
};
const [form, setForm] = useState(initial ? {
    date: initial.date || todayStr(),
    ticker: initial.ticker || "",
    type: initial.type || "stock",
    strategy: initial.strategy || "Breakout",
    direction: initial.direction || "long",
    stockDirection: initial.direction === "short" ? "short" : "long",
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
    stockDirection: "long",
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
const [showIncompleteModal, setShowIncompleteModal] = useState(false);
const [calcAccountSize, setCalcAccountSize] = useState("");
const [calcRiskPct, setCalcRiskPct] = useState("1");
const [aiAssist, setAiAssist] = useState(initial?.aiAssist || null); // { marketBias, checklist, chartAnalysis? }
const [aiLoading, setAiLoading] = useState(false);
const [aiStep, setAiStep] = useState(""); // "price" | "ai"
const [aiError, setAiError] = useState(null);
const [chartImage, setChartImage] = useState(null); // { base64, mediaType, previewUrl }
const chartFileRef = useRef(null);
const [assistUsedToday, setAssistUsedToday] = useState(0);
const ASSIST_DAILY_LIMIT = 3;

useEffect(() => {
  if (!isProPlus) return;
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("profiles").select("ai_assist_daily_count, ai_assist_daily_date").eq("id", session.user.id).single()
      .then(({ data }) => {
        if (data?.ai_assist_daily_date === today) setAssistUsedToday(data.ai_assist_daily_count ?? 0);
      });
  });
}, [isProPlus]);

const fetchAiAssist = async () => {
  if (!isProPlus) return;
  setAiLoading(true); setAiError(null); setAiAssist(null); setAiStep("price");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const ticker = form.ticker?.toUpperCase();

    // Build personal trade history for this ticker + overall stats
    const pastOnTicker = trades.filter(t => t.ticker?.toUpperCase() === ticker && t.status !== "planned");
    const stratWins = {};
    const stratTotal = {};
    trades.filter(t => t.status !== "planned" && t.strategy).forEach(t => {
      const pl = (t.exitPrice - t.entryPrice) * (t.shares || 1) * (t.direction === "short" ? -1 : 1);
      stratTotal[t.strategy] = (stratTotal[t.strategy] || 0) + 1;
      if (pl > 0) stratWins[t.strategy] = (stratWins[t.strategy] || 0) + 1;
    });
    const stratSummary = Object.keys(stratTotal).map(s =>
      `${s}: ${stratWins[s] || 0}W/${stratTotal[s]}T (${Math.round(((stratWins[s] || 0) / stratTotal[s]) * 100)}% WR)`
    ).join(", ") || "No strategy data yet";

    const tickerHistory = pastOnTicker.length
      ? pastOnTicker.slice(-5).map(t => {
          const pl = (t.exitPrice - t.entryPrice) * (t.shares || 1) * (t.direction === "short" ? -1 : 1);
          return `${t.date} ${t.direction?.toUpperCase()} ${pl >= 0 ? "WIN" : "LOSS"} $${pl.toFixed(0)} (emotion: ${t.emotion || "None"})`;
        }).join("\n")
      : "No past trades on this ticker";

    // Last 10 closes for the planned ticker for market bias
    let tickerPriceSummary = `${ticker} price data unavailable`;
    if (ticker) {
      try {
        const toTs = Math.floor(Date.now() / 1000);
        const fromTs = toTs - 86400 * 20; // ~20 trading days back to ensure 10 closes
        const yfRes = await fetch("/api/yf", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({ url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${fromTs}&period2=${toTs}&interval=1d` }),
        });
        const yfData = await yfRes.json();
        const result = yfData?.chart?.result?.[0];
        const timestamps = result?.timestamp;
        const closes = result?.indicators?.quote?.[0]?.close;
        if (timestamps?.length && closes?.length) {
          const closes10 = timestamps.map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
            .filter(d => d.close != null).slice(-10);
          tickerPriceSummary = closes10.map(d => `${d.date}: $${d.close.toFixed(2)}`).join(", ");
        }
      } catch (_) { /* keep default unavailable message */ }
    }
    setAiStep("ai");

    const isOptions = form.type === "options";
    const tradeDetails = isOptions
      ? [
          `- Ticker: ${ticker || "unspecified"}`,
          `- Type: Options`,
          `- Strategy: ${form.strategy}`,
          `- Direction: ${form.direction}`,
          ...(form.legs?.length ? form.legs.map((l, i) =>
            `- Leg ${i + 1}: ${l.position?.toUpperCase()} ${l.type?.toUpperCase()} | Strike: ${l.strike || "?"} | Exp: ${l.expiration || "?"} | Entry Premium: ${l.entryPremium || "?"} | Contracts: ${l.contracts || 1}`
          ) : []),
        ].join("\n")
      : [
          `- Ticker: ${ticker || "unspecified"}`,
          `- Type: ${form.type}`,
          `- Strategy: ${form.strategy}`,
          `- Direction: ${form.direction}`,
          `- Entry: ${form.currentPrice || "unspecified"}`,
          `- Stop Loss: ${form.stopLoss || "unspecified"}`,
          `- Take Profit: ${form.takeProfit || "unspecified"}`,
        ].join("\n");

    const promptText = `You are a trading coach reviewing a ${isOptions ? "options" : "stock/equity"} trade plan. Given the following context, provide ${chartImage ? "THREE" : "TWO"} sections:

${chartImage ? `1. CHART_ANALYSIS: Analyse the attached chart screenshot. Identify only what is visible — skip any indicator if it is not present on the chart:
   - Key support and resistance levels (specific price levels if visible)
   - Moving average positions (e.g. price above/below 20MA, 50MA, 200MA) and what they suggest
   - Volume: is volume confirming the move? Any notable volume spikes or divergence from price?
   - RSI: overbought (>70) / oversold (<30), or any bullish/bearish divergence visible
   - MACD: crossover direction, histogram momentum, any divergence from price
   - VWAP: is price trading above or below VWAP? What does that suggest for institutional bias?
   - Candlestick patterns at key levels: rejection wicks, engulfing candles, doji, hammer, shooting star
   - Overall trend direction and any notable risk zones
   Keep it to 4-6 concise bullet points covering only what is actually visible.
2. MARKET_BIAS` : "1. MARKET_BIAS"}: One sentence on current price trend for ${ticker} based on its recent closes (bullish/bearish/neutral and why). Be concise.
${chartImage ? "3." : "2."} PERSONAL_CHECKLIST: 2-3 bullet points of personalised warnings or confirmations for this specific trade plan based on the trader's history. Be direct and honest. ${isOptions ? "This is an options trade — do NOT mention stop loss or share-based risk. Focus on Greeks exposure, expiration timing, premium paid, and strategy-specific risks." : ""}

Planned trade:
${tradeDetails}

Past trades on ${ticker}:
${tickerHistory}

Strategy win rates (all trades):
${stratSummary}

${ticker} last 10 closes:
${tickerPriceSummary}

Respond in this exact JSON format:
{"marketBias":"...", "checklist":["...","...","..."]${chartImage ? ', "chartAnalysis":["...","...","..."]' : ""}}`;

    const messageContent = chartImage
      ? [
          { type: "image", source: { type: "base64", media_type: chartImage.mediaType, data: chartImage.base64 } },
          { type: "text", text: promptText },
        ]
      : promptText;

    const messages = [{ role: "user", content: messageContent }];

    const headers = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    const res = await fetch("/api/analyse", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: session?.user?.id, model: "claude-haiku-4-5-20251001", max_tokens: 900, messages, feature: "assist" }),
    });
    const data = await res.json();
    if (data.error) throw new Error(typeof data.error === "string" ? data.error : data.error.message);
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    setAiAssist(parsed);
    setAssistUsedToday(c => c + 1);
  } catch (e) {
    setAiError(e.message || "AI assist failed");
  }
  setAiLoading(false);
};

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
      ? ((+form.takeProfit - +form.purchasePrice) * (form.stockDirection === "long" ? 1 : -1)) /
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
      base.direction = form.stockDirection;
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
    if (aiAssist) base.aiAssist = aiAssist;
    if (chartImage) {
      const chartScreenshot = { id: `ai-chart-${base.id}`, src: `data:${chartImage.mediaType};base64,${chartImage.base64}` };
      base.screenshots = [...(base.screenshots || []).filter(s => !s.id?.startsWith("ai-chart-")), chartScreenshot];
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
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: sm ? 8 : 16, minHeight: "100vh" }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 540, maxHeight: "93vh", overflowY: "auto", padding: sm ? 14 : 24 }}>

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
    <PlanIcon size="1em" />
    {initial ? "Edit Plan" : "Plan A Trade"}
  </div>
  <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
    <CloseIcon size="1em" />
  </button>
</div>

        {/* ── Ticker / Type ── */}
        <div id="tut-plan-strategy" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
<div>
  <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TickerIcon size={14} />{typeLabels(form.type).ticker}</label>
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
      placeholder={form.type === "forex" ? "EUR/USD" : form.type === "crypto" ? "BTC/USDT" : "AAPL"}
    />
    {tickerLoading && (
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: t.text3 }}>...</span>
    )}
  </div>
</div>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><CategoryIcon size={14} />Type</label>
            <select style={inp} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
              <option value="stock">Stock</option>
              <option value="options">Options</option>
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
        </div>

        {/* ── Strategy / Direction ── */}
        <div style={{ display: "grid", gridTemplateColumns: (STOCK_LIKE.includes(form.type) || optConfig?.stockRequired) ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><StrategyIcon size={14} />Strategy</label>
            <select style={inp} value={form.strategy} onChange={(e) => handleStrategyChange(e.target.value)}>
              {(form.type === "options" ? OPTION_STRATEGY_NAMES : STOCK_STRATEGIES).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {(STOCK_LIKE.includes(form.type) || optConfig?.stockRequired) && (
            <div>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><DirectionIcon size={14} />Direction</label>
              <select style={inp} value={form.stockDirection} onChange={(e) => set("stockDirection", e.target.value)}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          )}
        </div>

        {/* ══ STOCK SECTION ══ */}
        <div id="tut-plan-details">
        {sectionHeader(form.type === "options" ? (optConfig?.stockLabel || "Underlying Stock") : typeLabels(form.type).section)}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Purchase Price */}
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><EntryPriceIcon size={14} />{form.type === "options" ? "Purchase Price" : form.type === "forex" ? "Entry Rate" : "Entry Price"}</label>
            <div style={{ position: "relative" }}>
              {form.type !== "forex" && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>}
              <input style={{ ...inp, paddingLeft: form.type === "forex" ? 14 : 26 }} type="number" value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)}
                placeholder={form.type === "forex" ? "1.0850" : form.type === "crypto" ? "43000" : "190.00"} />
            </div>
          </div>

          {/* Num Shares */}
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><AmountIcon size={14} />Num. {typeLabels(form.type).units}</label>
            <input style={inp} type="number" value={form.numShares}
              onChange={(e) => set("numShares", e.target.value)} placeholder="100" />
          </div>
        </div>

        {/* Stop Loss / Take Profit (stock-like only) */}
        {STOCK_LIKE.includes(form.type) && (
          <div id="tut-plan-risk" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><WarningIcon size={14} />Stop Loss</label>
              <div style={{ position: "relative" }}>
                {form.type !== "forex" && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>}
                <input style={{ ...inp, paddingLeft: form.type === "forex" ? 14 : 26, borderColor: form.stopLoss ? t.danger + "80" : t.inputBorder }}
                  type="number" value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)}
                  placeholder={form.type === "forex" ? "1.0820" : form.type === "crypto" ? "41000" : "185.00"} />
              </div>
            </div>
            <div>
              <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TargetIcon size={14} />Take Profit</label>
              <div style={{ position: "relative" }}>
                {form.type !== "forex" && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>}
                <input style={{ ...inp, paddingLeft: form.type === "forex" ? 14 : 26, borderColor: form.takeProfit ? t.accent + "80" : t.inputBorder }}
                  type="number" value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)}
                  placeholder={form.type === "forex" ? "1.0960" : form.type === "crypto" ? "47000" : "200.00"} />
              </div>
            </div>
          </div>
        )}

        {/* Planned R (stock-like only) */}
        {STOCK_LIKE.includes(form.type) && plannedR !== null && (
          <div style={{
            background: plannedR >= 2 ? t.positive + "15" : t.danger + "15",
            border: `1px solid ${plannedR >= 2 ? t.positive : t.danger}30`,
            borderRadius: 10, padding: "12px 16px", marginTop: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>Planned R</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: plannedR >= 2 ? t.positive : t.danger }}>
                +{plannedR.toFixed(2)}R
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>{form.type === "forex" ? "Risk/Unit" : "Risk/Share"}</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, color: t.danger }}>
                {form.type !== "forex" && "$"}{Math.abs(+form.purchasePrice - +form.stopLoss).toFixed(form.type === "forex" ? 5 : 2)}
              </div>
            </div>
          </div>
        )}

        {/* Position Size Calculator (stock-like only) */}
        {STOCK_LIKE.includes(form.type) && (() => {
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
                      Fill in Entry, Stop Loss, Account Size and Risk % to calculate
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          {/* Date */}
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TodayIcon size={14} />Date</label>
            <DateInput style={inp} t={t} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>

          {/* Current price */}
          <div>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><CurrentPriceIcon size={14} />Current Price</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
              <input style={{ ...inp, paddingLeft: 26 }} type="number" value={form.currentPrice}
                onChange={(e) => set("currentPrice", e.target.value)} placeholder="190.00" />
            </div>
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
        </div>{/* end tut-plan-details */}

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
        <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><BuySellIcon size={14} />Buy or Write</label>
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
        <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><CallOrPutIcon size={14} />Call or Put</label>
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
        <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TimeframeIcon size={14} />Expiry</label>
        <DateInput
          style={{
            ...inp,
            borderColor: leg.expiration && expiryDates.length > 0 && !expiryDates.includes(leg.expiration)
              ? t.danger + "80"
              : t.inputBorder,
          }}
          t={t}
          value={leg.expiration}
          min={todayStr()}
          onChange={(e) => {
            setLeg(i, "expiration", e.target.value);
            if (form.ticker) fetchStrikes(form.ticker, e.target.value, leg.type);
          }}
        />
      </div>

      {/* Strike — dropdown from chain with manual override */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ ...lbl, marginBottom: 0, display: "flex", alignItems: "center", gap: 4 }}><StrikeIcon size={14} />Strike Price</label>
          {strikes.length > 0 && (
            <button
              type="button"
              onClick={() => setStrikeManual(prev => ({ ...prev, [i]: !prev[i] }))}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: t.text3, fontFamily: "'Space Mono', monospace", padding: 0, textDecoration: "underline" }}
            >
              {strikeManual[i] ? "Use chain" : "Enter manually"}
            </button>
          )}
        </div>
        {strikes.length > 0 && !strikeManual[i] ? (
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
        <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><PremiumEntryIcon size={14} />Premium</label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.text3, fontSize: 14 }}>$</span>
          <input style={{ ...inp, paddingLeft: 26 }} type="number"
            value={leg.entryPremium} onChange={(e) => setLeg(i, "entryPremium", e.target.value)} placeholder="4.20" />
        </div>
      </div>

      {/* Contracts */}
      <div>
        <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><ContractsIcon size={14} />Contracts</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input style={{ ...inp, flex: 1 }} type="number"
            value={leg.contracts} onChange={(e) => setLeg(i, "contracts", e.target.value)} placeholder="1" />
          <span style={{ fontSize: 12, color: t.text3, whiteSpace: "nowrap" }}>× 100</span>
        </div>
      </div>

      {/* IV + Disclaimer */}
      <div style={{ display: "flex", gap: 10, gridColumn: "span 2" }}>
        <div style={{ flex: "0 0 80px", display: "flex", flexDirection: "column" }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><IVIcon size={14} />IV</label>
          <input style={{ ...inp, flex: 1 }} type="number"
            value={leg.iv} onChange={(e) => setLeg(i, "iv", e.target.value)} placeholder="30" />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ ...lbl, opacity: 0, pointerEvents: "none" }}>x</div>
          <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 10, color: t.text3, fontFamily: "'Space Mono', monospace", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: t.danger, flexShrink: 0 }}><WarningIcon size={12} /></span>
            <span>Previous close data.<br />Verify with broker.</span>
          </div>
        </div>
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

        {/* ══ OPTIONS P&L GRID (Price × Date) ══ */}
        {form.type === "options" && (() => {
          const validLegs = (form.legs || []).filter(l => l.strike && l.expiration && l.entryPremium);
          if (validLegs.length === 0 || !form.currentPrice) return null;
          const S = +form.currentPrice;
          const today = new Date(); today.setHours(0,0,0,0);

          // Auto step size based on price
          const rawStep = 1;
          const center = Math.round(S / rawStep) * rawStep;

          // Earliest expiration → default end date for columns
          const expDates = validLegs.map(l => new Date(l.expiration + "T00:00:00"));
          const minExpDate = expDates.reduce((a, b) => a < b ? a : b);
          const minExpDay = Math.max(0, Math.round((minExpDate - today) / 86400000));
          if (minExpDay === 0) return null;

          // Date columns — respect custom range if set
          const fromDay = gridDateFrom
            ? Math.max(0, Math.round((new Date(gridDateFrom + "T00:00:00") - today) / 86400000))
            : 0;
          const toDay = gridDateTo
            ? Math.max(fromDay + 1, Math.round((new Date(gridDateTo + "T00:00:00") - today) / 86400000))
            : minExpDay;
          const dateRange = toDay - fromDay;
          const days = [];
          for (let d = fromDay; d <= toDay; d++) days.push(d);
          const shownDays = days;
          const dateLabels = shownDays.map(d => {
            const dt = new Date(today); dt.setDate(dt.getDate() + d);
            const isExp = !gridDateTo && d === minExpDay;
            return (d === 0 && !gridDateFrom) ? "Now"
              : isExp ? "Exp"
              : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          });

          // Price rows — respect custom range if set
          const priceHigh = gridPriceMax ? +gridPriceMax : center + 6 * rawStep;
          const priceLow  = gridPriceMin ? +gridPriceMin : center - 6 * rawStep;
          const priceRange = Math.max(priceHigh - priceLow, rawStep);
          const rowStep = 1;
          const numRows = Math.min(500, Math.ceil(priceRange) + 1);
          const prices = Array.from({ length: numRows }, (_, i) => +(priceHigh - i * rowStep).toFixed(2));

          // IV delta — added to each leg's IV (e.g. -10 means IV drops 10pp)
          const ivDelta = gridIV !== "" ? +gridIV : 0;

          // Combined multi-leg P&L at a given price and days elapsed from today
          const calcTotalPL = (S_new, daysFromNow) => validLegs.reduce((sum, leg) => {
            const legExp = new Date(leg.expiration + "T00:00:00");
            const legDaysToExp = Math.max(0, Math.round((legExp - today) / 86400000));
            const T = Math.max(0, legDaysToExp - daysFromNow) / 365;
            const sigma = Math.max(0.01, ((+leg.iv || 30) + ivDelta) / 100);
            const theoretical = bsPrice(S_new, +leg.strike, T, sigma, leg.type);
            const diff = leg.position === "sell"
              ? (+leg.entryPremium - theoretical)
              : (theoretical - +leg.entryPremium);
            return sum + diff * (+leg.contracts || 1) * 100;
          }, 0);

          // Pre-compute full grid for all days (keeps color scale consistent across navigation)
          const grid = prices.map(p => shownDays.map(d => calcTotalPL(p, d)));
          const allVals = grid.flat();
          const maxGain = Math.max(...allVals, 0.01);
          const maxLoss = Math.min(...allVals, -0.01);

          // 7-day sliding column window
          const WEEK = 7;
          const safeOffset = Math.min(gridColOffset, Math.max(0, shownDays.length - WEEK));
          const winStart = safeOffset;
          const winEnd = Math.min(safeOffset + WEEK, shownDays.length);
          const canPrev = safeOffset > 0;
          const canNext = winEnd < shownDays.length;

          // Row window (13 rows visible at a time)
          const ROW_WIN = 13;
          const safeRowOffset = Math.min(gridRowOffset, Math.max(0, prices.length - ROW_WIN));
          const visiblePrices = prices.slice(safeRowOffset, safeRowOffset + ROW_WIN);
          const visibleGrid = grid.slice(safeRowOffset, safeRowOffset + ROW_WIN);
          const canScrollUp = safeRowOffset > 0;
          const canScrollDown = safeRowOffset + ROW_WIN < prices.length;

          const getCellStyle = (pl) => {
            if (pl > 0) {
              const r = pl / maxGain;
              if (r > 0.66) return { bg: "#16a34a", color: "#fff" };
              if (r > 0.33) return { bg: "#22c55e", color: "#fff" };
              return { bg: "#86efac", color: "#000" };
            }
            if (pl < 0) {
              const r = pl / maxLoss;
              if (r > 0.66) return { bg: "#ef4444", color: "#fff" };
              if (r > 0.33) return { bg: "#f87171", color: "#fff" };
              return { bg: "#fca5a5", color: "#000" };
            }
            return { bg: "#fef08a", color: "#000" };
          };

          const fmtPL = (pl) => {
            const abs = Math.abs(pl);
            const sign = pl < 0 ? "-" : "";
            return `${sign}$${abs >= 1000 ? (abs / 1000).toFixed(1) + "k" : abs.toFixed(0)}`;
          };

          const ctrlInput = { background: t.card2, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text2, fontFamily: "'Space Mono',monospace", fontSize: 11, padding: "5px 8px", outline: "none", width: "100%", boxSizing: "border-box" };
          const ctrlLabel = { fontSize: 9, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" };
          const navBtn = (enabled) => ({
            background: "transparent", border: "none", cursor: enabled ? "pointer" : "default",
            padding: "6px 4px", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: enabled ? 1 : 0.25, borderRadius: 4,
          });

          return (
            <div style={{ marginBottom: 4 }}>
              {sectionHeader("P&L Grid")}

              {/* Controls — row 1: IV + Stock Price Range */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                <div style={{ width: 76, flexShrink: 0 }}>
                  <span style={ctrlLabel}>IV Δ%</span>
                  <input
                    type="number" step="1"
                    value={gridIV}
                    onChange={e => setGridIV(e.target.value)}
                    placeholder="0"
                    style={ctrlInput}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={ctrlLabel}>Stock Price Range</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>$</span>
                    <input type="number" step="any" value={gridPriceMin}
                      onChange={e => setGridPriceMin(e.target.value)}
                      placeholder={(center - 6 * rawStep).toFixed(0)}
                      style={{ ...ctrlInput, minWidth: 0 }} />
                    <span style={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>–</span>
                    <input type="number" step="any" value={gridPriceMax}
                      onChange={e => setGridPriceMax(e.target.value)}
                      placeholder={(center + 6 * rawStep).toFixed(0)}
                      style={{ ...ctrlInput, minWidth: 0 }} />
                  </div>
                </div>
              </div>

              {/* Controls — row 2: Date Range full width */}
              <div style={{ marginBottom: 12 }}>
                <span style={ctrlLabel}>Date Range</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="date" value={gridDateFrom}
                    onChange={e => setGridDateFrom(e.target.value)}
                    style={{ ...ctrlInput, flex: 1, colorScheme: isDark ? "dark" : "light" }} />
                  <span style={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>–</span>
                  <input type="date" value={gridDateTo}
                    onChange={e => setGridDateTo(e.target.value)}
                    style={{ ...ctrlInput, flex: 1, colorScheme: isDark ? "dark" : "light" }} />
                </div>
              </div>

              {/* Week navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <button
                  onClick={() => setGridColOffset(Math.max(0, safeOffset - WEEK))}
                  disabled={!canPrev}
                  style={{
                    background: canPrev ? t.card2 : "transparent",
                    border: `1px solid ${canPrev ? t.border : "transparent"}`,
                    borderRadius: 6, padding: "4px 10px", cursor: canPrev ? "pointer" : "default",
                    display: "flex", alignItems: "center", opacity: canPrev ? 1 : 0.3,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 11L5 7l4-4" stroke={t.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textAlign: "center" }}>
                  {dateLabels[winStart]} – {dateLabels[winEnd - 1]}
                  <span style={{ color: t.text4, marginLeft: 6 }}>
                    ({winStart + 1}–{winEnd} of {shownDays.length})
                  </span>
                </span>
                <button
                  onClick={() => setGridColOffset(Math.min(shownDays.length - WEEK, safeOffset + WEEK))}
                  disabled={!canNext}
                  style={{
                    background: canNext ? t.card2 : "transparent",
                    border: `1px solid ${canNext ? t.border : "transparent"}`,
                    borderRadius: 6, padding: "4px 10px", cursor: canNext ? "pointer" : "default",
                    display: "flex", alignItems: "center", opacity: canNext ? 1 : 0.3,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke={t.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Grid: up/down arrows on left + table */}
              <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
                {/* Vertical price navigation */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 28 }}>
                  <button style={navBtn(canScrollUp)} onClick={() => setGridRowOffset(Math.max(0, safeRowOffset - 1))}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 9l4-4 4 4" stroke={t.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button style={navBtn(canScrollDown)} onClick={() => setGridRowOffset(Math.min(prices.length - ROW_WIN, safeRowOffset + 1))}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 5l4 4 4-4" stroke={t.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Table */}
                <div style={{ flex: 1, minWidth: 0, borderRadius: 8, border: `1px solid ${t.border}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono',monospace", fontSize: 10, tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "18%" }} />
                      {Array.from({ length: winEnd - winStart }, (_, i) => (
                        <col key={i} style={{ width: `${62 / (winEnd - winStart)}%` }} />
                      ))}
                      <col style={{ width: "20%" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: t.card2 }}>
                        <td style={{ padding: "5px 8px", color: t.text3, fontSize: 9, overflow: "hidden" }}>
                          {form.ticker || "Price"}
                        </td>
                        {dateLabels.slice(winStart, winEnd).map((label, i) => (
                          <td key={i} style={{
                            padding: "5px 4px", textAlign: "center", fontSize: 9,
                            color: label === "Exp" ? t.danger : t.text3,
                            fontWeight: label === "Exp" ? 700 : 400,
                            overflow: "hidden", whiteSpace: "nowrap",
                          }}>
                            {label}
                          </td>
                        ))}
                        <td style={{ padding: "5px 8px", color: t.text3, textAlign: "right", fontSize: 9, whiteSpace: "nowrap" }}>
                          +/-%
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePrices.map((price, ri) => {
                        const isCurrent = Math.abs(price - S) < 0.51;
                        const pct = (price - S) / S * 100;
                        return (
                          <tr key={ri}>
                            <td style={{
                              padding: "5px 8px", whiteSpace: "nowrap", fontSize: 10,
                              color: isCurrent ? t.accent : t.text2,
                              fontWeight: isCurrent ? 700 : 400,
                              borderLeft: isCurrent ? `3px solid ${t.accent}` : "3px solid transparent",
                              background: t.card3 || t.card2, overflow: "hidden",
                            }}>
                              {price.toFixed(2)}
                            </td>
                            {visibleGrid[ri].slice(winStart, winEnd).map((pl, ci) => {
                              const cs = getCellStyle(pl);
                              return (
                                <td key={ci} style={{
                                  padding: "5px 4px", textAlign: "center",
                                  background: cs.bg, color: cs.color,
                                  fontWeight: isCurrent ? 700 : 500,
                                  fontSize: 10, overflow: "hidden", whiteSpace: "nowrap",
                                  borderTop: isCurrent ? `1px solid ${t.accent}50` : "none",
                                  borderBottom: isCurrent ? `1px solid ${t.accent}50` : "none",
                                }}>
                                  {fmtPL(pl)}
                                </td>
                              );
                            })}
                            <td style={{
                              padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap", fontSize: 9,
                              color: pct >= 0 ? "#22c55e" : "#ef4444",
                              fontWeight: 600, background: t.card3 || t.card2,
                              borderTop: isCurrent ? `1px solid ${t.accent}50` : "none",
                              borderBottom: isCurrent ? `1px solid ${t.accent}50` : "none",
                            }}>
                              {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", marginTop: 6, lineHeight: 1.6 }}>
                {validLegs.length > 1
                  ? `Combined P/L · ${validLegs.length} legs · Black-Scholes`
                  : `P/L in $ · ${+validLegs[0].contracts || 1} contract${(+validLegs[0].contracts || 1) !== 1 ? "s" : ""} · Black-Scholes`}
              </div>
            </div>
          );
        })()}

{/* ══ PRE-TRADE CHECKLIST ══ */}
        <div id="tut-plan-checklist">
        {sectionHeader("Pre-Trade Checklist")}

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ ...lbl, marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <ChecklistIcon size={14} />{checkedCount}/{checklist.length} completed
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

        {/* Check all */}
        {!allChecked && (
          <button onClick={() => setChecklist(c => c.map(item => ({ ...item, checked: true })))}
            style={{
              width: "100%", background: t.accent + "15", border: `1px solid ${t.accent}40`,
              color: t.accent, borderRadius: 8, padding: "8px 12px", cursor: "pointer",
              fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 10,
            }}>
            Check All
          </button>
        )}

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
        </div>{/* end tut-plan-checklist */}
{/* ══ EMOTION ══ */}
        {sectionHeader("Mindset", "tut-plan-mindset")}
        <div id="tut-plan-emotion" style={{ marginBottom: 14 }}>
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
        {sectionHeader("Notes", "tut-plan-notes")}
        <div id="tut-plan-tags" style={{ marginBottom: 12 }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><TagsIcon size={14} />Tags</label>
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
        <div id="tut-plan-media">
          <div style={{ marginBottom: 12 }}>
            <VoiceNote value={form.voiceNote} onChange={(v) => set("voiceNote", v)} t={t} />
          </div>
        </div>

        <div id="tut-plan-notes-text" style={{ marginBottom: 20 }}>
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 4 }}><PenIcon size={14} />Trade Thesis</label>
          <textarea style={{ ...inp, height: 76, resize: "none" }} value={form.notes}
            onChange={(e) => set("notes", e.target.value)} placeholder="Why are you taking this trade? What's your edge?" />
        </div>

        {/* AI Assist */}
        {(isProPlus || isPro) && (
          <div id="tut-plan-ai-assist" style={{ marginBottom: 16 }}>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <RobotIcon size={14} />AI Analysis
            </label>
            {!isProPlus ? (
              <button
                onClick={onUpgrade}
                style={{
                  width: "100%", padding: "14px", borderRadius: 8, cursor: "pointer",
                  background: "#f59e0b08", border: "1px dashed #f59e0b40", color: "#f59e0b",
                  fontSize: 13, fontFamily: "'Space Mono',monospace", textAlign: "center",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}
              >
                <div>✦ PRO+ Feature</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Upgrade to unlock AI trade analysis</div>
              </button>
            ) : (
              <button
                onClick={fetchAiAssist}
                disabled={aiLoading}
                style={{
                  width: "100%", padding: "14px", borderRadius: 8, cursor: aiLoading ? "not-allowed" : "pointer",
                  background: t.accent + "08", border: `1px dashed ${t.accent}40`, color: t.accent,
                  fontSize: 13, fontFamily: "'Space Mono',monospace", textAlign: "center",
                  opacity: aiLoading ? 0.6 : 1, marginBottom: 8,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}
              >
                <div>{aiLoading ? (aiStep === "price" ? "Fetching prices..." : "Analysing...") : "Generate"}</div>
                <div style={{ fontSize: 11, color: assistUsedToday >= ASSIST_DAILY_LIMIT ? t.danger : t.text3, opacity: 0.8 }}>
                  {assistUsedToday} / {ASSIST_DAILY_LIMIT} uses today
                </div>
              </button>
            )}
            {/* Chart upload */}
            <input
              ref={chartFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try { setChartImage(await compressChartImage(file)); } catch { setAiError("Could not load image."); }
              }}
            />
            {chartImage ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px" }}>
                <img src={chartImage.previewUrl} alt="Chart" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 11, color: t.text3 }}>Chart attached — AI will analyse S/R, MAs, Volume, RSI, MACD, VWAP & patterns</div>
                <button onClick={() => setChartImage(null)} style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            ) : (
              <button
                onClick={() => chartFileRef.current?.click()}
                style={{ width: "100%", background: "none", border: `1px dashed ${t.border}`, borderRadius: 7, padding: "8px 12px", cursor: "pointer", color: t.text3, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 8, textAlign: "center" }}
              >
                + Attach chart (optional — S/R, MAs, Volume, RSI, MACD, VWAP & patterns)
              </button>
            )}

            {aiError && (
              <div style={{ fontSize: 11, color: t.danger, marginBottom: 8 }}>{aiError}</div>
            )}
            {aiAssist && (
              <div style={{ marginTop: 10, background: t.surface, border: `1px solid ${t.accent}30`, borderRadius: 10, padding: "14px 16px" }}>
                {aiAssist.chartAnalysis?.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Chart Analysis</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                      {aiAssist.chartAnalysis.map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: t.text2, lineHeight: 1.5, paddingLeft: 12, borderLeft: `2px solid ${t.accent}80` }}>{item}</div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Market Bias</div>
                <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.6, marginBottom: 12 }}>{aiAssist.marketBias}</div>
                <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Personal Checklist</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {aiAssist.checklist?.map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: t.text2, lineHeight: 1.5, paddingLeft: 12, borderLeft: `2px solid ${t.accent}50` }}>{item}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Incomplete checklist confirmation modal */}
        {showIncompleteModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, maxWidth: 340, width: "100%" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>Checklist Incomplete</div>
              <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6, marginBottom: 20 }}>
                {checklist.length - checkedCount} item{checklist.length - checkedCount !== 1 ? "s" : ""} still unchecked. Save the plan anyway?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowIncompleteModal(false)} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "10px 0", cursor: "pointer", fontSize: 13 }}>Go Back</button>
                <button onClick={() => { setShowIncompleteModal(false); save(); }} style={{ flex: 1, background: "#f59e0b", border: "none", color: "#000", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>Save Anyway</button>
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
       <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => trigger(onClose)} style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 12, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={() => {
            if (!allChecked && canSave) { setShowIncompleteModal(true); return; }
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
