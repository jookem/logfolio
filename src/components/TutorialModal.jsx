import { useState } from "react";

const TUTORIAL_STEPS = [
  {
    icon: "👋",
    title: "Welcome to Logfolio",
    desc: "A quick tour of the key features. Takes about 2 minutes. You can re-open this anytime from Settings.",
    tab: null,
    cta: null,
  },
  {
    icon: "➕",
    title: "Log a Trade",
    desc: "After a trade closes, tap + (or press N) to log it. Record entry & exit prices, shares, stop loss, emotions, and notes. The more honest you are, the better your insights.",
    tab: "trades",
    cta: { label: "Try logging a trade", action: "openLog" },
  },
  {
    icon: "🎯",
    title: "Plan a Trade",
    desc: "Before entering a position, create a plan. Set your thesis, target, stop loss, and look up the options chain. Planning keeps you disciplined and accountable.",
    tab: "plans",
    cta: { label: "Try creating a plan", action: "openPlan" },
  },
  {
    icon: "📅",
    title: "Today",
    desc: "Your daily dashboard. See every trade taken today, your running P/L, win rate, and a breakdown of the current session.",
    tab: "today",
    cta: null,
  },
  {
    icon: "📆",
    title: "Weekly",
    desc: "Review your full week — daily P/L bars, cumulative performance, and key stats. Perfect for your end-of-week review ritual.",
    tab: "weekly",
    cta: null,
  },
  {
    icon: "🗓️",
    title: "Calendar",
    desc: "A month-by-month P/L heatmap. Green = profitable day, red = loss. Spot scheduling patterns and days you should avoid trading.",
    tab: "calendar",
    cta: null,
  },
  {
    icon: "📋",
    title: "Logs",
    desc: "Your full trade history. Filter by strategy, tag, or ticker. Click any trade to review details, edit it, or replay the setup.",
    tab: "trades",
    cta: null,
  },
  {
    icon: "📝",
    title: "Plans",
    desc: "All your pre-trade plans in one place. When you execute a plan, convert it to a logged trade with one tap — no double entry.",
    tab: "plans",
    cta: null,
  },
  {
    icon: "📊",
    title: "Analytics",
    desc: "Equity curve, P/L breakdown, win rate, R-multiples, SPY benchmark overlay, and strategy performance — everything you need to measure real progress.",
    tab: "analytics",
    cta: null,
  },
  {
    icon: "🤖",
    title: "AI Insights",
    desc: "Get AI-powered feedback on your trading patterns, emotional tendencies, and specific areas to improve. Powered by Claude.",
    tab: "ai",
    cta: null,
  },
];

const TRADE_WALKTHROUGH = [
  {
    icon: "🏷️",
    title: "Ticker & Type",
    desc: "Enter the ticker symbol (e.g. AAPL, SPY) and choose the trade type — Stock, Options, Forex, or Crypto. The form adjusts to match.",
  },
  {
    icon: "↕️",
    title: "Direction & Prices",
    desc: "Select Long (buying) or Short (selling). Then enter your entry price (where you opened) and exit price (where you closed).",
  },
  {
    icon: "🔢",
    title: "Size",
    desc: "Enter the number of shares (or contracts for options). Logfolio uses this along with your prices to calculate your total P&L automatically.",
  },
  {
    icon: "🛡️",
    title: "Risk Management",
    desc: "Add your stop loss and take profit levels. Logfolio calculates your R-value — how many times your risk you made or lost. Aim for trades above +1R.",
  },
  {
    icon: "🧠",
    title: "Psychology",
    desc: "Honestly record your emotion at the time (Calm, FOMO, Anxious…) and any mistakes made. This is what powers the AI pattern analysis — don't skip it.",
  },
  {
    icon: "📝",
    title: "Notes & Tags",
    desc: "Write what happened and why you took the trade. Add tags for easy filtering later. When you're done — hit Save Trade.",
  },
];

const PLAN_WALKTHROUGH = [
  {
    icon: "🎯",
    title: "Strategy Type",
    desc: "Choose the type of position you're planning — Stock, Forex, Crypto, or an Options strategy like Bull Call Spread or Iron Condor. The form adapts to match.",
  },
  {
    icon: "🏷️",
    title: "Ticker & Thesis",
    desc: "Enter the ticker and write your trade thesis — the reason you're considering this trade. Articulating your reasoning forces discipline before you enter.",
  },
  {
    icon: "📐",
    title: "Entry, Stop & Target",
    desc: "Set your exact entry price, stop loss, and take profit target before you enter. Locking these in advance is the whole point — no moving the goalposts once you're in.",
  },
  {
    icon: "📊",
    title: "Options Chain",
    desc: "For options strategies, use the live chain lookup to browse real strikes and premiums. Enter your legs directly from the chain to pre-fill the form.",
  },
  {
    icon: "✅",
    title: "Save & Execute Later",
    desc: "Save your plan. It appears in the Plans tab. When you're ready to enter, open it and hit Execute — it converts instantly to a logged trade with no re-entry.",
  },
];

export default function TutorialModal({ step, onNext, onPrev, onClose, onOpenLog, onOpenPlan, onSetTab, t }) {
  const [subMode, setSubMode] = useState(null); // null | "log" | "plan"
  const [subStep, setSubStep] = useState(0);

  const s = TUTORIAL_STEPS[step];
  const total = TUTORIAL_STEPS.length;
  const isLast = step === total - 1;

  const handleCTA = (action) => {
    if (action === "openLog") {
      onOpenLog();
      setSubStep(0);
      setSubMode("log");
    } else {
      onOpenPlan();
      setSubStep(0);
      setSubMode("plan");
    }
  };

  const handleNext = () => {
    if (isLast) { onClose(); return; }
    const nextStep = TUTORIAL_STEPS[step + 1];
    if (nextStep.tab) onSetTab(nextStep.tab);
    onNext();
  };
  const handlePrev = () => {
    const prevStep = TUTORIAL_STEPS[step - 1];
    if (prevStep.tab) onSetTab(prevStep.tab);
    onPrev();
  };

  // ── Sub-walkthrough mode ──────────────────────────────────────────────────
  if (subMode) {
    const steps = subMode === "log" ? TRADE_WALKTHROUGH : PLAN_WALKTHROUGH;
    const sub = steps[subStep];
    const isSubLast = subStep === steps.length - 1;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 28px", pointerEvents: "none" }}>
        <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
          {/* sub-header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: t.accent, textTransform: "uppercase", letterSpacing: 1.5 }}>
                {subMode === "log" ? "Trade Form Guide" : "Plan Form Guide"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === subStep ? 18 : 6, height: 6, borderRadius: 3, background: i === subStep ? t.accent : t.border, transition: "all 0.25s ease" }} />
              ))}
            </div>
          </div>
          {/* content */}
          <div style={{ fontSize: 26, marginBottom: 10, lineHeight: 1 }}>{sub.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8, lineHeight: 1.3 }}>{sub.title}</div>
          <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.75, marginBottom: 22 }}>{sub.desc}</div>
          {/* nav */}
          <div style={{ display: "flex", gap: 10 }}>
            {subStep > 0 ? (
              <button onClick={() => setSubStep(s => s - 1)} style={{ flex: "0 0 80px", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 0", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
            ) : (
              <button onClick={() => setSubMode(null)} style={{ flex: "0 0 80px", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 0", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Guide</button>
            )}
            <button
              onClick={() => isSubLast ? setSubMode(null) : setSubStep(s => s + 1)}
              style={{ flex: 1, background: isSubLast ? t.accent : t.card2, border: `1px solid ${isSubLast ? t.accent : t.border}`, borderRadius: 10, padding: "10px 16px", color: isSubLast ? "#000" : t.text, fontSize: 13, fontWeight: isSubLast ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}
            >
              {isSubLast ? "Got it ✓" : "Next →"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 14, fontFamily: "'Space Mono',monospace" }}>{subStep + 1} / {steps.length}</div>
        </div>
      </div>
    );
  }

  // ── Main tutorial ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 28px", pointerEvents: "none" }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? t.accent : t.border, transition: "all 0.25s ease" }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace", letterSpacing: 1, padding: "4px 8px" }}>SKIP</button>
        </div>
        {/* content */}
        <div style={{ fontSize: 30, marginBottom: 12, lineHeight: 1 }}>{s.icon}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 10, lineHeight: 1.3 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.75, marginBottom: 22 }}>{s.desc}</div>
        {/* optional CTA */}
        {s.cta && (
          <button
            onClick={() => handleCTA(s.cta.action)}
            style={{ display: "block", width: "100%", background: t.accent + "18", border: `1px solid ${t.accent}40`, borderRadius: 10, padding: "10px 16px", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, textAlign: "center", fontFamily: "inherit" }}
          >
            {s.cta.label} →
          </button>
        )}
        {/* nav */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={handlePrev} style={{ flex: "0 0 80px", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 0", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
          )}
          <button onClick={handleNext} style={{ flex: 1, background: isLast ? t.accent : t.card2, border: `1px solid ${isLast ? t.accent : t.border}`, borderRadius: 10, padding: "10px 16px", color: isLast ? "#fff" : t.text, fontSize: 13, fontWeight: isLast ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
            {isLast ? "Let's go 🚀" : "Next →"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 14, fontFamily: "'Space Mono',monospace" }}>{step + 1} / {total}</div>
      </div>
    </div>
  );
}
