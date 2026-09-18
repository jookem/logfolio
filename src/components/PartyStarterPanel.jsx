import { useState } from "react";
import { supabase } from "../lib/supabase";
import { RocketIcon, CloseIcon } from "../lib/icons";

const fmtVol = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`;
const fmtCap = (n) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${Math.round(n / 1e6)}M`;

// Scans for common stocks trading up on unusual volume. Filtering happens
// server-side (api/_lib/partyStarter.js); this only renders the picks.
export default function PartyStarterPanel({ t, onPick }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picks, setPicks] = useState(null);
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
        body: JSON.stringify({ provider: "party-starter" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Scan failed");
      setPicks(Array.isArray(data.picks) ? data.picks : []);
    } catch (e) {
      setError(e.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const btn = { background: "none", border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", display: "inline-flex", alignItems: "center", gap: 6 };
  const btnFull = { ...btn, width: "100%", justifyContent: "center", padding: "11px 12px", fontSize: 13 };

  return (
    <div style={{ marginBottom: 12 }}>
      {!open ? (
        <button type="button" onClick={scan} style={btnFull}><RocketIcon size={16} />Party Starter</button>
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.card2 || t.card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: "'Space Mono', monospace" }}>
              <RocketIcon size={14} />Party Starter
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={scan} disabled={loading} style={{ ...btn, padding: "4px 10px", fontSize: 11 }}>{loading ? "Scanning..." : "Refresh"}</button>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer" }}><CloseIcon size="1em" /></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: t.text4, marginBottom: 8, lineHeight: 1.5 }}>
            Common stocks up on the day with volume at least 2x average, market cap $300M+, sorted by volume.
          </div>
          {error && <div style={{ fontSize: 12, color: t.negative || "#f87171" }}>{error}</div>}
          {!error && picks && picks.length === 0 && !loading && (
            <div style={{ fontSize: 12, color: t.text3 }}>No stocks match right now. Try again during market hours.</div>
          )}
          <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {(picks || []).map((p) => (
              <button
                type="button"
                key={p.symbol}
                onClick={() => { onPick(p); setOpen(false); }}
                style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 8, alignItems: "center", textAlign: "left", background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: t.text }}
              >
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13 }}>{p.symbol}</span>
                <span style={{ fontSize: 11, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name} · {fmtCap(p.marketCap)}
                </span>
                <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", textAlign: "right", color: t.text2 }}>
                  ${p.price.toFixed(2)} <span style={{ color: t.positive }}>+{p.changePct.toFixed(1)}%</span><br />
                  {fmtVol(p.volume)} ({p.relVolume.toFixed(1)}x)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
