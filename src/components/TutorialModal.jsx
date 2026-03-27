import { useState, useEffect, useRef } from "react";
import { useModalClose } from "../lib/useModalClose";
import {
  LogIcon, PlanIcon, TodayIcon, WeekIcon, CalendarIcon,
  AnalysisIcon, RobotIcon, ArrowsIcon, MindIcon, PenIcon, TargetIcon,
  CheckIcon, RecIcon, DirectionIcon, AmountIcon, EntryPriceIcon, ExitIcon,
  WarningIcon, EntryTimeIcon, ExitTimeIcon, ScreenshotIcon, TickerIcon,
  CategoryIcon, StrategyIcon, CurrentPriceIcon, EmotionIcon, TagsIcon,
  KeyboardIcon,
} from "../lib/icons";

const Pair = ({ a, b }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{a}{b}</div>
);
const Quad = ({ a, b, c, d }) => (
  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{a}{b}{c}{d}</div>
);

// ── Step data ──────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: <img src="/images/logfolio.svg" width={44} height={44} alt="Logfolio" />,
    title: "Welcome to Logfolio",
    desc: "A quick tour of the key features. Takes about 2 minutes. You can re-open this anytime from Settings.",
    tab: null,
    cta: null,
  },
  {
    icon: <Pair a={<TickerIcon size={44} />} b={<ArrowsIcon size={44} />} />,
    title: "Load Sample Trades",
    desc: "Want to explore Analytics, the Calendar, and all features with real data? Load 15 example trades to see everything in action — you can delete them any time from Settings.",
    tab: null,
    cta: { label: "Load sample trades", action: "loadSamples" },
  },
  {
    icon: <LogIcon size={44} />,
    title: "Log a Trade",
    desc: "After a trade closes, tap + to log it. Record entry & exit prices, shares, stop loss, emotions, and notes. The more honest you are, the better your insights.",
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
    icon: <PenIcon size={44} />,
    title: "Journal",
    desc: "Write a daily trading journal entry — your thoughts, mindset, and lessons learned. Entries are saved by date and auto-synced. Use it to reflect on the day before you close your charts.",
    tab: "journal",
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
    icon: <KeyboardIcon size={44} />,
    title: "Keyboard Shortcuts",
    desc: (t) => {
      const K = ({ k }) => (
        <span style={{ display: "inline-block", background: t.card2, border: `1px solid ${t.border}`, borderRadius: 5, padding: "1px 7px", fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text2, lineHeight: 1.6 }}>{k}</span>
      );
      const Row = ({ children }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 10 }}>{children}</div>;
      const Sep = () => <span style={{ color: t.text4, fontSize: 11 }}>·</span>;
      const Lbl = ({ children }) => <span style={{ color: t.text3, fontSize: 12 }}>{children}</span>;
      return (
        <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.75 }}>
          <div>Navigate Logfolio without lifting your hands.</div>
          <Row>
            <K k="Q" /><Lbl>Today</Lbl><Sep />
            <K k="W" /><Lbl>Weekly</Lbl><Sep />
            <K k="E" /><Lbl>Calendar</Lbl><Sep />
            <K k="R" /><Lbl>Logs</Lbl><Sep />
            <K k="T" /><Lbl>Plans</Lbl><Sep />
            <K k="Y" /><Lbl>Journal</Lbl><Sep />
            <K k="U" /><Lbl>Analytics</Lbl><Sep />
            <K k="I" /><Lbl>AI</Lbl>
          </Row>
          <Row>
            <K k="L" /><Lbl>Log a trade</Lbl><Sep />
            <K k="P" /><Lbl>Open a plan</Lbl><Sep />
            <K k="S" /><Lbl>Settings</Lbl>
          </Row>
          <Row>
            <K k="Esc" /><Lbl>Close modal</Lbl>
          </Row>
        </div>
      );
    },
    tab: null,
    cta: null,
  },
  {
    icon: <Pair a={<AnalysisIcon size={38} />} b={<RobotIcon size={38} />} />,
    title: "Free, Pro & Pro+",
    desc: "Free tier: log up to 5 trades per month with access to Today, Weekly, Calendar, Logs, Plans, and Journal.\n\nPro: unlimited trade logging, CSV import, full Analytics, and all core features.\n\nPro+: everything in Pro, plus AI Insights (up to 3 analyses per day) and AI Assist inside trade planning — personalised market bias and trade warnings based on your history.",
    tab: null,
    cta: null,
  },
];

const TRADE_WALKTHROUGH = [
  {
    icon: <Quad a={<TickerIcon size={38} />} b={<TodayIcon size={38} />} c={<CategoryIcon size={38} />} d={<StrategyIcon size={38} />} />,
    title: "Ticker, Date, Type & Strategy",
    desc: "Enter the ticker (e.g. AAPL), the Date, the Type (Stock, Options, Forex, Crypto), and the Strategy (Breakout, Pullback, etc.). The form adapts based on Type.",
    target: "tut-trade-basic",
    panelPos: "bottom",
  },
  {
    icon: <Pair a={<DirectionIcon size={44} />} b={<AmountIcon size={44} />} />,
    title: "Direction & Shares",
    desc: "Choose Long or Short, then enter the number of Shares (or contracts for options). This number is multiplied by your price difference to calculate P&L.",
    target: "tut-trade-direction",
    panelPos: "bottom",
  },
  {
    icon: <Pair a={<EntryPriceIcon size={44} />} b={<ExitIcon size={44} />} />,
    title: "Entry $ & Exit $",
    desc: "Enter the Entry $ — the price you opened the trade at — and the Exit $ — the price you closed at. Logfolio calculates your P&L from these automatically.",
    target: "tut-trade-prices",
    panelPos: "bottom",
  },
  {
    icon: <Pair a={<EntryTimeIcon size={44} />} b={<ExitTimeIcon size={44} />} />,
    title: "Entry & Exit Time",
    desc: "Log your Entry Time and Exit Time to unlock the Best Time to Trade chart in Analytics.",
    target: "tut-trade-times",
    panelPos: "bottom",
  },
  {
    icon: <Pair a={<WarningIcon size={44} />} b={<TargetIcon size={44} />} />,
    title: "Stop Loss & Take Profit",
    desc: "Add your Stop Loss $ and Take Profit $ to calculate your R-value — the ratio of potential reward to risk. A good setup should have an R of 2 or higher.",
    target: "tut-trade-stoploss",
    panelPos: "bottom",
  },
  {
    icon: <EmotionIcon size={44} />,
    title: "Emotion",
    desc: "Select your Emotion at the time of the trade — Calm, FOMO, Anxious, and more. This is the most important field for AI pattern analysis. Be honest.",
    target: "tut-trade-emotion",
    panelPos: "top",
  },
  {
    icon: <WarningIcon size={44} />,
    title: "Mistake",
    desc: "Flag any trading mistakes made — Chased Entry, Broke Rules, Over-leveraged, etc. Tracking mistakes over time reveals your most expensive habits.",
    target: "tut-trade-mistake",
    panelPos: "top",
  },
  {
    icon: <TagsIcon size={44} />,
    title: "Tags",
    desc: "Add Tags to categorise your trade — e.g. earnings, gap-up, revenge. Tags let you filter and group trades across your log to spot recurring patterns.",
    target: "tut-trade-tags",
    panelPos: "top",
  },
  {
    icon: <Pair a={<RecIcon size={44} />} b={<ScreenshotIcon size={44} />} />,
    title: "Voice Note & Screenshot",
    desc: "Record a quick voice note while the trade is fresh, and attach a chart screenshot. Both are stored with the trade for later review.",
    target: "tut-trade-media",
    panelPos: "top",
  },
  {
    icon: <PenIcon size={44} />,
    title: "Notes",
    desc: "Write your trade Notes — what happened, what you learned, and what you'd do differently. Hit Save Trade when done.",
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
    icon: <Quad a={<TickerIcon size={38} />} b={<TodayIcon size={38} />} c={<CategoryIcon size={38} />} d={<StrategyIcon size={38} />} />,
    title: "Ticker, Date, Type & Strategy",
    desc: "Enter the ticker (e.g. AAPL), the trade date, the asset type (Stock, Options, Forex, Crypto), and the strategy (Breakout, Pullback…). The form adapts to your type selection.",
    target: "tut-plan-strategy",
    panelPos: "bottom",
  },
  {
    icon: <Quad a={<CurrentPriceIcon size={38} />} b={<DirectionIcon size={38} />} c={<EntryPriceIcon size={38} />} d={<AmountIcon size={38} />} />,
    title: "Current Price, Direction, Entry & Shares",
    desc: "Enter the live current price (auto-fetched), your direction (Buy/Short), your planned entry price, and the number of shares. For options, each leg shows Strike, Expiry, Premium, Contracts, and IV from the live chain.",
    target: "tut-plan-details",
    panelPos: "bottom",
  },
  {
    icon: <Pair a={<WarningIcon size={44} />} b={<TargetIcon size={44} />} />,
    title: "Risk Plan",
    desc: "Set your Stop Loss $ and Take Profit $ — Logfolio shows your planned R-ratio in real time. Use the built-in Position Size Calculator to work out how many shares to take based on your account size and risk percentage.",
    target: "tut-plan-risk",
    panelPos: "top",
  },
  {
    icon: <PlanIcon size={44} />,
    title: "Pre-Trade Checklist",
    desc: "Run through every item on the Pre-Trade Checklist before entering. Check off each condition to make sure you're not acting on impulse. You can add custom items to build your own process.",
    target: "tut-plan-checklist",
    panelPos: "top",
  },
  {
    icon: <EmotionIcon size={44} />,
    title: "Emotion",
    desc: "Record your Emotion going into the trade. Setting this before you enter (not after) gives the most honest data for AI pattern analysis.",
    target: "tut-plan-emotion",
    panelPos: "top",
  },
  {
    icon: <TagsIcon size={44} />,
    title: "Tags",
    desc: "Add tags to your plan to group and filter trades later — e.g. earnings, gap-up, overnight. Pick from suggested tags or type your own.",
    target: "tut-plan-tags",
    panelPos: "top",
  },
  {
    icon: <Pair a={<RecIcon size={44} />} b={<ScreenshotIcon size={44} />} />,
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

const getScrollParent = (el) => {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const { overflow, overflowY } = window.getComputedStyle(p);
    if (/(auto|scroll)/.test(overflow + overflowY)) return p;
    p = p.parentElement;
  }
  return document.documentElement;
};

function SubWalkthrough({ mode, onClose, t }) {
  const [subStep, setSubStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const pollRef = useRef(null);
  const rafRef = useRef(null);

  const steps = mode === "log" ? TRADE_WALKTHROUGH : PLAN_WALKTHROUGH;
  const sub = steps[subStep];
  const isSubLast = subStep === steps.length - 1;
  const panelPos = sub.panelPos ?? "bottom";
  const scrollBlock = panelPos === "bottom" ? "start" : "end";

  useEffect(() => {
    setHighlightRect(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    const el = document.getElementById(sub.target);
    if (!el) return;

    // Scroll the modal's own scroll container (not the window) to bring el into view
    const sp = getScrollParent(el);
    const elR = el.getBoundingClientRect();
    const spR = sp === document.documentElement ? { top: 0 } : sp.getBoundingClientRect();
    const offsetInParent = elR.top - spR.top + sp.scrollTop;
    const clientH = sp === document.documentElement ? window.innerHeight : sp.clientHeight;
    const dest = scrollBlock === "start"
      ? Math.max(0, offsetInParent - 80)
      : Math.max(0, offsetInParent - clientH + el.offsetHeight + 80);
    sp.scrollTo({ top: dest, behavior: "smooth" });

    // Once scroll settles, start a continuous RAF loop so the highlight
    // tracks the element even when the user scrolls manually
    let rafStarted = false;
    const startTrack = () => {
      if (rafStarted) return;
      rafStarted = true;
      const tick = () => {
        const r = el.getBoundingClientRect();
        const pad = 6;
        setHighlightRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    let lastTop = null;
    let stableCount = 0;
    pollRef.current = setInterval(() => {
      const r = el.getBoundingClientRect();
      if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5) {
        stableCount++;
        if (stableCount >= 4) { clearInterval(pollRef.current); startTrack(); }
      } else { stableCount = 0; }
      lastTop = r.top;
    }, 20);

    const fallback = setTimeout(() => { clearInterval(pollRef.current); startTrack(); }, 900);

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(fallback);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [subStep, sub.target, scrollBlock]);

  const panelStyle = panelPos === "top"
    ? { alignItems: "flex-start", padding: "28px 16px 0" }
    : { alignItems: "flex-end", padding: "0 16px 28px" };

  return (
    <>
      <style>{`@keyframes tut-pulse { 0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 4px ${t.accent}35; } 50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 10px ${t.accent}60; } }`}</style>

      {highlightRect && (
        <div style={{
          position: "fixed",
          top: highlightRect.top,
          left: highlightRect.left,
          width: highlightRect.width,
          height: highlightRect.height,
          border: `2px solid ${t.accent}`,
          borderRadius: 12,
          background: t.accent + "12",
          pointerEvents: "none",
          zIndex: 199,
          animation: "tut-pulse 2s ease-in-out infinite",
        }} />
      )}

      <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "center", pointerEvents: "none", ...panelStyle }}>
        <div key={`panel-${subStep}-${panelPos}`} className={`panel-enter-${panelPos}`} style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
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

export default function TutorialModal({ step, onNext, onPrev, onClose, onOpenLog, onCloseLog, onOpenPlan, onClosePlan, onSetTab, onLoadSamples, t }) {
  const { closing, trigger } = useModalClose();
  const [subMode, setSubMode] = useState(null);

  const s = TUTORIAL_STEPS[step];
  const total = TUTORIAL_STEPS.length;
  const isLast = step === total - 1;

  const handleCTA = (action) => {
    if (action === "openLog") {
      onOpenLog();
      setSubMode("log");
    } else if (action === "openPlan") {
      onOpenPlan();
      setSubMode("plan");
    } else if (action === "loadSamples") {
      onLoadSamples?.();
    }
  };

  const handleNext = () => {
    if (isLast) { trigger(onClose); return; }
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
      <div className={closing ? "modal-minimize" : "modal-maximize"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", pointerEvents: "all" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? t.accent : t.border, transition: "all 0.25s ease" }} />
            ))}
          </div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace", letterSpacing: 1, padding: "4px 8px" }}>SKIP</button>
        </div>
        <div style={{ marginBottom: 12, color: t.text }}>{s.icon}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 10, lineHeight: 1.3 }}>{s.title}</div>
        <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.75, marginBottom: 22, whiteSpace: "pre-line" }}>{typeof s.desc === "function" ? s.desc(t) : s.desc}</div>
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
