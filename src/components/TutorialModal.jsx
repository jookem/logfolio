import { useState, useEffect, useRef } from "react";
import {
  LogoIcon, LogIcon, PlanIcon, TodayIcon, WeekIcon, CalendarIcon,
  AnalysisIcon, RobotIcon, ArrowsIcon, DollarIcon, ShieldIcon,
  MindIcon, PenIcon, TargetIcon, CheckIcon, RecIcon,
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
    icon: <LogIcon size={44} />,
    title: "Log a Trade",
    desc: "After a trade closes, tap + (or press N) to log it. Record entry & exit prices, shares, stop loss, emotions, and notes. The more honest you are, the better your insights.",
    tab: "trades",
    cta: { label: "Try logging a trade", action: "openLog" },
  },
  {
    icon: <PlanIcon size={44} />,
    title: "Plan a Trade",
    desc: "Before entering a position, create a plan. Set your thesis, target, stop loss, and look up the live options chain. Pro Plus members also get AI Assist — personalised market bias and trade warnings based on your history.",
    tab: "plans",
    cta: { label: "Try creating a plan", action: "openPlan" },
  },
  {
    icon: <TodayIcon size={44} />,
    title: "Today",
    desc: "Your daily dashboard. See every trade taken today, your running P/L, win rate, and a breakdown of the current session.",
    tab: "today",
    cta: null,
  },
  {
    icon: <WeekIcon size={44} />,
    title: "Weekly",
    desc: "Review your full week — daily P/L bars, cumulative performance, and key stats. Perfect for your end-of-week review ritual.",
    tab: "weekly",
    cta: null,
  },
  {
    icon: <CalendarIcon size={44} />,
    title: "Calendar",
    desc: "A month-by-month P/L heatmap. Green = profitable day, red = loss. Spot scheduling patterns and days you should avoid trading.",
    tab: "calendar",
    cta: null,
  },
  {
    icon: <LogIcon size={44} />,
    title: "Logs",
    desc: "Your full trade history. Filter by strategy, tag, or ticker. Click any trade to review details, edit it, or replay the setup.",
    tab: "trades",
    cta: null,
  },
  {
    icon: <PlanIcon size={44} />,
    title: "Plans",
    desc: "All your pre-trade plans in one place. When you execute a plan, convert it to a logged trade with one tap — no double entry.",
    tab: "plans",
    cta: null,
  },
  {
    icon: <AnalysisIcon size={44} />,
    title: "Analytics",
    desc: "Equity curve, P/L breakdown, win rate, R-multiples, SPY benchmark overlay, and strategy performance — everything you need to measure real progress.",
    tab: "analytics",
    cta: null,
  },
  {
    icon: <RobotIcon size={44} />,
    title: "AI Insights",
    desc: "Get AI-powered analysis of your full trading journal — pattern recognition, emotional tendencies, strengths, weaknesses, and a trader score. Pro Plus only, up to 3 analyses per day. Powered by Claude.",
    tab: "ai",
    cta: null,
  },
  {
    icon: <PenIcon size={44} />,
    title: "Journal",
    desc: "Write a daily trading journal entry — your thoughts, mindset, and lessons learned. Entries are saved by date and auto-synced. Use it to reflect on the day before you close your charts.",
    tab: "journal",
    cta: null,
  },
];

const TRADE_WALKTHROUGH = [
  {
    icon: <LogIcon size={44} />,
    title: "Ticker, Type & Strategy",
    desc: "Enter the ticker (e.g. AAPL), the Date, the Type (Stock, Options, Forex, Crypto), and the Strategy (Breakout, Pullback, etc.). The form adapts based on Type.",
    target: "tut-trade-basic",
    panelPos: "bottom",
  },
  {
    icon: <ArrowsIcon size={44} />,
    title: "Direction & Shares",
    desc: "Choose Long or Short, then enter the number of Shares (or contracts for options). This number is multiplied by your price difference to calculate P&L.",
    target: "tut-trade-direction",
    panelPos: "bottom",
  },
  {
    icon: <DollarIcon size={44} />,
    title: "Entry $ & Exit $",
    desc: "Enter the Entry $ — the price you opened the trade at — and the Exit $ — the price you closed at. Logfolio calculates your P&L from these automatically.",
    target: "tut-trade-prices",
    panelPos: "bottom",
  },
  {
    icon: <ShieldIcon size={44} />,
    title: "Stop Loss $ & Take Profit $",
    desc: "Add your Stop Loss $ and Take Profit $ to calculate your R-value. Also log your Entry Time and Exit Time to unlock the Best Time to Trade chart.",
    target: "tut-trade-risk",
    panelPos: "bottom",
  },
  {
    icon: <MindIcon size={44} />,
    title: "Emotion",
    desc: "Select your Emotion at the time of the trade — Calm, FOMO, Anxious, and more. This is the most important field for AI pattern analysis. Be honest.",
    target: "tut-trade-emotion",
    panelPos: "top",
  },
  {
    icon: <MindIcon size={44} />,
    title: "Mistake",
    desc: "Flag any trading mistakes made — Chased Entry, Broke Rules, Over-leveraged, etc. Tracking mistakes over time reveals your most expensive habits.",
    target: "tut-trade-mistake",
    panelPos: "top",
  },
  {
    icon: <RecIcon size={44} />,
    title: "Voice Note & Screenshot",
    desc: "Record a quick voice note while the trade is fresh, and attach a chart screenshot. Both are stored with the trade for later review.",
    target: "tut-trade-media",
    panelPos: "top",
  },
  {
    icon: <PenIcon size={44} />,
    title: "Tags & Notes",
    desc: "Add Tags for filtering across your log, then write your trade Notes — what happened, what you learned, and what you'd do differently. Hit Save Trade when done.",
    target: "tut-trade-notes-text",
    panelPos: "top",
  },
  {
    icon: <ArrowsIcon size={44} />,
    title: "CSV Import",
    desc: "Already have trades elsewhere? Hit CSV to bulk-import directly from your broker. Supported brokers: Webull, Robinhood, TD Ameritrade, Interactive Brokers, Tastytrade, and Charles Schwab. Export your order history, paste the file, and Logfolio auto-detects the format.",
    target: "tut-trade-csv",
    panelPos: "top",
  },
];

const PLAN_WALKTHROUGH = [
  {
    icon: <TargetIcon size={44} />,
    title: "Strategy Type",
    desc: "Choose a Stock strategy (Breakout, Pullback…) or an Options strategy (Iron Condor, Bull Call Spread…). The form sections below update to match your selection.",
    target: "tut-plan-strategy",
    panelPos: "bottom",
  },
  {
    icon: <LogIcon size={44} />,
    title: "Stock Details / Option",
    desc: "Enter the Ticker and direction. For options, each leg shows Strike, Expiry, Entry Premium, Contracts, and IV — auto-filled from the live chain. If a strike isn't listed, tap 'Enter manually' to type it in. Note: premium and IV are previous close data — always verify with your broker.",
    target: "tut-plan-details",
    panelPos: "bottom",
  },
  {
    icon: <ShieldIcon size={44} />,
    title: "Risk Plan",
    desc: "Set your Stop Loss $, Take Profit $, and Entry Target. Logfolio shows you your risk/reward ratio in real time so you can confirm the trade is worth taking before you enter.",
    target: "tut-plan-risk",
    panelPos: "top",
  },
  {
    icon: <CheckIcon size={44} />,
    title: "Pre-Trade Checklist",
    desc: "Run through the Pre-Trade Checklist — a set of conditions to confirm before entering. Check off each item to make sure you're not entering on impulse.",
    target: "tut-plan-checklist",
    panelPos: "top",
  },
  {
    icon: <MindIcon size={44} />,
    title: "Emotion",
    desc: "Record your Emotion going into the trade. Setting this before you enter (not after) gives the most honest data for AI pattern analysis.",
    target: "tut-plan-emotion",
    panelPos: "top",
  },
  {
    icon: <RecIcon size={44} />,
    title: "Voice Note & Screenshot",
    desc: "Record a voice note with your trade rationale and attach a chart screenshot. Reviewing these alongside your results is one of the fastest ways to improve.",
    target: "tut-plan-media",
    panelPos: "top",
  },
  {
    icon: <PenIcon size={44} />,
    title: "Trade Thesis",
    desc: "Write your trade thesis — why you're taking this trade, what your edge is, and what would invalidate the setup. Hit Save Plan when ready.",
    target: "tut-plan-notes-text",
    panelPos: "top",
  },
  {
    icon: <RobotIcon size={44} />,
    title: "AI Assist (Pro Plus)",
    desc: "Tap ✦ AI Assist to get an instant read on market direction from recent SPY data, plus personalised warnings and confirmations based on your own trade history with this ticker. Up to 3 uses per day.",
    target: "tut-plan-ai-assist",
    panelPos: "top",
  },
];

// ── Sub-walkthrough ────────────────────────────────────────────────────────────

function SubWalkthrough({ mode, onClose, t }) {
  const [subStep, setSubStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const pollRef = useRef(null);

  const steps = mode === "log" ? TRADE_WALKTHROUGH : PLAN_WALKTHROUGH;
  const sub = steps[subStep];
  const isSubLast = subStep === steps.length - 1;
  const panelPos = sub.panelPos ?? "bottom";
  const scrollBlock = panelPos === "bottom" ? "start" : "end";

  useEffect(() => {
    setHighlightRect(null);
    if (pollRef.current) clearInterval(pollRef.current);

    const el = document.getElementById(sub.target);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: scrollBlock });

    let lastTop = null;
    let stableCount = 0;
    pollRef.current = setInterval(() => {
      const r = el.getBoundingClientRect();
      if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5) {
        stableCount++;
        if (stableCount >= 4) {
          clearInterval(pollRef.current);
          const pad = 6;
          setHighlightRect({
            top: r.top - pad,
            left: r.left - pad,
            width: r.width + pad * 2,
            height: r.height + pad * 2,
          });
        }
      } else {
        stableCount = 0;
      }
      lastTop = r.top;
    }, 20);

    const fallback = setTimeout(() => {
      clearInterval(pollRef.current);
      const r = el.getBoundingClientRect();
      const pad = 6;
      setHighlightRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    }, 900);

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(fallback);
    };
  }, [subStep, sub.target, scrollBlock]);

  const panelStyle = panelPos === "top"
    ? { alignItems: "flex-start", padding: "28px 16px 0" }
    : { alignItems: "flex-end", padding: "0 16px 28px" };

  return (
    <>
      <style>{`@keyframes tut-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>

      {highlightRect && (
        <div style={{
          position: "fixed",
          top: highlightRect.top,
          left: highlightRect.left,
          width: highlightRect.width,
          height: highlightRect.height,
          border: `2px solid ${t.accent}`,
          borderRadius: 12,
          background: t.accent + "0d",
          pointerEvents: "none",
          zIndex: 199,
          boxShadow: `0 0 0 3px ${t.accent}25`,
          animation: "tut-pulse 2s ease-in-out infinite",
        }} />
      )}

      <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "center", pointerEvents: "none", ...panelStyle }}>
        <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: t.accent, textTransform: "uppercase", letterSpacing: 1.5 }}>
              {mode === "log" ? "Trade Form Guide" : "Plan Form Guide"}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i === subStep ? 18 : 6, height: 6, borderRadius: 3, background: i === subStep ? t.accent : t.border, transition: "all 0.25s ease" }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10, color: t.text }}>{sub.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8, lineHeight: 1.3 }}>{sub.title}</div>
          <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.75, marginBottom: 22 }}>{sub.desc}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {subStep > 0 ? (
              <button onClick={() => setSubStep(s => s - 1)} style={{ flex: "0 0 80px", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 0", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
            ) : (
              <button onClick={onClose} style={{ flex: "0 0 80px", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 0", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Guide</button>
            )}
            <button
              onClick={() => isSubLast ? onClose() : setSubStep(s => s + 1)}
              style={{ flex: 1, background: isSubLast ? t.accent : t.card2, border: `1px solid ${isSubLast ? t.accent : t.border}`, borderRadius: 10, padding: "10px 16px", color: isSubLast ? "#000" : t.text, fontSize: 13, fontWeight: isSubLast ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}
            >
              {isSubLast ? "Got it ✓" : "Next →"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: t.text4, textAlign: "center", marginTop: 14, fontFamily: "'Space Mono',monospace" }}>{subStep + 1} / {steps.length}</div>
        </div>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TutorialModal({ step, onNext, onPrev, onClose, onOpenLog, onCloseLog, onOpenPlan, onClosePlan, onSetTab, t }) {
  const [subMode, setSubMode] = useState(null);

  const s = TUTORIAL_STEPS[step];
  const total = TUTORIAL_STEPS.length;
  const isLast = step === total - 1;

  const handleCTA = (action) => {
    if (action === "openLog") {
      onOpenLog();
      setSubMode("log");
    } else {
      onOpenPlan();
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

  const handleSubClose = () => {
    if (subMode === "log") onCloseLog();
    else onClosePlan();
    setSubMode(null);
  };

  if (subMode) {
    return <SubWalkthrough mode={subMode} onClose={handleSubClose} t={t} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 28px", pointerEvents: "none" }}>
      <div className="modal-enter" style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? t.accent : t.border, transition: "all 0.25s ease" }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace", letterSpacing: 1, padding: "4px 8px" }}>SKIP</button>
        </div>
        <div style={{ marginBottom: 12, color: t.text }}>{s.icon}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 10, lineHeight: 1.3 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.75, marginBottom: 22 }}>{s.desc}</div>
        {s.cta && (
          <button
            onClick={() => handleCTA(s.cta.action)}
            style={{ display: "block", width: "100%", background: t.accent + "18", border: `1px solid ${t.accent}40`, borderRadius: 10, padding: "10px 16px", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, textAlign: "center", fontFamily: "inherit" }}
          >
            {s.cta.label} →
          </button>
        )}
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
