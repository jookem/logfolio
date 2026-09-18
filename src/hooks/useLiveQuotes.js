import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { isMarketOpen } from "../lib/marketHours";

const POLL_INTERVAL = 60_000; // 60 s — server caches 5 min anyway

export default function useLiveQuotes(tickers) {
  const [quotes, setQuotes] = useState({});   // { AAPL: { price, change, changePct } }
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);
  const tickerKey = tickers.join(",");

  const fetchQuotes = useCallback(async () => {
    if (!tickers.length) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };
      const results = await Promise.all(
        tickers.map(ticker =>
          fetch("/api/market-data", {
            method: "POST",
            headers,
            body: JSON.stringify({ provider: "polygon", path: `/v2/aggs/ticker/${ticker}/prev?adjusted=true` }),
          }).then(r => r.json()).then(data => ({ ticker, price: data?.results?.[0]?.c ?? null }))
        )
      );
      const next = {};
      results.forEach(({ ticker, price }) => {
        if (price != null) next[ticker] = { price, change: 0, changePct: 0 };
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
