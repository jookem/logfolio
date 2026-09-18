// Options Bullish / Bearish scan: finds liquid stocks with early momentum in
// their options (fresh positioning, urgency, cheap volatility, squeeze breakout).
// Bullish looks at calls and an upside break, bearish at puts and a downside break.
//
// The math helpers are pure. The fetch helpers take a `yf(url)` function that
// returns parsed Yahoo Finance JSON (or null), so the caller owns cookies,
// crumbs and rate limiting.
//
// Data notes (what each spec item maps to):
//  - Sweeps: there is no trade tape on the data plan, so "sweep" is approximated
//    by a contract whose last trade printed at or near the ask.
//  - IV rank: no implied-vol history is available, so a 1-year percentile of
//    20-day historical volatility is used as the volatility-compression proxy.
//  - Relative volume: computed per contract (today vs its own prior sessions).

export const OPTIONS_PARTY_RULES = Object.freeze({
  minPrice: 10,
  minAvgVolume: 1_000_000,
  maxSpread: 0.05,             // (ask - bid) / ask
  minContractVolume: 100,      // ignore tiny prints where 5 > 2 proves nothing
  minRelVolume: 3.0,
  askZone: 0.9,                // last >= bid + 90% of the spread counts as "at the ask"
  dteMin: 30,
  dteMax: 45,
  dteTarget: 37,
  maxIvPercentile: 30,
  direction: "bullish",         // "bullish": calls, break above the 20-day SMA; "bearish": puts, break below
  squeezeLookback: 3,          // squeeze released within this many bars counts as fired
  contractsToCheck: 3,         // flagged contracts per ticker that get a history lookup
  maxTickers: 15,              // tickers whose chains are fetched per scan
  maxResults: 15,
  volOiCap: 10,                // score inputs are capped so one outlier can't dominate
  relVolCap: 10,
});

const DAY_MS = 86_400_000;

/** Finite number or null. */
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── Filter 1: liquidity ──────────────────────────────────────────────────────

/** Common stock above the price and average-volume floors. */
export function passesLiquidity(q, rules = OPTIONS_PARTY_RULES) {
  if (!q || q.quoteType !== "EQUITY" || !/^[A-Z]{1,5}$/.test(q.symbol || "")) return false;
  const price = num(q.regularMarketPrice);
  const avg = num(q.averageDailyVolume3Month) ?? num(q.averageDailyVolume10Day);
  return price != null && price > rules.minPrice && avg != null && avg > rules.minAvgVolume;
}

/** Expiration (epoch seconds) inside the DTE window, closest to the target. */
export function pickExpiration(expirations, nowMs = Date.now(), rules = OPTIONS_PARTY_RULES) {
  if (!Array.isArray(expirations)) return null;
  let best = null, bestGap = Infinity;
  for (const e of expirations) {
    if (!num(e)) continue;
    const dte = (e * 1000 - nowMs) / DAY_MS;
    if (dte < rules.dteMin || dte > rules.dteMax) continue;
    const gap = Math.abs(dte - rules.dteTarget);
    if (gap < bestGap) { best = e; bestGap = gap; }
  }
  return best;
}

// ── Filter 2: flow urgency ───────────────────────────────────────────────────

/**
 * Contracts with Vol > OI, tight spread and last trade at the ask.
 * @param {Array} contracts Yahoo option rows
 * @param {"call"|"put"} side
 */
export function flagContracts(contracts, side, rules = OPTIONS_PARTY_RULES) {
  if (!Array.isArray(contracts)) return [];
  const out = [];
  for (const c of contracts) {
    const volume = num(c?.volume), oi = num(c?.openInterest);
    const bid = num(c?.bid), ask = num(c?.ask), last = num(c?.lastPrice);
    const strike = num(c?.strike), exp = num(c?.expiration);
    if (!c?.contractSymbol || volume == null || oi == null || bid == null || ask == null || last == null || strike == null || exp == null) continue;
    if (volume < rules.minContractVolume || !(volume > oi)) continue;
    if (!(ask > 0) || !(bid > 0) || (ask - bid) / ask >= rules.maxSpread) continue;
    if (last < bid + rules.askZone * (ask - bid)) continue;
    out.push({
      symbol: c.contractSymbol, side, strike, expiration: exp,
      last, bid, ask, volume, openInterest: oi,
      volOi: volume / Math.max(oi, 1),
      iv: num(c.impliedVolatility),
    });
  }
  return out;
}

/** Today's volume over the average of the prior sessions (missing = no data). */
export function relativeVolume(todayVolume, priorVolumes) {
  if (!Array.isArray(priorVolumes) || todayVolume == null) return null;
  const prior = priorVolumes.slice(-20).map(v => num(v) ?? 0);
  if (prior.length === 0) return null;
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  return avg > 0 ? todayVolume / avg : null;
}

// ── Filter 3: volatility and squeeze ─────────────────────────────────────────

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

/**
 * TTM squeeze on daily bars: Bollinger (20, 2 sd) fully inside Keltner
 * (20 SMA, 1.5 x 20-period ATR).
 * @param {{high:number, low:number, close:number}[]} bars oldest first
 * @returns {{on:boolean, fired:boolean, price:number, sma:number}|null}
 */
export function ttmSqueeze(bars, rules = OPTIONS_PARTY_RULES, period = 20) {
  if (!Array.isArray(bars) || bars.length < period + rules.squeezeLookback + 1) return null;
  const closes = bars.map(b => b.close);
  const tr = bars.map((b, i) => i === 0 ? b.high - b.low
    : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close)));
  const flags = [];
  let sma = null;
  for (let i = period - 1; i < bars.length; i++) {
    const win = closes.slice(i - period + 1, i + 1);
    const m = mean(win), sd = stdev(win), atr = mean(tr.slice(i - period + 1, i + 1));
    flags.push(m + 2 * sd < m + 1.5 * atr && m - 2 * sd > m - 1.5 * atr);
    sma = m;
  }
  const on = flags[flags.length - 1];
  const recent = flags.slice(-1 - rules.squeezeLookback, -1);
  return { on, fired: !on && recent.some(Boolean), price: closes[closes.length - 1], sma };
}

/** Percentile (0-100) of the latest 20-day historical volatility within its own 1-year history. */
export function hvPercentile(closes, period = 20) {
  if (!Array.isArray(closes) || closes.length < period + 60) return null;
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const hv = [];
  for (let i = period; i <= rets.length; i++) hv.push(stdev(rets.slice(i - period, i)) * Math.sqrt(252));
  const last = hv[hv.length - 1];
  if (!Number.isFinite(last)) return null;
  return (hv.filter(v => v <= last).length / hv.length) * 100;
}

/** Weighted urgency score on a 0-10 scale. */
export function momentumScore({ volOi, relVol, ivPercentile }, rules = OPTIONS_PARTY_RULES) {
  const a = Math.min(volOi, rules.volOiCap);
  const b = Math.min(relVol, rules.relVolCap);
  const c = (100 - ivPercentile) / 10;
  return +(a * 0.5 + b * 0.3 + c * 0.2).toFixed(2);
}

// ── Fetching ─────────────────────────────────────────────────────────────────

const CHAIN_URL = "https://query2.finance.yahoo.com/v7/finance/options/";
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

async function fetchExpirations(yf, symbol) {
  const j = await yf(`${CHAIN_URL}${symbol}`);
  const r = j?.optionChain?.result?.[0];
  return { expirations: r?.expirationDates ?? [], price: num(r?.quote?.regularMarketPrice) };
}

async function fetchChain(yf, symbol, expiration) {
  const j = await yf(`${CHAIN_URL}${symbol}?date=${expiration}`);
  const o = j?.optionChain?.result?.[0]?.options?.[0];
  return { calls: o?.calls ?? [], puts: o?.puts ?? [] };
}

async function fetchDailyBars(yf, symbol) {
  const j = await yf(`${CHART_URL}${symbol}?interval=1d&range=1y`);
  const r = j?.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp || !q) return [];
  const bars = [];
  r.timestamp.forEach((_, i) => {
    const high = num(q.high?.[i]), low = num(q.low?.[i]), close = num(q.close?.[i]);
    if (high != null && low != null && close != null) bars.push({ high, low, close });
  });
  return bars;
}

/** Daily volumes for one contract, last element is today's session. */
async function fetchContractVolumes(yf, contractSymbol) {
  const j = await yf(`${CHART_URL}${contractSymbol}?interval=1d&range=2mo`);
  const v = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume;
  return Array.isArray(v) ? v.map(x => num(x) ?? 0) : null;
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { results[i] = await fn(items[i]); } catch { results[i] = null; }
    }
  }));
  return results;
}

// ── Orchestration ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OptionsPick
 * @property {string} ticker
 * @property {number} price
 * @property {{symbol:string,type:"call"|"put",strike:number,expiration:string,dte:number,last:number,bid:number,ask:number,volume:number,openInterest:number}} contract
 * @property {number} volOi
 * @property {number} relVol
 * @property {number} ivPercentile
 * @property {"fired"|"coiled"} squeeze
 * @property {number} score
 * @property {"BULLISH"|"BEARISH"} direction
 */

/**
 * Screens a list of raw stock quotes and returns options picks, best score first.
 * @param {(url:string)=>Promise<any>} yf
 * @param {Array} quotes raw Yahoo screener quotes
 */
export async function scanOptionsPartyStarters(yf, quotes, overrides = {}, nowMs = Date.now()) {
  const rules = { ...OPTIONS_PARTY_RULES, ...overrides };
  const bearish = rules.direction === "bearish";
  const side = bearish ? "put" : "call";
  const funnel = { universe: 0, liquid: 0, optionable: 0, flow: 0, volatility: 0, final: 0 };
  const seen = new Set();
  const universe = (Array.isArray(quotes) ? quotes : []).filter(q => q?.symbol && !seen.has(q.symbol) && seen.add(q.symbol));
  funnel.universe = universe.length;

  const liquid = universe.filter(q => passesLiquidity(q, rules))
    .sort((a, b) => (num(b.regularMarketVolume) ?? 0) - (num(a.regularMarketVolume) ?? 0))
    .slice(0, rules.maxTickers);
  funnel.liquid = liquid.length;

  // Filters 1b + 2: optionable, then flow urgency on the target expiration.
  const flowed = (await pool(liquid, 5, async (q) => {
    const { expirations, price } = await fetchExpirations(yf, q.symbol);
    if (!expirations.length) return null;
    funnel.optionable++;
    const exp = pickExpiration(expirations, nowMs, rules);
    if (!exp) return null;
    const chain = await fetchChain(yf, q.symbol, exp);
    const flagged = (bearish ? flagContracts(chain.puts, "put", rules) : flagContracts(chain.calls, "call", rules))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, rules.contractsToCheck);
    if (!flagged.length) return null;

    const checked = await Promise.all(flagged.map(async (c) => {
      const vols = await fetchContractVolumes(yf, c.symbol);
      if (!vols || vols.length < 2) return null;
      const relVol = relativeVolume(c.volume, vols.slice(0, -1));
      return relVol != null && relVol >= rules.minRelVolume ? { ...c, relVol } : null;
    }));
    const passing = checked.filter(Boolean);
    if (!passing.length) return null;
    funnel.flow++;
    return { q, price: price ?? num(q.regularMarketPrice), exp, passing };
  })).filter(Boolean);

  // Filter 3: volatility compression and squeeze.
  const picks = (await pool(flowed, 5, async ({ q, price, exp, passing }) => {
    const bars = await fetchDailyBars(yf, q.symbol);
    const ivPercentile = hvPercentile(bars.map(b => b.close));
    if (ivPercentile == null || ivPercentile >= rules.maxIvPercentile) return null;
    const sq = ttmSqueeze(bars, rules);
    if (!sq || !(sq.on || sq.fired)) return null;

    // A fired squeeze must break the same way as the scan direction.
    if (sq.fired && (bearish ? !(sq.price < sq.sma) : !(sq.price > sq.sma))) return null;
    funnel.volatility++;

    const target = [...passing].sort((a, b) => b.volume - a.volume)[0];
    return {
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price,
      contract: {
        symbol: target.symbol, type: side, strike: target.strike,
        expiration: new Date(exp * 1000).toISOString().slice(0, 10),
        dte: Math.round((exp * 1000 - nowMs) / DAY_MS),
        last: target.last, bid: target.bid, ask: target.ask,
        volume: target.volume, openInterest: target.openInterest,
      },
      volOi: +target.volOi.toFixed(2),
      relVol: +target.relVol.toFixed(2),
      ivPercentile: +ivPercentile.toFixed(1),
      squeeze: sq.fired ? "fired" : "coiled",
      score: momentumScore({ volOi: target.volOi, relVol: target.relVol, ivPercentile }, rules),
      direction: bearish ? "BEARISH" : "BULLISH",
    };
  })).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, rules.maxResults);

  funnel.final = picks.length;
  return { picks, funnel };
}
