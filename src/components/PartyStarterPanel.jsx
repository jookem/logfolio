import { useState } from "react";
import { supabase } from "../lib/supabase";
import ScanShell from "./ScanShell";

const fmtVol = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`;
const fmtCap = (n) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${Math.round(n / 1e6)}M`;

const DESCRIPTIONS = {
  bullish: "Common stocks up on the day with volume at least 2x average, market cap $300M+, sorted by volume.",
  bearish: "Common stocks down on the day with volume at least 2x average, market cap $300M+, sorted by volume.",
};

// Bullish / Bearish stock scan. Filtering happens server-side
// (api/_lib/partyStarter.js); this only renders the picks.
export default function PartyStarterPanel({ t, onPick }) {
  const [dir, setDir] = useState(null);
  const [loading, setLoading] = useState(false);
  const [picks, setPicks] = useState(null);
  const [error, setError] = useState(null);

  const scan = async (direction) => {
    setDir(direction);
    setLoading(true);
    setError(null);
    setPicks(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/market-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ provider: "party-starter", direction }),
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

  return (
    <ScanShell t={t} dir={dir} loading={loading} onScan={scan} onClose={() => setDir(null)} description={DESCRIPTIONS[dir]}>
      {loading && !picks && <div style={{ fontSize: 12, color: t.text3 }}>Scanning...</div>}
      {error && <div style={{ fontSize: 12, color: t.danger }}>{error}</div>}
      {!error && picks && picks.length === 0 && !loading && (
        <div style={{ fontSize: 12, color: t.text3 }}>No stocks match right now. Try again during market hours.</div>
      )}
      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {(picks || []).map((p) => (
          <button
            type="button"
            key={p.symbol}
            onClick={() => { onPick(p, dir); setDir(null); }}
            style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 8, alignItems: "center", textAlign: "left", background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: t.text }}
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13 }}>{p.symbol}</span>
            <span style={{ fontSize: 11, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name} · {fmtCap(p.marketCap)}
            </span>
            <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", textAlign: "right", color: t.text2 }}>
              ${p.price.toFixed(2)} <span style={{ color: p.changePct >= 0 ? t.positive : t.danger }}>{p.changePct >= 0 ? "+" : ""}{p.changePct.toFixed(1)}%</span><br />
              {fmtVol(p.volume)} ({p.relVolume.toFixed(1)}x)
            </span>
          </button>
        ))}
      </div>
    </ScanShell>
  );
}
