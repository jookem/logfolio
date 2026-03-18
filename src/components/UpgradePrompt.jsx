export default function UpgradePrompt({ t, onUpgrade, feature }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 12 }}>
        <svg width="48" height="48" viewBox="0 0 45.386 45.386" xmlns="http://www.w3.org/2000/svg">
          <path fill="#3B82F6" d="M25.307,1.294c-1.354-1.726-3.874-1.726-5.229,0C14.344,8.599,2.252,6.517,2.252,16.103c0,11.621,9.023,28.489,20.441,29.283c11.418-0.794,20.441-17.662,20.441-29.283C43.134,6.517,31.042,8.599,25.307,1.294z M28.684,25.249l-5.651,11.515c-0.233,0.476-0.771,0.716-1.281,0.575c-0.51-0.143-0.848-0.718-0.803-1.244l0.633-7.623h-3.635c-0.438,0-0.849-0.113-1.111-0.464c-0.263-0.351-0.343-0.757-0.219-1.177l3.89-13.242c0.174-0.589,0.715-1.118,1.33-1.118h4.51c0.464,0,0.897,0.378,1.154,0.764c0.257,0.387,0.304,1.061,0.125,1.489l-3.582,8.748h3.396c0.479,0,0.924,0.14,1.178,0.546S28.895,24.82,28.684,25.249z"/>
        </svg>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>
        {feature} is a Pro feature
      </div>
      <div style={{ fontSize: 13, color: t.text3, marginBottom: 24, maxWidth: 320 }}>
        Upgrade to Pro for ${15}/month to unlock {feature}, unlimited trades, and options data via Polygon.io.
      </div>
      <button
        onClick={onUpgrade}
        style={{ background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}
