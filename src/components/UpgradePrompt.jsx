export default function UpgradePrompt({ t, onUpgrade, feature, tier = "pro" }) {
  const isProPlus = tier === "pro_plus";
  const planName = isProPlus ? "Pro Plus" : "Pro";
  const price = isProPlus ? 15 : 5;
  const description = isProPlus
    ? `Upgrade to Pro Plus for $${price}/month to unlock ${feature}, Analytics, and unlimited trades.`
    : `Upgrade to Pro for $${price}/month to unlock ${feature} and unlimited trades.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 12 }}>
        <img src={isProPlus ? "/images/proplus.svg" : "/images/pro.svg"} alt={planName} style={{ width: 48, height: 48 }} />
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>
        {feature} is a {planName} feature
      </div>
      <div style={{ fontSize: 13, color: t.text3, marginBottom: 24, maxWidth: 320 }}>
        {description}
      </div>
      <button
        onClick={onUpgrade}
        style={{ background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}
      >
        Upgrade to {planName}
      </button>
    </div>
  );
}
