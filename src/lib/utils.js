import { STOCK_LIKE, STORAGE_KEY, THEME_KEY } from "./constants";

// Module-level preferences — updated by App.jsx via setters below
let _currency = "USD";
let _timezone = undefined;

export const setCurrency = (c) => { _currency = c || "USD"; };
export const setTimezone = (tz) => { _timezone = tz || undefined; };

export const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: _currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export const fmtDate = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(_timezone ? { timeZone: _timezone } : {}),
  });

export const todayStr = () => {
  const t = new Date();
  if (_timezone) return t.toLocaleDateString("en-CA", { timeZone: _timezone });
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export function calcPL(trade) {
  if (STOCK_LIKE.includes(trade.type)) {
    const dir = trade.direction === "long" ? 1 : -1;
    return dir * (trade.exitPrice - trade.entryPrice) * trade.shares;
  }
  return (trade.legs || []).reduce((sum, l) => {
    const dir = l.position === "buy" ? 1 : -1;
    return sum + dir * (l.exitPremium - l.entryPremium) * l.contracts * 100;
  }, 0);
}

export function calcR(trade) {
  if (STOCK_LIKE.includes(trade.type)) {
    if (!trade.stopLoss || !trade.entryPrice) return null;
    const risk = Math.abs(trade.entryPrice - trade.stopLoss);
    if (risk === 0) return null;
    const pl = (trade.exitPrice - trade.entryPrice) * (trade.direction === "long" ? 1 : -1);
    return pl / risk;
  }
  // Options: risk = total premium paid on long legs (max loss on debit trades)
  const legs = trade.legs || [];
  const totalRisk = legs
    .filter(l => l.position === "buy")
    .reduce((s, l) => s + l.entryPremium * (l.contracts || 1) * 100, 0);
  if (totalRisk === 0) return null;
  return calcPL(trade) / totalRisk;
}

export function typeLabels(type) {
  if (type === "forex")  return { ticker: "Pair",   units: "Units",  section: "Forex Details" };
  if (type === "crypto") return { ticker: "Symbol", units: "Amount", section: "Crypto Details" };
  return { ticker: "Ticker Symbol", units: "Shares", section: "Stock Details" };
}

export function fmtR(r) {
  if (r === null || r === undefined) return null;
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

export function loadTrades() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return null;
}

export function saveTrades(t) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {}
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {}
  return "dark";
}

export function exportCSV(trades) {
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

export function exportJSON(trades) {
  const json = JSON.stringify(trades, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `logfolio-trades-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function normCDF(x) {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t2 = 1 / (1 + p * ax);
  const poly = ((((a[4]*t2 + a[3])*t2 + a[2])*t2 + a[1])*t2 + a[0]) * t2;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-ax * ax)));
}

export function bsPrice(S, K, T, sigma, type) {
  if (T <= 0) return type === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
  const r = 0.045;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return type === "call"
    ? S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2)
    : K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}
