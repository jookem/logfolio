import { useState } from "react";
import { useModalClose } from "../lib/useModalClose";
import { CloseIcon, CheckIcon } from "../lib/icons";

const FEATURES = [
  "Full Analytics dashboard",
  "Unlimited trade logging",
  "CSV import",
];

export default function ProTrialModal({ t, onClose, onStartTrial, onUpgrade }) {
  const { closing, trigger } = useModalClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    const err = await onStartTrial();
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div
      className={closing ? "backdrop-exit" : "backdrop-enter"}
      style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.8)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        className={closing ? "modal-minimize" : "modal-maximize"}
        style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, width: "100%", maxWidth: 348, padding: "28px 24px 24px", position: "relative" }}
      >
        <button
          onClick={() => trigger(onClose)}
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: t.text3, cursor: "pointer", lineHeight: 1 }}
        >
          <CloseIcon size={18} />
        </button>

        {/* Pro badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ position: "relative" }}>
            <img src="/images/pro.svg" alt="Pro" style={{ width: 56, height: 56 }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: `0 0 28px ${t.accent}50` }} />
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: t.text, textAlign: "center", marginBottom: 8, lineHeight: 1.25 }}>
          Try Pro free for 14 days
        </div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ background: t.accent + "22", color: t.accent, fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: 1, borderRadius: 20, padding: "3px 10px" }}>
            NO CREDIT CARD REQUIRED
          </span>
        </div>

        {/* Feature list */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < FEATURES.length - 1 ? 10 : 0 }}>
              <div style={{ color: t.accent, flexShrink: 0 }}>
                <CheckIcon size={16} />
              </div>
              <span style={{ fontSize: 13, color: t.text2 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: "#ff444422", border: "1px solid #ff444466", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 12, color: "#ff6666", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          style={{ width: "100%", background: t.accent, border: "none", color: "#000", borderRadius: 10, padding: "13px 0", cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginBottom: 12, opacity: loading ? 0.7 : 1, transition: "opacity 0.15s" }}
        >
          {loading ? "Starting trial…" : "Start Free Trial"}
        </button>

        {/* Secondary */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={onUpgrade}
            style={{ background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}
          >
            Upgrade to Pro · $4.99/mo →
          </button>
        </div>
      </div>
    </div>
  );
}
