export default function OnboardingModal({ onLoadSample, onStartFresh, t }) {
  const optStyle = {
    display: "flex", gap: 12, alignItems: "flex-start", background: t.card2,
    border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px",
    cursor: "pointer", textAlign: "left", width: "100%",
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 20 }}>LOG-FOLIO</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 8, lineHeight: 1.3 }}>Welcome to your trading journal</div>
        <div style={{ fontSize: 13, color: t.text3, marginBottom: 28, lineHeight: 1.6 }}>Track every trade, spot your patterns, and improve with each session.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onLoadSample} style={{ ...optStyle, borderColor: t.accent + "50" }}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>📊</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>Load Sample Data</div>
              <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Explore with 15 pre-built trades across AAPL, TSLA, NVDA & SPY. See analytics, equity curve, and insights right away.</div>
            </div>
          </button>
          <button onClick={onStartFresh} style={optStyle}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>✏️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>Start Fresh</div>
              <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Log your first real trade and build your journal from scratch.</div>
            </div>
          </button>
        </div>
        <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 20, fontFamily: "'Space Mono',monospace" }}>Sample data can be cleared anytime in Settings</div>
      </div>
    </div>
  );
}
