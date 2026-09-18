import { useState } from "react";
import { supabase } from "../lib/supabase";
import { RocketIcon, CloseIcon, WarningIcon } from "../lib/icons";

const fmtVol = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

// Options momentum scanner. All screening happens server-side
// (api/_lib/optionsPartyStarter.js); this renders the results.
export default function OptionsPartyStarterPanel({ t, onPick }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const scan = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/market-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ provider: "options-party-starter" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Scan failed");
      setData({ picks: Array.isArray(json.picks) ? json.picks : [], funnel: json.funnel || null });
    } catch (e) {
      setError(e.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const btn = { background: "none", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", display: "inline-flex", alignItems: "center", gap: 6 };
  const btnFull = { ...btn, width: "100%", justifyContent: "center", padding: "11px 12px", fontSize: 13 };
  const f = data?.funnel;

  return (
    <div style={{ marginBottom: 12 }}>
      {!open ? (
        <button type="button" onClick={scan} style={btnFull}><RocketIcon size={16} />Options Party Starter</button>
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.card2 || t.card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: "'Space Mono', monospace" }}>
              <RocketIcon size={14} />Options Party Starter
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={scan} disabled={loading} style={{ ...btn, padding: "4px 10px", fontSize: 11 }}>{loading ? "Scanning..." : "Refresh"}</button>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer" }}><CloseIcon size="1em" /></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: t.text4, marginBottom: 8, lineHeight: 1.5 }}>
            Liquid stocks ($10+, 1M+ avg volume) with 30 to 45 day contracts trading above open interest at 3x their normal volume, printing at the ask, with low volatility and a squeeze setup. This scan takes 10 to 20 seconds.
          </div>
          {loading && !data && <div style={{ fontSize: 12, color: t.text3 }}>Scanning options chains...</div>}
          {error && <div style={{ fontSize: 12, color: t.danger }}>{error}</div>}
          {!error && data && data.picks.length === 0 && !loading && (
            <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.6 }}>
              No setups match right now. These are rare by design.
              {f && (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: t.text4, marginTop: 6 }}>
                  {f.liquid} liquid tickers, {f.optionable} optionable, {f.flow} with unusual flow, {f.volatility} with low volatility and a squeeze.
                </div>
              )}
            </div>
          )}
          <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {(data?.picks || []).map((p) => {
              const bull = p.direction === "BULLISH";
              const c = bull ? t.positive : t.danger;
              return (
                <button
                  type="button"
                  key={p.contract.symbol}
                  onClick={() => { onPick(p); setOpen(false); }}
                  style={{ display: "block", textAlign: "left", background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", color: t.text, width: "100%" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14 }}>{p.ticker}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: t.accent, fontWeight: 700 }}>Score {p.score.toFixed(1)}</span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: t.text2, marginBottom: 6 }}>
                    {p.contract.expiration} ({p.contract.dte}d) | ${p.contract.strike} {p.contract.type === "call" ? "Call" : "Put"} | ask ${p.contract.ask.toFixed(2)}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 11, color: t.text3, marginBottom: 6 }}>
                    <span>Vol/OI {p.volOi.toFixed(1)}x ({fmtVol(p.contract.volume)} / {fmtVol(p.contract.openInterest)})</span>
                    <span>Rel vol {p.relVol.toFixed(1)}x</span>
                    <span>Vol pctile {Math.round(p.ivPercentile)}</span>
                    <span>Squeeze {p.squeeze === "fired" ? "fired" : "on"}</span>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: c, fontFamily: "'Space Mono', monospace", letterSpacing: 0.5 }}>
                    <WarningIcon size={12} />BREAKOUT IMMINENT ({p.direction})
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
