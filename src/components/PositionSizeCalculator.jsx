import { useState } from "react";
import { ArrowRightIcon } from "../lib/icons";

const usd = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Expiry payoff (USD) of a multi-leg position at underlying price S, one
// contract per leg.
function payoffAt(legs, S) {
  return legs.reduce((sum, l) => {
    const K = +l.strike, prem = +l.entryPremium;
    const intrinsic = l.type === "put" ? Math.max(K - S, 0) : Math.max(S - K, 0);
    return sum + (l.position === "sell" ? prem - intrinsic : intrinsic - prem) * 100;
  }, 0);
}

// Worst-case loss for one contract per leg, or Infinity when the loss is
// unbounded (e.g. a naked short call). The payoff is piecewise linear, so its
// minimum sits at S = 0, at a strike, or at infinity.
export function optionsMaxLoss(legs) {
  const strikes = legs.map(l => +l.strike);
  const far = Math.max(...strikes) * 10 + 100;
  if (payoffAt(legs, far * 2) < payoffAt(legs, far) - 1e-9) return Infinity;
  const worst = Math.min(...[0, ...strikes, far].map(S => payoffAt(legs, S)));
  return Math.max(0, -worst);
}

// Suggests how many shares/units (or option contracts) fit a fixed risk
// budget. Options assume the same contract count on every leg.
export default function PositionSizeCalculator({ t, lbl, inp, type, entry, stop, legs, unitsLabel, defaults, onApply }) {
  const isOptions = type === "options";
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(defaults?.accountSize ? String(defaults.accountSize) : "");
  const [riskPct, setRiskPct] = useState(defaults?.riskPct ? String(defaults.riskPct) : "1");

  const budget = (parseFloat(account) || 0) * ((parseFloat(riskPct) || 0) / 100);

  let perUnit = null;      // max loss per share/unit, or per contract for options
  const missing = [];
  let unbounded = false;
  if (isOptions) {
    const usable = (legs || []).filter(l => +l.strike > 0 && l.entryPremium !== "" && l.entryPremium != null);
    if (usable.length === 0) missing.push("option legs (strike and premium)");
    else {
      const loss = optionsMaxLoss(usable);
      if (loss === Infinity) unbounded = true;
      else if (loss > 0) perUnit = loss;
    }
  } else {
    const e = parseFloat(entry), s = parseFloat(stop);
    if (!e) missing.push("Entry");
    if (!s) missing.push("Stop Loss");
    if (e && s && e !== s) perUnit = Math.abs(e - s);
  }
  if (!parseFloat(account)) missing.push("Account Size");
  if (!parseFloat(riskPct)) missing.push("Risk %");

  const size = perUnit && budget ? Math.floor(budget / perUnit) : null;
  const unit = (unitsLabel || "shares").toLowerCase();

  const card = { background: t.card2, border: `1px solid ${t.border}` };
  return (
    <div style={{ marginBottom: 14, marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...card, width: "100%", color: t.text3, borderRadius: open ? "8px 8px 0 0" : 8, padding: "8px 14px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Position Size Calculator{isOptions ? " (Options)" : ""}</span>
        <span style={{ color: t.accent, transform: `rotate(${open ? -90 : 90}deg)`, transition: "transform 0.2s" }}><ArrowRightIcon size={12} /></span>
      </button>
      {open && (
        <div style={{ ...card, borderRadius: "0 0 8px 8px", borderTop: "none", padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>Account Size $</label>
              <input style={inp} type="number" value={account} onChange={e => setAccount(e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label style={lbl}>Risk %</label>
              <input style={inp} type="number" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="1" step="0.1" />
            </div>
          </div>
          {!!budget && (
            <div style={{ fontSize: 11, color: t.text3, marginBottom: 10 }}>Risk budget: {usd(budget)}</div>
          )}
          {unbounded ? (
            <div style={{ fontSize: 11, color: t.danger, textAlign: "center", padding: "8px 0", lineHeight: 1.5 }}>
              This position has undefined risk (naked short), so it can't be sized. Add a long leg to cap the loss.
            </div>
          ) : size !== null && size > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.accent + "10", border: `1px solid ${t.accent}30`, borderRadius: 8, padding: "10px 14px", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace" }}>Suggested size</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.accent, fontFamily: "'Space Mono', monospace" }}>
                  {size} {isOptions ? (size === 1 ? "contract" : "contracts") : unit}
                </div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>
                  Max risk: {usd(size * perUnit)}{isOptions ? ` (${usd(perUnit)} per contract at expiry)` : ""}
                </div>
              </div>
              <button type="button" onClick={() => onApply(size)} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>Apply</button>
            </div>
          ) : size === 0 ? (
            <div style={{ fontSize: 11, color: t.text3, textAlign: "center", padding: "8px 0", lineHeight: 1.5 }}>
              Your {usd(budget)} risk budget is less than the {usd(perUnit)} max loss of one {isOptions ? "contract" : "share"}. Raise account size or risk %, or tighten the {isOptions ? "structure" : "stop"}.
            </div>
          ) : (
            <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textAlign: "center", padding: "8px 0" }}>
              Still needed: {missing.join(", ") || "valid inputs"}
            </div>
          )}
          {isOptions && (
            <div style={{ fontSize: 10, color: t.text4, marginTop: 8, lineHeight: 1.5 }}>
              Sizes the whole position by its worst-case loss at expiry, using the same contract count on every leg. Apply sets every leg to that count.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
