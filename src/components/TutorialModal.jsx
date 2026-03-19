import { useState } from "react";

// ── Icon components ────────────────────────────────────────────────────────────
// Logo keeps its brand colours; all others use currentColor.

const LogoIcon = () => (
  <svg viewBox="0 0 35 35" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.8" y="14.7" fill="#FF1212" width="4.3" height="12" />
    <rect x="5.7" y="12.1" fill="#FF1212" width="0.4" height="17.1" />
    <rect x="11.3" y="18.2" fill="#12B248" width="4.3" height="7.3" />
    <rect x="13.2" y="16.6" fill="#12B248" width="0.4" height="10.5" />
    <rect x="20.6" y="7.9" fill="#12B248" width="0.5" height="14.7" />
    <rect x="18.7" y="9.4" fill="#12B248" width="4.3" height="10.7" />
    <polyline points="5.6,30.7 13.7,29.4 21.3,24.5 28.6,22.2" fill="none" stroke="#3B82F6" strokeLinecap="round" strokeMiterlimit="10" />
    <path fill="#87B3F4" d="M30.7,7.2c0-1.2-1-2.2-2.2-2.2c-1.2,0-2.2,1-2.2,2.2l0,0.7c0,0,0,0,0.1,0c0.5,0.2,1.2,0.5,2.1,0.5s1.6-0.2,2.1-0.5c0,0,0,0,0.1,0V7.2z" />
    <path fill="#3B82F6" d="M26.4,7.8L26.4,7.8C26.4,7.9,26.4,7.9,26.4,7.8c0.5,0.3,1.3,0.5,2.2,0.5c0.9,0,1.6-0.2,2.1-0.5c0,0,0,0,0.1,0l0,6.6c0,0.4,0,0.7,0,0.9c0,0.3-0.1,0.5-0.2,0.8c-0.1,0.2-0.2,0.4-0.4,0.8l-1.1,2.1c-0.1,0.2-0.3,0.3-0.5,0.3c-0.2,0-0.4-0.1-0.5-0.3L27,17c-0.2-0.4-0.3-0.6-0.4-0.8c-0.1-0.2-0.1-0.5-0.2-0.8c0-0.2,0-0.4,0-0.9L26.4,7.8z" />
  </svg>
);

const LogIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" />
    <path d="M7 4V7M7 10V7M7 7H4M7 7H10" />
  </svg>
);

const PlanIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 15.8L7.14286 17L10 14" />
    <path d="M6 8.8L7.14286 10L10 7" />
    <path d="M13 9L18 9" />
    <path d="M13 16L18 16" />
    <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" />
  </svg>
);

const TodayIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 800 800" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="66.6667" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="133.3333">
    <path d="M575.3,700H206.7c-37.3,0-56,0-70.3-7.3c-12.5-6.4-22.7-16.6-29.1-29.1c-7.3-14.3-7.3-32.9-7.3-70.3v-320c0-37.3,0-56,7.3-70.3c6.4-12.5,16.6-22.7,29.1-29.1c14.3-7.3,32.9-7.3,70.3-7.3h386.7c37.3,0,56,0,70.3,7.3c12.5,6.4,22.7,16.6,29.1,29.1c7.3,14.3,7.3,32.9,7.3,70.3v262 M233.3,100v66.7 M566.7,100v66.7 M100,300h600" />
    <rect x="207.2" y="396.8" width="133.3" height="133.3" />
  </svg>
);

const WeekIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 800 800" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="66.6667" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="133.3333">
    <path d="M575.3,700H206.7c-37.3,0-56,0-70.3-7.3c-12.5-6.4-22.7-16.6-29.1-29.1c-7.3-14.3-7.3-32.9-7.3-70.3v-320c0-37.3,0-56,7.3-70.3c6.4-12.5,16.6-22.7,29.1-29.1c14.3-7.3,32.9-7.3,70.3-7.3h386.7c37.3,0,56,0,70.3,7.3c12.5,6.4,22.7,16.6,29.1,29.1c7.3,14.3,7.3,32.9,7.3,70.3v262 M233.3,100v66.7 M566.7,100v66.7 M100,300h600" />
    <rect x="207.2" y="396.8" width="379.3" height="133.3" />
  </svg>
);

const CalendarIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 21H6.2C5.0799 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V8.2C3 7.0799 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H17.8C18.9201 5 19.4802 5 19.908 5.21799C20.2843 5.40973 20.5903 5.71569 20.782 6.09202C21 6.51984 21 7.0799 21 8.2V10M7 3V5M17 3V5M3 9H21M13.5 13L7 13M10 17L7 17M14 21L16.025 20.595C16.2015 20.5597 16.2898 20.542 16.3721 20.5097C16.4452 20.4811 16.5147 20.4439 16.579 20.399C16.6516 20.3484 16.7152 20.2848 16.8426 20.1574L21 16C21.5523 15.4477 21.5523 14.5523 21 14C20.4477 13.4477 19.5523 13.4477 19 14L14.8426 18.1574C14.7152 18.2848 14.6516 18.3484 14.601 18.421C14.5561 18.4853 14.5189 18.5548 14.4903 18.6279C14.458 18.7102 14.4403 18.7985 14.405 18.975L14 21Z" />
  </svg>
);

const AnalysisIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M44 5H4V17H44V5Z" />
    <path d="M4 41.03L16.18 28.73L22.75 35.03L30.8 27L35.28 31.37" />
    <path d="M44 17V42" />
    <path d="M4 17V30" />
    <path d="M13 43H44" />
  </svg>
);

const RobotIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M144.851,164.786c-0.145-0.712-0.356-1.414-0.634-2.081c-0.278-0.679-0.623-1.325-1.024-1.926c-0.412-0.612-0.868-1.18-1.38-1.692c-0.523-0.512-1.091-0.979-1.703-1.38c-0.601-0.401-1.247-0.746-1.914-1.024c-0.668-0.278-1.369-0.501-2.081-0.634c-1.436-0.289-2.916-0.289-4.352,0c-0.712,0.134-1.414,0.356-2.081,0.634c-0.668,0.278-1.325,0.623-1.926,1.024c-0.612,0.401-1.18,0.868-1.692,1.38c-0.512,0.512-0.979,1.08-1.38,1.692c-0.401,0.601-0.746,1.247-1.024,1.926c-0.278,0.668-0.49,1.369-0.634,2.081c-0.145,0.712-0.223,1.447-0.223,2.17s0.078,1.458,0.223,2.17c0.145,0.712,0.356,1.414,0.634,2.081c0.278,0.679,0.623,1.325,1.024,1.926c0.401,0.612,0.868,1.18,1.38,1.692c0.512,0.512,1.08,0.979,1.692,1.38c0.601,0.412,1.258,0.746,1.926,1.024c0.668,0.278,1.369,0.501,2.081,0.646c0.712,0.134,1.447,0.211,2.17,0.211c0.735,0,1.458-0.078,2.182-0.211c0.712-0.145,1.414-0.367,2.081-0.646c0.668-0.278,1.313-0.612,1.914-1.024c0.612-0.401,1.18-0.868,1.703-1.38c0.512-0.512,0.968-1.08,1.38-1.692c0.401-0.601,0.746-1.247,1.024-1.926c0.278-0.668,0.49-1.369,0.634-2.081s0.211-1.447,0.211-2.17S144.996,165.498,144.851,164.786z" />
    <path d="M500.87,222.609h-33.391v-55.652c0-6.147-4.983-11.13-11.13-11.13H267.13v-24.175c12.955-4.595,22.261-16.966,22.261-31.477c0-18.412-14.979-33.391-33.391-33.391c-18.412,0-33.391,14.979-33.391,33.391c0,14.51,9.306,26.882,22.261,31.477v24.175h-77.171c-6.147,0-11.13,4.983-11.13,11.13s4.983,11.13,11.13,11.13h277.518v55.652v133.565v55.652H66.783v-55.652V233.739v-55.652h33.391c6.147,0,11.13-4.983,11.13-11.13s-4.983-11.13-11.13-11.13H55.652c-6.147,0-11.13,4.983-11.13,11.13v55.652H11.13c-6.147,0-11.13,4.983-11.13,11.13v133.565c0,6.147,4.983,11.13,11.13,11.13h33.391v55.652c0,6.147,4.983,11.13,11.13,11.13h400.696c6.147,0,11.13-4.983,11.13-11.13v-55.652h33.391c6.147,0,11.13-4.983,11.13-11.13V233.739C512,227.592,507.017,222.609,500.87,222.609z M256,111.304c-6.137,0-11.13-4.993-11.13-11.13c0-6.137,4.993-11.13,11.13-11.13c6.137,0,11.13,4.993,11.13,11.13C267.13,106.311,262.137,111.304,256,111.304z M44.522,356.174H22.261V244.87h22.261V356.174z M489.739,356.174h-22.261V244.87h22.261V356.174z" />
    <path d="M166.957,244.87c-18.412,0-33.391,14.979-33.391,33.391c0,18.412,14.979,33.391,33.391,33.391c18.412,0,33.391-14.979,33.391-33.391C200.348,259.849,185.369,244.87,166.957,244.87z M166.957,289.391c-6.137,0-11.13-4.993-11.13-11.13s4.993-11.13,11.13-11.13s11.13,4.993,11.13,11.13S173.094,289.391,166.957,289.391z" />
    <path d="M345.043,244.87c-18.412,0-33.391,14.979-33.391,33.391c0,18.412,14.979,33.391,33.391,33.391c18.412,0,33.391-14.979,33.391-33.391C378.435,259.849,363.455,244.87,345.043,244.87z M345.043,289.391c-6.137,0-11.13-4.993-11.13-11.13s4.993-11.13,11.13-11.13s11.13,4.993,11.13,11.13S351.181,289.391,345.043,289.391z" />
    <path d="M311.652,311.652H200.348c-6.147,0-11.13,4.983-11.13,11.13c0,36.824,29.959,66.783,66.783,66.783s66.783-29.959,66.783-66.783C322.783,316.635,317.799,311.652,311.652,311.652z M256,367.304c-20.707,0-38.158-14.21-43.113-33.391h86.226C294.158,353.094,276.707,367.304,256,367.304z" />
  </svg>
);

// Walkthrough-specific icons
const ArrowsIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v16M7 8l5-5 5 5M7 16l5 5 5-5" />
  </svg>
);

const DollarIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6.5" />
  </svg>
);

const ShieldIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.2 9 11.4C18.25 22.2 21 17.25 21 12V7l-9-5z" />
  </svg>
);

const MindIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 017 7c0 2.8-1.6 5.1-4 6.3V17H9v-1.7C6.6 14.1 5 11.8 5 9a7 7 0 017-7z" />
  </svg>
);

const PenIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.28 6.4L11.74 15.94C10.79 16.89 7.97 17.33 7.34 16.7C6.71 16.07 7.14 13.25 8.09 12.3L17.64 2.75C18.55 1.84 20.37 1.84 21.28 2.75C22.19 3.66 22.19 5.49 21.28 6.4Z" />
    <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" />
  </svg>
);

const TargetIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

const CheckIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" />
    <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" />
  </svg>
);

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
