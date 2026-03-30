export const STOCK_LIKE = ["stock", "forex", "crypto"];

// Shared options strategy definitions used by both Log a Trade and Plan a Trade.
// legs: template of { position: "buy"|"sell", type: "call"|"put" } — components fill in blank fields.
// writeLocked: true means leg count/structure is fixed by the strategy.
// stockLabel / showStock: Plan a Trade only — for tracking an accompanying stock position.
export const OPTION_STRATEGIES = {
  "Long Call":        { legs: [{ position: "buy",  type: "call" }], writeLocked: true, showStock: true,  stockLabel: "Underlying Stock (optional)" },
  "Long Put":         { legs: [{ position: "buy",  type: "put"  }], writeLocked: true, showStock: true,  stockLabel: "Underlying Stock (optional)" },
  "Covered Call":     { legs: [{ position: "sell", type: "call" }], writeLocked: true, showStock: true,  stockLabel: "Stock Purchase", stockRequired: true },
  "Cash Secured Put": { legs: [{ position: "sell", type: "put"  }], writeLocked: true, showStock: true,  stockLabel: "Cash Secured (Collateral)" },
  "Naked Call":       { legs: [{ position: "sell", type: "call" }], writeLocked: true, showStock: false },
  "Naked Put":        { legs: [{ position: "sell", type: "put"  }], writeLocked: true, showStock: false },
  "Bull Call Spread": { legs: [{ position: "buy",  type: "call" }, { position: "sell", type: "call" }], writeLocked: true, showStock: false },
  "Bear Put Spread":  { legs: [{ position: "buy",  type: "put"  }, { position: "sell", type: "put"  }], writeLocked: true, showStock: false },
  "Straddle":         { legs: [{ position: "buy",  type: "call" }, { position: "buy",  type: "put"  }], writeLocked: true, showStock: false },
  "Strangle":         { legs: [{ position: "buy",  type: "call" }, { position: "buy",  type: "put"  }], writeLocked: true, showStock: false },
  "Iron Condor":      { legs: [{ position: "sell", type: "put"  }, { position: "buy",  type: "put"  }, { position: "sell", type: "call" }, { position: "buy", type: "call" }], writeLocked: true, showStock: false },
  "Butterfly":        { legs: [{ position: "buy",  type: "call" }, { position: "sell", type: "call" }, { position: "sell", type: "call" }, { position: "buy", type: "call" }], writeLocked: true, showStock: false },
  "Calendar Spread":  { legs: [{ position: "sell", type: "call" }, { position: "buy",  type: "call" }], writeLocked: true, showStock: false },
};

export const STRATEGIES = [
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

export const EMOTIONS = [
  "None",
  "Calm",
  "Confident",
  "Focused",
  "Disciplined",
  "Anxious",
  "Fearful",
  "FOMO",
  "Revenge",
  "Overconfident",
];

export const MISTAKES = [
  "None",
  "FOMO Entry",
  "Chased Entry",
  "Early Exit",
  "Revenge Trade",
  "Broke Stop Loss",
  "Moved Stop",
  "Overtrading",
  "No Plan",
  "Sized Too Large",
  "Held Too Long",
];

export const SUGGESTED_TAGS = [
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

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "Daily", "Weekly"];

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen" },
  { code: "CAD", symbol: "C$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "CHF", symbol: "Fr", label: "CHF — Swiss Franc" },
  { code: "HKD", symbol: "HK$", label: "HKD — Hong Kong Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD — Singapore Dollar" },
  { code: "NZD", symbol: "NZ$", label: "NZD — New Zealand Dollar" },
];

export const TIMEZONES = [
  { value: "America/New_York",    label: "New York (ET)" },
  { value: "America/Chicago",     label: "Chicago (CT)" },
  { value: "America/Denver",      label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "America/Toronto",     label: "Toronto (ET)" },
  { value: "America/Vancouver",   label: "Vancouver (PT)" },
  { value: "America/Sao_Paulo",   label: "São Paulo (BRT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "Europe/Paris",        label: "Paris (CET)" },
  { value: "Europe/Berlin",       label: "Berlin (CET)" },
  { value: "Europe/Zurich",       label: "Zurich (CET)" },
  { value: "Asia/Dubai",          label: "Dubai (GST)" },
  { value: "Asia/Singapore",      label: "Singapore (SGT)" },
  { value: "Asia/Hong_Kong",      label: "Hong Kong (HKT)" },
  { value: "Asia/Tokyo",          label: "Tokyo (JST)" },
  { value: "Asia/Shanghai",       label: "Shanghai (CST)" },
  { value: "Australia/Sydney",    label: "Sydney (AEST)" },
];

export const STORAGE_KEY = "tradelog_trades";
export const THEME_KEY = "tradelog_theme";
export const ONBOARDING_KEY = "logfolio-onboarded";

export const SEED_TRADES = [
  { id: 1001, date: "2026-01-06", exitDate: "2026-01-08", entryTime: "09:42", exitTime: "15:55", ticker: "AAPL", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 228.50, exitPrice: 234.20, stopLoss: 225.00, takeProfit: 236.00, shares: 50, emotion: "Confident", mistake: "None", notes: "Clean breakout above 228 resistance with volume confirmation.", tags: ["tech", "breakout"], status: "closed" },
  { id: 1002, date: "2026-01-09", exitDate: "2026-01-09", entryTime: "09:48", exitTime: "11:32", ticker: "TSLA", type: "stock", strategy: "Pullback", direction: "long", entryPrice: 398, exitPrice: 381, stopLoss: 390, takeProfit: 420, shares: 20, emotion: "FOMO", mistake: "Chased Entry", notes: "Didn't wait for the pullback level — entered into strength.", tags: ["momentum", "ev"], status: "closed" },
  { id: 1003, date: "2026-01-13", exitDate: "2026-01-15", entryTime: "10:05", exitTime: "14:20", ticker: "SPY", type: "stock", strategy: "Trend Follow", direction: "long", entryPrice: 585, exitPrice: 591, stopLoss: 581, takeProfit: 594, shares: 30, emotion: "Calm", mistake: "None", notes: "Trend continuation on the daily. Held through a small dip.", tags: ["index"], status: "closed" },
  { id: 1004, date: "2026-01-16", exitDate: "2026-01-17", entryTime: "09:55", exitTime: "11:40", ticker: "NVDA", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 142, exitPrice: 148.50, stopLoss: 138.50, takeProfit: 150.00, shares: 40, emotion: "Confident", mistake: "None", notes: "AI narrative + volume breakout out of two-week consolidation.", tags: ["tech", "ai"], status: "closed" },
  { id: 1005, date: "2026-01-21", exitDate: "2026-01-21", entryTime: "10:15", exitTime: "11:10", ticker: "AMZN", type: "stock", strategy: "Scalp", direction: "long", entryPrice: 222, exitPrice: 219.50, stopLoss: 219.00, takeProfit: 227.00, shares: 25, emotion: "Anxious", mistake: "Early Exit", notes: "Panicked out at support. Price recovered to 226 an hour later.", tags: ["tech"], status: "closed" },
  { id: 1006, date: "2026-01-23", exitDate: "2026-01-27", entryTime: "10:30", exitTime: "15:45", ticker: "AAPL", type: "stock", strategy: "Pullback", direction: "long", entryPrice: 222, exitPrice: 229, stopLoss: 218.50, takeProfit: 230.00, shares: 60, emotion: "Calm", mistake: "None", notes: "Textbook pullback to 20 EMA, clean risk/reward setup.", tags: ["tech", "swing"], status: "closed" },
  { id: 1007, date: "2026-01-28", exitDate: "2026-01-28", entryTime: "09:35", exitTime: "14:47", ticker: "META", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 612, exitPrice: 628, stopLoss: 605, takeProfit: 632, shares: 10, emotion: "Confident", mistake: "None", notes: "Pre-earnings momentum breakout, took partial profits early.", tags: ["tech", "earnings"], status: "closed" },
  { id: 1008, date: "2026-01-30", exitDate: "2026-01-30", entryTime: "10:32", exitTime: "13:18", ticker: "SPY", type: "stock", strategy: "Reversal", direction: "short", entryPrice: 597, exitPrice: 589, stopLoss: 600.50, takeProfit: 588.00, shares: 20, emotion: "Calm", mistake: "None", notes: "Bearish reversal candle at resistance. Tight stop above HOD.", tags: ["index", "short"], status: "closed" },
  { id: 1009, date: "2026-02-04", exitDate: "2026-02-04", entryTime: "09:31", exitTime: "10:48", ticker: "TSLA", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 365, exitPrice: 382, stopLoss: 358, takeProfit: 385, shares: 30, emotion: "Confident", mistake: "None", notes: "Volume breakout, caught the morning momentum perfectly.", tags: ["momentum", "ev"], status: "closed" },
  { id: 1010, date: "2026-02-06", exitDate: "2026-02-06", entryTime: "10:00", exitTime: "15:28", ticker: "NVDA", type: "stock", strategy: "Pullback", direction: "long", entryPrice: 128, exitPrice: 121, stopLoss: 124, takeProfit: 136, shares: 50, emotion: "Fearful", mistake: "Moved Stop", notes: "Moved stop loss wider — took a much bigger loss than planned.", tags: ["tech"], status: "closed" },
  { id: 1011, date: "2026-02-12", exitDate: "2026-02-13", entryTime: "10:20", exitTime: "11:05", ticker: "GOOGL", type: "stock", strategy: "Trend Follow", direction: "long", entryPrice: 195, exitPrice: 201.50, stopLoss: 191.50, takeProfit: 203.00, shares: 35, emotion: "Calm", mistake: "None", notes: "Riding the uptrend on the daily chart. Clean entry on a doji.", tags: ["tech", "ai"], status: "closed" },
  { id: 1012, date: "2026-02-19", exitDate: "2026-02-19", entryTime: "09:30", exitTime: "10:12", ticker: "AAPL", type: "stock", strategy: "Scalp", direction: "long", entryPrice: 226, exitPrice: 228.80, stopLoss: 224.50, takeProfit: 229.50, shares: 100, emotion: "Focused", mistake: "None", notes: "Quick intraday scalp on the open — in and out in 40 minutes.", tags: ["scalp", "tech"], status: "closed" },
  { id: 1013, date: "2026-02-26", exitDate: "2026-02-27", entryTime: "10:45", exitTime: "14:30", ticker: "MSFT", type: "stock", strategy: "Pullback", direction: "long", entryPrice: 388, exitPrice: 395.50, stopLoss: 383.50, takeProfit: 397.00, shares: 25, emotion: "Calm", mistake: "None", notes: "AI narrative driving tech. Pulled back to VWAP, textbook entry.", tags: ["tech", "ai"], status: "closed" },
  { id: 1014, date: "2026-03-04", exitDate: "2026-03-06", entryTime: "09:50", exitTime: "10:25", ticker: "SPY", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 578, exitPrice: 584.50, stopLoss: 574.00, takeProfit: 586.00, shares: 40, emotion: "Confident", mistake: "None", notes: "Market broke out of 2-week consolidation on strong volume.", tags: ["index"], status: "closed" },
  { id: 1015, date: "2026-03-10", exitDate: "2026-03-13", entryTime: "10:10", exitTime: "15:50", ticker: "NVDA", type: "stock", strategy: "Breakout", direction: "long", entryPrice: 135, exitPrice: 143, stopLoss: 130.50, takeProfit: 144.00, shares: 45, emotion: "Confident", mistake: "None", notes: "Resumed uptrend after post-earnings pullback. Strong R:R.", tags: ["tech", "ai", "breakout"], status: "closed" },
];
