import { useState } from "react";
import {
  LogoIcon, LogIcon, PlanIcon, TodayIcon, WeekIcon, CalendarIcon,
  AnalysisIcon, RobotIcon, ArrowsIcon, DollarIcon, ShieldIcon,
  MindIcon, PenIcon, TargetIcon, CheckIcon,
} from "../lib/icons";

// ── Step data ──────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: <LogoIcon />,
    title: "Welcome to Logfolio",
    desc: "A quick tour of the key features. Takes about 2 minutes. You can re-open this anytime from Settings.",
    tab: null,
    cta: null,
  },
  {
    icon: <LogIcon />,
    title: "Log a Trade",
    desc: "After a trade closes, tap + (or press N) to log it. Record entry & exit prices, shares, stop loss, emotions, and notes. The more honest you are, the better your insights.",
    tab: "trades",
    cta: { label: "Try logging a trade", action: "openLog" },
  },
  {
    icon: <PlanIcon />,
    title: "Plan a Trade",
    desc: "Before entering a position, create a plan. Set your thesis, target, stop loss, and look up the options chain. Planning keeps you disciplined and accountable.",
    tab: "plans",
    cta: { label: "Try creating a plan", action: "openPlan" },
  },
  {
    icon: <TodayIcon />,
    title: "Today",
    desc: "Your daily dashboard. See every trade taken today, your running P/L, win rate, and a breakdown of the current session.",
    tab: "today",
    cta: null,
  },
  {
    icon: <WeekIcon />,
    title: "Weekly",
    desc: "Review your full week — daily P/L bars, cumulative performance, and key stats. Perfect for your end-of-week review ritual.",
    tab: "weekly",
    cta: null,
  },
  {
    icon: <CalendarIcon />,
    title: "Calendar",
    desc: "A month-by-month P/L heatmap. Green = profitable day, red = loss. Spot scheduling patterns and days you should avoid trading.",
    tab: "calendar",
    cta: null,
  },
  {
    icon: <LogIcon />,
    title: "Logs",
    desc: "Your full trade history. Filter by strategy, tag, or ticker. Click any trade to review details, edit it, or replay the setup.",
    tab: "trades",
    cta: null,
  },
  {
    icon: <PlanIcon />,
    title: "Plans",
    desc: "All your pre-trade plans in one place. When you execute a plan, convert it to a logged trade with one tap — no double entry.",
    tab: "plans",
    cta: null,
  },
  {
    icon: <AnalysisIcon />,
    title: "Analytics",
    desc: "Equity curve, P/L breakdown, win rate, R-multiples, SPY benchmark overlay, and strategy performance — everything you need to measure real progress.",
    tab: "analytics",
    cta: null,
  },
  {
    icon: <RobotIcon />,
    title: "AI Insights",
    desc: "Get AI-powered feedback on your trading patterns, emotional tendencies, and specific areas to improve. Powered by Claude.",
    tab: "ai",
    cta: null,
  },
];

const TRADE_WALKTHROUGH = [
  {
    icon: <LogIcon size={30} />,
    title: "Ticker, Type & Strategy",
    desc: "Enter the ticker (e.g. AAPL), the Date, the Type (Stock, Options, Forex, Crypto), and the Strategy (Breakout, Pullback, etc.). The form adapts based on Type.",
  },
  {
    icon: <ArrowsIcon />,
    title: "Direction & Shares",
    desc: "Choose Long or Short, then enter the number of Shares (or contracts for options). This number is multiplied by your price difference to calculate P&L.",
  },
  {
    icon: <DollarIcon />,
    title: "Entry $ & Exit $",
    desc: "Enter the Entry $ — the price you opened the trade at — and the Exit $ — the price you closed at. Logfolio calculates your P&L from these automatically.",
  },
  {
    icon: <ShieldIcon />,
    title: "Stop Loss $ & Take Profit $",
    desc: "Add your Stop Loss $ and Take Profit $ to calculate your R-value — how much you made or lost relative to your planned risk. Also log your Entry Time and Exit Time to unlock the Best Time to Trade chart.",
  },
  {
    icon: <MindIcon />,
    title: "Mindset",
    desc: "Select your Emotion at the time of the trade (Calm, FOMO, Anxious…) and flag any Mistakes made. This section is what powers AI pattern analysis — be honest here.",
  },
  {
    icon: <PenIcon />,
    title: "Notes",
    desc: "Add Tags for filtering, attach Chart Screenshots, record a Voice Note, and write your trade Notes. When you're done, hit Save Trade.",
  },
];

const PLAN_WALKTHROUGH = [
  {
    icon: <TargetIcon />,
    title: "Strategy Type",
    desc: "Choose a Stock strategy (Breakout, Pullback…) or an Options strategy (Iron Condor, Bull Call Spread…). The form sections below update to match your selection.",
  },
  {
    icon: <LogIcon size={30} />,
    title: "Stock Details / Option",
    desc: "Enter the Ticker and direction. For options, each leg shows Strike, Expiry, Entry Premium, Contracts, and IV. You can look up the live options chain directly from this section.",
  },
  {
    icon: <ShieldIcon />,
    title: "Risk Plan",
    desc: "Set your Stop Loss $, Take Profit $, and Entry Target. Logfolio shows you your risk/reward ratio in real time so you can confirm the trade is worth taking before you enter.",
  },
  {
    icon: <CheckIcon />,
    title: "Pre-Trade Checklist",
    desc: "Run through the Pre-Trade Checklist — a set of conditions to confirm before entering. Check off each item to make sure you're not entering on impulse.",
  },
  {
    icon: <MindIcon />,
    title: "Mindset",
    desc: "Record your Emotion going into the trade. Setting this before you enter (not after) gives the most honest data for pattern analysis.",
  },
  {
    icon: <PenIcon />,
    title: "Notes",
    desc: "Write your trade thesis — why you're taking this trade. Add Tags, Chart Screenshots, and a Voice Note. When you're ready, hit Save Plan.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

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

  // ── Sub-walkthrough mode ───────────────────────────────────────────────────
  if (subMode) {
    const steps = subMode === "log" ? TRADE_WALKTHROUGH : PLAN_WALKTHROUGH;
    const sub = steps[subStep];
    const isSubLast = subStep === steps.length - 1;

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 28px", pointerEvents: "none" }}>
        <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
          {/* sub-header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: t.accent, textTransform: "uppercase", letterSpacing: 1.5 }}>
              {subMode === "log" ? "Trade Form Guide" : "Plan Form Guide"}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === subStep ? 18 : 6, height: 6, borderRadius: 3, background: i === subStep ? t.accent : t.border, transition: "all 0.25s ease" }} />
              ))}
            </div>
          </div>
          {/* icon */}
          <div style={{ marginBottom: 10, color: t.text }}>{sub.icon}</div>
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

  // ── Main tutorial ──────────────────────────────────────────────────────────
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
        {/* icon */}
        <div style={{ marginBottom: 12, color: t.text }}>{s.icon}</div>
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
            {isLast ? "Let's go →" : "Next →"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 14, fontFamily: "'Space Mono',monospace" }}>{step + 1} / {total}</div>
      </div>
    </div>
  );
}
