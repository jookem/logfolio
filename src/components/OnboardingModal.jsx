import { PenIcon, AnalysisIcon } from "../lib/icons";
import { useModalClose } from "../lib/useModalClose";

export default function OnboardingModal({ onStartFresh, onLoadSamples, t }) {
  const { closing, trigger } = useModalClose();
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className={closing ? "modal-minimize" : "modal-maximize"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>LOG-FOLIO</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 8, lineHeight: 1.3 }}>Welcome to your trading journal</div>
        <div style={{ fontSize: 13, color: t.text3, marginBottom: 28, lineHeight: 1.6 }}>Track every trade, spot your patterns, and improve with each session.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => trigger(onStartFresh)} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: t.card2, border: `1px solid ${t.accent}50`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", width: "100%" }}>
            <div style={{ display: "flex", color: t.text2 }}><PenIcon size={24} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>Start Fresh</div>
              <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Log your first trade and build your journal from scratch.</div>
            </div>
          </button>
          <button onClick={() => trigger(onLoadSamples)} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", width: "100%" }}>
            <div style={{ display: "flex", color: t.text2 }}><AnalysisIcon size={24} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>Load Sample Trades</div>
              <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Explore with 15 example trades pre-loaded — delete them any time.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
