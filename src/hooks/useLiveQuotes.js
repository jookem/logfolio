import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const POLL_INTERVAL = 60_000; // 60 s — server caches 5 min anyway

function isMarketOpen() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  if (parts.weekday === "Sun" || parts.weekday === "Sat") return false;
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const min = hour * 60 + minute;
  return min >= 9 * 60 + 30 && min < 16 * 60;
}

export default function useLiveQuotes(tickers) {
  const [quotes, setQuotes] = useState({});   // { AAPL: { price, change, changePct } }
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);
  const tickerKey = tickers.join(",");

  const fetchQuotes = useCallback(async () => {
    if (!tickers.length) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickerKey)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;
      const res = await fetch("/api/yf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      const result = data?.quoteResponse?.result;
      if (!Array.isArray(result)) return;
      const next = {};
      result.forEach(q => {
        if (q.regularMarketPrice != null) {
          next[q.symbol] = {
            price: q.regularMarketPrice,
            change: q.regularMarketChange ?? 0,
            changePct: q.regularMarketChangePercent ?? 0,
          };
        }
      });
      setQuotes(next);
      setLastUpdated(new Date());
    } catch {
      // non-critical — silently ignore
    }
  }, [tickerKey]);

  useEffect(() => {
    if (!tickers.length) { setQuotes({}); return; }
    fetchQuotes();
    timerRef.current = setInterval(fetchQuotes, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [tickerKey]);  // re-run when ticker list changes

  return { quotes, lastUpdated, marketOpen: isMarketOpen(), refresh: fetchQuotes };
}
