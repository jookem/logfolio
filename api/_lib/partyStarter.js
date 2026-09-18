// Party Starter stock picker: pure filtering logic, no I/O.
//
// Takes a raw list of quote objects (Yahoo Finance screener shape) and applies
// the rules below in order, cheapest checks first. Any quote with a missing or
// non-numeric field is dropped instead of throwing.

/**
 * @typedef {Object} RawQuote            Loose input shape from the market API.
 * @property {string} [symbol]
 * @property {string} [quoteType]                 "EQUITY" | "ETF" | "MUTUALFUND" | ...
 * @property {string} [typeDisp]
 * @property {string} [shortName]
 * @property {string} [longName]
 * @property {number|null} [regularMarketPrice]
 * @property {number|null} [regularMarketOpen]
 * @property {number|null} [regularMarketVolume]
 * @property {number|null} [averageDailyVolume3Month]
 * @property {number|null} [averageDailyVolume10Day]
 * @property {number|null} [marketCap]
 * @property {number|null} [regularMarketChangePercent]
 * @property {string} [fullExchangeName]
 */

/**
 * @typedef {Object} PartyStarterPick
 * @property {string} symbol
 * @property {string} name
 * @property {string} exchange
 * @property {number} price
 * @property {number} open
 * @property {number} changePct         Percent change vs. open.
 * @property {number} volume
 * @property {number} avgVolume
 * @property {number} relVolume         volume / avgVolume.
 * @property {number} marketCap
 */

export const PARTY_STARTER_RULES = Object.freeze({
  minAvgVolume: 100_000,        // strictly greater than
  minMarketCap: 300_000_000,    // greater than or equal to
  minRelVolume: 2.0,            // at least 2x average
  maxResults: 20,
});

const ADR_NAME = /\b(ADR|ADS|American Depositar(y|ies))\b/i;

/** Returns the value only if it is a finite number, otherwise null. */
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Common stock only: Yahoo "EQUITY" quote type, minus depositary receipts. */
export function isCommonStock(q) {
  if (!q || q.quoteType !== "EQUITY") return false;
  const name = `${q.longName ?? ""} ${q.shortName ?? ""}`;
  return !ADR_NAME.test(name);
}

/**
 * Normalizes a raw quote into a pick, or null when a required field is
 * missing. Average volume prefers the 3-month figure and falls back to
 * the 10-day one, since Yahoo has no 30-day field.
 * @param {RawQuote} q
 * @returns {PartyStarterPick|null}
 */
function toPick(q) {
  const price = num(q.regularMarketPrice);
  const open = num(q.regularMarketOpen);
  const volume = num(q.regularMarketVolume);
  const avgVolume = num(q.averageDailyVolume3Month) ?? num(q.averageDailyVolume10Day);
  const marketCap = num(q.marketCap);
  if (!q.symbol || price == null || open == null || volume == null || avgVolume == null || marketCap == null) return null;
  if (open <= 0 || avgVolume <= 0) return null;
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    exchange: q.fullExchangeName || "",
    price,
    open,
    changePct: ((price - open) / open) * 100,
    volume,
    avgVolume,
    relVolume: volume / avgVolume,
    marketCap,
  };
}

/**
 * Filters raw quotes down to Party Starter candidates.
 *
 * Rules, applied in order:
 *  1. Common stock (no ETFs, mutual funds, ADRs)
 *  2. Average daily volume > 100,000
 *  3. Market cap >= $300M
 *  4. Price > open
 *  5. Volume >= 2x average daily volume
 * Then sorted by current volume (descending) and capped at 20.
 *
 * @param {RawQuote[]|null|undefined} quotes
 * @param {Partial<typeof PARTY_STARTER_RULES>} [overrides]
 * @returns {PartyStarterPick[]}
 */
export function filterPartyStarters(quotes, overrides = {}) {
  if (!Array.isArray(quotes)) return [];
  const rules = { ...PARTY_STARTER_RULES, ...overrides };
  const seen = new Set();
  const picks = [];

  for (const q of quotes) {
    if (!isCommonStock(q)) continue;
    const pick = toPick(q);
    if (!pick || seen.has(pick.symbol)) continue;
    if (!(pick.avgVolume > rules.minAvgVolume)) continue;
    if (!(pick.marketCap >= rules.minMarketCap)) continue;
    if (!(pick.price > pick.open)) continue;
    if (!(pick.volume >= pick.avgVolume * rules.minRelVolume)) continue;
    seen.add(pick.symbol);
    picks.push(pick);
  }

  picks.sort((a, b) => b.volume - a.volume);
  return picks.slice(0, rules.maxResults);
}

const SCREENER_IDS = ["most_actives", "day_gainers", "small_cap_gainers"];
const SCREENER_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved";

/**
 * Fetches raw quotes from Yahoo's predefined screeners and merges them.
 * A failing screener is skipped so one bad list doesn't sink the request.
 * @param {Record<string,string>} headers  Request headers for Yahoo.
 * @returns {Promise<RawQuote[]>}
 */
export async function fetchScreenerQuotes(headers) {
  const lists = await Promise.all(SCREENER_IDS.map(async (id) => {
    try {
      const res = await fetch(`${SCREENER_URL}?formatted=false&count=250&scrIds=${id}`, { headers });
      if (!res.ok) return [];
      const json = await res.json();
      const quotes = json?.finance?.result?.[0]?.quotes;
      return Array.isArray(quotes) ? quotes : [];
    } catch {
      return [];
    }
  }));
  return lists.flat();
}
