import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/AuthScreen";
import {
  fmt,
  fmtDate,
  todayStr,
  calcPL,
  calcR,
  fmtR,
  loadTrades,
  saveTrades,
  loadTheme,
  exportCSV,
} from "./lib/utils";
import {
  STORAGE_KEY,
  THEME_KEY,
  SEED_TRADES,
} from "./lib/constants";
import { tk } from "./lib/theme";
import { useIsMobile } from "./hooks/useIsMobile";
import StatCard from "./components/StatCard";
import MiniBar from "./components/MiniBar";
import EquityCurve from "./components/EquityCurve";
import TradeRow from "./components/TradeRow";
import TradeDetail from "./components/TradeDetail";
import TradeFormModal from "./components/TradeFormModal";
import PlanModal from "./components/PlanModal";
import CSVModal from "./components/CSVModal";
import SettingsModal from "./components/SettingsModal";
import UpgradePrompt from "./components/UpgradePrompt";
import ShareModal from "./components/ShareModal";
import TradeReplay from "./components/TradeReplay";
import TutorialModal from "./components/TutorialModal";
import OnboardingModal from "./components/OnboardingModal";
import CalendarView from "./views/CalendarView";
import DaySession from "./views/DaySession";
import WeeklyReview from "./views/WeeklyReview";
import AIInsights from "./views/AIInsights";

export default function TradingJournal() {
  const { user, profile, loading: authLoading, isPro, canUseAI, aiAnalysesLeft, refreshProfile, signOut } = useAuth();
  const [planSearch, setPlanSearch] = useState("");
  const [planFilter, setPlanFilter] = useState({ type: "all", strategy: "all", tag: "all" });
  const [planPerPage, setPlanPerPage] = useState(30);
  const [planPage, setPlanPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [isDark, setIsDark] = useState(() => loadTheme() === "dark");
  useEffect(() => { if (profile?.theme) setIsDark(profile.theme === "dark"); }, [profile?.theme]);
  const [tab, setTab] = useState("today");
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [planPrefill, setPlanPrefill] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({
  type: "all",
  strategy: "all",
  tag: "all",
});
const [search, setSearch] = useState("");
const [perPage, setPerPage] = useState(30);
const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [journals, setJournals] = useState({});
  const [showReplay, setShowReplay] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [spyData, setSpyData] = useState(null);
  const [spyError, setSpyError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const journalTimerRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const mobile = useIsMobile();
  const T = tk(isDark);

  // Load trades from Supabase on login
  useEffect(() => {
    if (!user) return;
    const loadFromSupabase = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("id, data")
        .eq("user_id", user.id);
      if (error) {
        // Supabase unreachable — fall back to localStorage, don't show onboarding
        const local = loadTrades();
        setTrades(local?.length ? local : []);
      } else {
        const loaded = data.map(row => ({ ...row.data, id: row.id }));
        if (loaded.length === 0) {
          // Migrate localStorage trades if present; otherwise confirmed new user
          const local = loadTrades();
          if (local?.length) {
            const rows = local.map(t => ({ id: t.id, user_id: user.id, data: t }));
            await supabase.from("trades").upsert(rows);
            setTrades(local);
          } else {
            // Supabase confirmed zero trades — show onboarding
            setTrades([]);
            setShowOnboarding(true);
          }
        } else {
          setTrades(loaded);
        }
      }
      setTradesLoaded(true);
    };
    loadFromSupabase();
  }, [user]);

  // Sync trades to Supabase whenever they change
  useEffect(() => {
    if (!user || !tradesLoaded) return;
    saveTrades(trades); // keep localStorage as backup
    // Supabase sync is done per-operation (add/save/delete) for efficiency
  }, [trades, user, tradesLoaded]);

  const loadSampleTrades = async () => {
    const baseId = Date.now();
    const withIds = SEED_TRADES.map((t, i) => ({ ...t, id: baseId + i }));
    setTrades(withIds);
    setShowOnboarding(false);
    setTab("analytics");
    if (user) {
      const rows = withIds.map(t => ({ id: t.id, user_id: user.id, data: t }));
      await supabase.from("trades").upsert(rows);
    }
    showToast("Sample data loaded — explore your analytics!", T.accent, "log");
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const openTutorial = () => {
    setTutorialStep(0);
    setShowTutorial(true);
  };

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    if (user) supabase.from("profiles").update({ theme }).eq("id", user.id).then(() => {});
  }, [isDark, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("journals").select("data").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.data) setJournals(data.data); });
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") {
        setShowAdd(false); setShowPlan(false); setShowCSV(false);
        setShowSettings(false); setSelected(null); setSelectedPlan(null); setEditTrade(null);
      }
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowAdd(true); }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); setShowPlan(true); }
      if (e.key === "t" || e.key === "T") { setTab("today"); }
      if (e.key === "w" || e.key === "W") { setTab("weekly"); }
      if (e.key === "c" || e.key === "C") { setTab("calendar"); }
      if (e.key === "l" || e.key === "L") { setTab("trades"); setSelected(null); }
      if (e.key === "p" || e.key === "P") { setTab("plans"); }
      if (e.key === "a" || e.key === "A") { setTab("analytics"); }
      if (e.key === "i" || e.key === "I") { setTab("ai"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const showToast = (msg, color, icon = null) => {
    setToast({ msg, color, icon });
    setTimeout(() => setToast(null), 2200);
  };

  const TAB_ORDER = ["today", "weekly", "calendar", "trades", "plans", "analytics", "ai"];
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only trigger on predominantly horizontal swipes > 55px
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = TAB_ORDER.indexOf(tab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
    if (dx > 0 && idx > 0) setTab(TAB_ORDER[idx - 1]);
  };
  const saveJournal = (date, text) => {
    const updated = { ...journals, [date]: text };
    setJournals(updated);
    clearTimeout(journalTimerRef.current);
    journalTimerRef.current = setTimeout(async () => {
      if (user) await supabase.from("journals").upsert({ user_id: user.id, data: updated });
    }, 1500);
  };
  const addTrade = async (trade) => {
    if (freeTierFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    if (trade.fromPlanId) {
      setTrades((p) => [...p.filter(t => t.id !== trade.fromPlanId), trade]);
      if (user) await supabase.from("trades").delete().eq("id", trade.fromPlanId).eq("user_id", user.id);
    } else {
      setTrades((p) => [...p, trade]);
    }
    setShowAdd(false);
    setPlanPrefill(null);
    setTab("trades");
    showToast("Trade saved", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: trade.id, user_id: user.id, data: trade });
  };
  const executePlan = (plan) => {
    const prefill = {
      date: todayStr(),
      ticker: plan.ticker,
      type: plan.type,
      strategy: plan.strategy,
      direction: plan.direction || (plan.stockDirection === "buy" ? "long" : "short"),
      entryPrice: plan.entryPrice || plan.purchasePrice || "",
      exitPrice: "",
      shares: plan.shares || plan.numShares || "",
      stopLoss: plan.stopLoss || "",
      takeProfit: plan.takeProfit || "",
      tags: plan.tags || [],
      notes: plan.notes || "",
      emotion: plan.emotion || "None",
      mistake: "None",
      legs: plan.legs?.length ? plan.legs.map(l => ({ ...l, exitPremium: "" })) : [{ position:"buy",type:"call",strike:"",expiration:"",entryPremium:"",exitPremium:"",contracts:1 }],
      fromPlanId: plan.id,
    };
    setSelectedPlan(null);
    setPlanPrefill(prefill);
    setShowAdd(true);
  };
  const saveTrade = async (trade) => {
    setTrades((p) => p.map((tr) => (tr.id === trade.id ? trade : tr)));
    setEditTrade(null);
    setSelected(trade);
    showToast("Trade updated", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: trade.id, user_id: user.id, data: trade });
  };
  const savePlan = async (plan) => {
    if (freeTierPlanFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    setTrades((p) => [...p, plan]);
    setShowPlan(false);
    showToast("Trade plan saved", T.accent, "log");
    if (user) await supabase.from("trades").upsert({ id: plan.id, user_id: user.id, data: plan });
  };
  const handleUpgrade = async () => {
    if (!user) return;
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handleManageBilling = async () => {
    if (!user) return;
    const res = await fetch("/api/customer-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const freeTierFull = !isPro && trades.filter(t => t.status !== "planned" && t.date?.startsWith(currentMonth)).length >= 5;
  const freeTierPlanFull = !isPro && trades.filter(t => t.status === "planned" && t.date?.startsWith(currentMonth)).length >= 5;

  const deleteTrade = async (id) => {
    if (window.confirm("Delete this trade?")) {
      setTrades((p) => p.filter((tr) => tr.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Trade deleted", T.danger, "delete");
      if (user) await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
    }
  };
const importTrades = async (incoming) => {
  const month = new Date().toISOString().slice(0, 7);
  const thisMonthLogs = trades.filter(t => t.status !== "planned" && t.date?.startsWith(month)).length;
  const toImport = isPro ? incoming : incoming.slice(0, Math.max(0, 5 - thisMonthLogs));
  if (toImport.length === 0) { handleUpgrade(); return; }
  setTrades((p) => [...p, ...toImport]);
  setShowCSV(false);
  setPage(1);
  if (user) {
    const rows = toImport.map(t => ({ id: t.id, user_id: user.id, data: t }));
    const { error } = await supabase.from("trades").upsert(rows);
    if (error) console.error("CSV import Supabase error:", error);
  }
  if (!isPro && toImport.length < incoming.length)
    showToast(`Imported ${toImport.length}/${incoming.length} — free limit reached`, T.accent, "log");
  else
    showToast(`Imported ${toImport.length} trades`, T.accent, "log");
};
  const clearAll = () => {
    if (window.confirm("Clear all trades?")) {
      setTrades([]);
      setSelected(null);
      localStorage.removeItem(STORAGE_KEY);
      showToast("All trades cleared", T.danger, "delete");
    }
  };

const plList = useMemo(
  () => trades
    .filter((t) => t.status !== "planned" && t.date)
    .map((t) => ({ ...t, pl: calcPL(t), r: calcR(t) })),
  [trades]
);

  useEffect(() => {
    if (plList.length < 2) { setSpyData(null); setSpyError(false); return; }
    const sorted = [...plList].sort((a, b) => a.date.localeCompare(b.date));
    const fromTs = Math.floor(new Date(sorted[0].date).getTime() / 1000);
    const toTs = Math.floor(new Date(sorted[sorted.length - 1].date).getTime() / 1000) + 86400;
    fetch("/api/yf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${fromTs}&period2=${toTs}&interval=1d` }),
    })
      .then(r => r.json())
      .then(data => {
        const result = data?.chart?.result?.[0];
        const timestamps = result?.timestamp;
        const closes = result?.indicators?.quote?.[0]?.close;
        if (timestamps?.length && closes?.length) {
          setSpyData(timestamps.map((t, i) => ({
            date: new Date(t * 1000).toISOString().slice(0, 10),
            close: closes[i],
          })).filter(d => d.close != null));
          setSpyError(false);
        } else {
          setSpyData(null);
          setSpyError(true);
        }
      })
      .catch(() => { setSpyData(null); setSpyError(true); });
  }, [plList.length]);

  const allTags = useMemo(
    () => [...new Set(plList.flatMap((t) => t.tags || []))],
    [plList]
  );

  const stats = useMemo(() => {
    const wins = plList.filter((t) => t.pl > 0),
      losses = plList.filter((t) => t.pl < 0);
    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const winRate = plList.length ? wins.length / plList.length : 0;
    const avgWin = wins.length
      ? wins.reduce((s, t) => s + t.pl, 0) / wins.length
      : 0;
    const avgLoss = losses.length
      ? losses.reduce((s, t) => s + t.pl, 0) / losses.length
      : 0;
    const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
    const profitFactor = losses.length
      ? Math.abs(
          wins.reduce((s, t) => s + t.pl, 0) /
            losses.reduce((s, t) => s + t.pl, 0)
        )
      : Infinity;
    return {
      totalPL,
      winRate,
      avgWin,
      avgLoss,
      expectancy,
      profitFactor,
      total: plList.length,
      wins: wins.length,
    };
  }, [plList]);

  const stratStats = useMemo(() => {
    const map = {};
    plList.forEach((t) => {
      if (!map[t.strategy]) map[t.strategy] = { pl: 0, wins: 0, total: 0, holdSum: 0, holdCount: 0 };
      map[t.strategy].pl += t.pl;
      map[t.strategy].total++;
      if (t.pl > 0) map[t.strategy].wins++;
      if (t.holdMinutes != null) { map[t.strategy].holdSum += t.holdMinutes; map[t.strategy].holdCount++; }
    });
    return Object.entries(map)
      .map(([s, d]) => ({ strategy: s, ...d, winRate: d.wins / d.total, avgHold: d.holdCount ? Math.round(d.holdSum / d.holdCount) : null }))
      .sort((a, b) => b.pl - a.pl);
  }, [plList]);

  const maxDrawdown = useMemo(() => {
    if (!plList.length) return { value: 0, pct: 0 };
    const sorted = [...plList].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0, peak = 0, maxDD = 0;
    sorted.forEach(t => {
      running += t.pl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    return { value: maxDD, pct: peak > 0 ? maxDD / peak : 0 };
  }, [plList]);

  const dayOfWeekStats = useMemo(() => {
    const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const map = {};
    DAYS.forEach(d => { map[d] = { pl: 0, wins: 0, total: 0 }; });
    plList.forEach(t => {
      if (!t.date) return;
      const [y, mo, d] = t.date.split("-").map(Number);
      const dayName = DAYS[new Date(y, mo - 1, d).getDay()];
      map[dayName].pl += t.pl;
      map[dayName].total++;
      if (t.pl > 0) map[dayName].wins++;
    });
    return ["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => ({
      day: d, short: d.slice(0, 3), ...map[d],
      winRate: map[d].total ? map[d].wins / map[d].total : 0,
    }));
  }, [plList]);

  const mistakeStats = useMemo(() => {
    const map = {};
    plList.forEach((t) => {
      if (t.mistake && t.mistake !== "None") {
        if (!map[t.mistake]) map[t.mistake] = 0;
        map[t.mistake] += t.pl;
      }
    });
    return Object.entries(map)
      .map(([m, cost]) => ({ mistake: m, cost }))
      .sort((a, b) => a.cost - b.cost);
  }, [plList]);
const avgR = useMemo(() => {
  const withR = plList.filter(t => t.r !== null && t.r !== undefined);
  return withR.length ? withR.reduce((s, t) => s + t.r, 0) / withR.length : null;
}, [plList]);
  const filteredPlans = useMemo(() => {
  const q = planSearch.toLowerCase().trim();
  return trades
    .filter(t => t.status === "planned")
    .filter(t => planFilter.type === "all" || t.type === planFilter.type)
    .filter(t => planFilter.strategy === "all" || t.strategy === planFilter.strategy)
    .filter(t => planFilter.tag === "all" || (t.tags || []).includes(planFilter.tag))
    .filter(t => !q || [t.ticker, t.strategy, t.notes, ...(t.tags || [])].some(f => (f || "").toLowerCase().includes(q)));
}, [trades, planSearch, planFilter]);
const planList = useMemo(() => trades.filter(t => t.status === "planned"), [trades]);
const planAllTags = useMemo(() => [...new Set(planList.flatMap(t => t.tags || []))], [planList]);
const planAllStrategies = useMemo(() => [...new Set(planList.map(t => t.strategy).filter(Boolean))], [planList]);
const planTotalPages = Math.ceil(filteredPlans.length / planPerPage);
const paginatedPlans = filteredPlans.slice((planPage - 1) * planPerPage, planPage * planPerPage);
  const filtered = useMemo(() => {
  const q = search.toLowerCase().trim();
  return plList.filter((t) =>
    (filter.type === "all" || t.type === filter.type) &&
    (filter.strategy === "all" || t.strategy === filter.strategy) &&
    (filter.tag === "all" || (t.tags || []).includes(filter.tag)) &&
    (!q || [
      t.ticker,
      t.strategy,
      t.emotion,
      t.mistake,
      t.notes,
      ...(t.tags || []),
    ].some((f) => (f || "").toLowerCase().includes(q)))
  );
}, [plList, filter, search]);

const totalPages = Math.ceil(filtered.length / perPage);
const paginated = filtered
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice((page - 1) * perPage, page * perPage);
  const maxPL = Math.max(...plList.map((t) => Math.abs(t.pl)), 1);
  const nav = [
    ["today", "Today"],
    ["weekly", "Weekly"],
    ["calendar", "Calendar"],
    ["trades", "Logs"],
    ["plans", "Plans"],
    ["analytics", "Analytics"],
    ["ai", "AI Insights"],
  ];
  const sel = {
    background: T.input,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 8,
    color: T.text2,
    padding: "7px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  };

  if (authLoading || (user && !tradesLoaded)) {
    return (
      <div style={{ minHeight: "100vh", background: isDark ? "#000" : "#f4f5f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#666" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen isDark={isDark} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        transition: "background 0.2s,color 0.2s",
        position: "relative",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`   * { margin: 0; padding: 0; box-sizing: border-box; }   body { background: ${T.bg}; }   input[type="date"]::-webkit-calendar-picker-indicator {     filter: ${isDark ? "invert(1)" : "none"};     cursor: pointer;   } `}</style>

      {toast && (
        <div
          className="toast-enter"
          style={{
            position: "fixed",
            bottom: 20,
            right: 16,
            left: mobile ? 16 : "auto",
            zIndex: 300,
            background: T.card,
            border: `1px solid ${toast.color}60`,
            borderLeft: `3px solid ${toast.color}`,
            borderRadius: 10,
            padding: "11px 16px",
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            color: toast.color,
            display: "flex",
            alignItems: "center",
            justifyContent: mobile ? "center" : "flex-start",
            gap: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            minWidth: 200,
          }}
        >
          {toast.icon === "log" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {toast.icon === "plan" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 15.8L7.14286 17L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 8.8L7.14286 10L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 9L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13 16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {toast.icon === "delete" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6L18.1245 19.1327C18.0544 20.1846 17.1818 21 16.1275 21H7.8725C6.81818 21 5.94558 20.1846 5.87549 19.1327L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {toast.icon === "warning" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.32 1.55 18.68 1.56 19.04C1.57 19.4 1.68 19.75 1.88 20.06C2.08 20.37 2.36 20.62 2.69 20.79C3.02 20.96 3.39 21.04 3.76 21H20.24C20.61 21.04 20.98 20.96 21.31 20.79C21.64 20.62 21.92 20.37 22.12 20.06C22.32 19.75 22.43 19.4 22.44 19.04C22.45 18.68 22.36 18.32 22.18 18L13.71 3.86C13.52 3.56 13.26 3.31 12.95 3.13C12.64 2.96 12.29 2.87 11.94 2.87C11.59 2.87 11.24 2.96 10.93 3.13C10.62 3.31 10.36 3.56 10.17 3.86H10.29Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <div
        style={{
          borderBottom: `1px solid ${T.navBorder}`,
          background: T.navBg,
          padding: `0 ${mobile ? 14 : 24}px`,
          display: "flex",
          alignItems: "center",
          height: 54,
          position: "sticky",
          top: 0,
          zIndex: 50,
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.8" y="14.7" fill="#FF1212" width="4.3" height="12"/>
          <rect x="5.7" y="12.1" fill="#FF1212" width="0.4" height="17.1"/>
          <rect x="11.3" y="18.2" fill="#12B248" width="4.3" height="7.3"/>
          <rect x="13.2" y="16.6" fill="#12B248" width="0.4" height="10.5"/>
          <rect x="20.6" y="7.9" fill="#12B248" width="0.5" height="14.7"/>
          <rect x="18.7" y="9.4" fill="#12B248" width="4.3" height="10.7"/>
          <polyline fill="none" stroke="#3B82F6" strokeLinecap="round" strokeMiterlimit="10" points="5.6,30.7 13.7,29.4 21.3,24.5 28.6,22.2"/>
          <path fill="#87B3F4" d="M30.7,7.2c0-1.2-1-2.2-2.2-2.2c-1.2,0-2.2,1-2.2,2.2l0,0.7c0,0,0,0,0.1,0c0.5,0.2,1.2,0.5,2.1,0.5s1.6-0.2,2.1-0.5c0,0,0,0,0.1,0V7.2z"/>
          <path fill="#3B82F6" d="M26.4,7.8L26.4,7.8C26.4,7.9,26.4,7.9,26.4,7.8c0.5,0.3,1.3,0.5,2.2,0.5c0.9,0,1.6-0.2,2.1-0.5c0,0,0,0,0.1,0l0,6.6c0,0.4,0,0.7,0,0.9c0,0.3-0.1,0.5-0.2,0.8c-0.1,0.2-0.2,0.4-0.4,0.8l-1.1,2.1c-0.1,0.2-0.3,0.3-0.5,0.3c-0.2,0-0.4-0.1-0.5-0.3L27,17c-0.2-0.4-0.3-0.6-0.4-0.8c-0.1-0.2-0.1-0.5-0.2-0.8c0-0.2,0-0.4,0-0.9L26.4,7.8z"/>
        </svg>
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            color: T.accent,
            letterSpacing: 2,
          }}
        >
          LOG-FOLIO
        </div>
        {mobile ? (
          <>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setMenuOpen((o) => !o)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono', monospace",
                  display: "flex",
                  alignItems: "center",
                }}
              >
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
          <path d="M6 7H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 17H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg>
              </button>
             <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono', monospace",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
<path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg>
              </button>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 7,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none" style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> LOG
              </button>
              <button
  onClick={() => setShowPlan(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "0 16px",
                  height: 30,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
>
<svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M6 15.8L7.14286 17L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M6 8.8L7.14286 10L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M13 9L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>

</svg> PLAN
</button>
</div>
            {menuOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 54,
                  left: 0,
                  right: 0,
                  background: T.navBg,
                  borderBottom: `1px solid ${T.navBorder}`,
                  zIndex: 49,
                  padding: "8px 0",
                }}
              >
                {nav.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setSelected(null);
                      setMenuOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      background: "none",
                      border: "none",
                      color: tab === id ? T.accent : T.text2,
                      cursor: "pointer",
                      fontSize: 15,
                      padding: "12px 20px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      borderLeft:
                        tab === id
                          ? `3px solid ${T.accent}`
                          : "3px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}

              </div>
            )}
          </>
        ) : (
          <>
            {nav.map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setSelected(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: tab === id ? T.text : T.text3,
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 10px",
                  borderBottom:
                    tab === id
                      ? `2px solid ${T.accent}`
                      : "2px solid transparent",
                  height: 54,
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            ))}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
             <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  borderRadius: 8,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
              >
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
<path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg> SETTINGS
              </button>


              <button
                onClick={() => setShowAdd(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
              >
                <svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
style={{ display: "block" }}>
  <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M7 4V7M7 10V7M7 7H4M7 7H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
</svg> LOG
              </button>
              <button
  onClick={() => setShowPlan(true)}
                 style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "7px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap:6,
                }}
               >

<svg
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  fill="none"
  style={{ display: "block" }}>
  <path d="M6 15.8L7.14286 17L10 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M6 8.8L7.14286 10L10 7" stroke="#000000" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
  <path d="M13 9L18 9" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 16L18 16" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
  <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>

</svg> PLAN
</button>
            </div>
          </>
        )}
      </div>

      <div key={tab} className="tab-enter" style={{ padding: mobile ? 14 : 28 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === "ai" && (isPro
          ? <AIInsights plList={plList} t={T} mobile={mobile} />
          : <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="AI Insights" />
        )}
        {tab === "today" && (
<DaySession
            plList={plList}
            plans={trades.filter(t => t.status === "planned")}
            onAddTrade={() => setShowAdd(true)}
            onAddPlan={() => setShowPlan(true)}
            t={T}
            mobile={mobile}
            isDark={isDark}
          />
        )}

        {tab === "calendar" && (
          <CalendarView plList={plList} t={T} mobile={mobile} />
        )}

{tab === "trades" && (
  <div>
    {selected ? (
      <TradeDetail
        trade={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setEditTrade(selected);
          setSelected(null);
        }}
        onSave={(updated) => { saveTrade(updated); setSelected(updated); }}
        onShare={() => setShareTarget(selected)}
        t={T}
      />
    ) : (
      <div>
        <div style={{ marginBottom: 12 }}>
          <input
            style={{
              background: T.input,
              border: `1px solid ${T.inputBorder}`,
              borderRadius: 8,
              color: T.text,
              padding: "9px 14px",
              fontSize: 13,
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
              outline: "none",
            }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search ticker, strategy, tags, notes..."
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr auto auto auto",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <select
            style={sel}
            value={filter.type}
            onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); setPage(1); }}
          >
            <option value="all">All Types</option>
            <option value="stock">Stock</option>
            <option value="options">Options</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
          <select
            style={sel}
            value={filter.strategy}
            onChange={(e) => { setFilter((f) => ({ ...f, strategy: e.target.value })); setPage(1); }}
          >
            <option value="all">All Strategies</option>
            {[...new Set(trades.map((t) => t.strategy))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            style={sel}
            value={filter.tag}
            onChange={(e) => { setFilter((f) => ({ ...f, tag: e.target.value })); setPage(1); }}
          >
            <option value="all">All Tags</option>
            {allTags.map((tg) => (
              <option key={tg}>{tg}</option>
            ))}
          </select>
          <select
            style={{ ...sel, width: mobile ? "100%" : "auto" }}
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          {!mobile && (
            <div
              style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                color: T.text3,
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              {filtered.length} trades
            </div>
          )}
          <button
            onClick={() => exportCSV(filtered)}
            style={{ ...sel, background: T.accent + "15", border: `1px solid ${T.accent}40`, color: T.accent, cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: "nowrap", padding: "6px 12px" }}
          >
            Export CSV
          </button>
          {plList.length > 1 && (
            <button
              onClick={() => setShowReplay(true)}
              style={{ ...sel, background: "#3B82F620", border: "1px solid #3B82F640", color: "#3B82F6", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: "nowrap", padding: "6px 12px" }}
            >
              Replay
            </button>
          )}
        </div>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
          }}
        >
          {paginated.map((tr, i) => (
            <TradeRow
              key={tr.id}
              trade={tr}
              isFirst={i === 0}
              onClick={() => setSelected(tr)}
              onEdit={() => setEditTrade(tr)}
              onDelete={() => deleteTrade(tr.id)}
              t={T}
              mobile={mobile}
            />
          ))}
          {!paginated.length && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.text4,
                fontFamily: "'Space Mono',monospace",
                fontSize: 12,
              }}
            >
              No trades found
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.text2,
                borderRadius: 7,
                padding: "6px 12px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.4 : 1,
                fontSize: 13,
              }}
            >
              ‹ Prev
            </button>
            <span style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: T.text3,
            }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.text2,
                borderRadius: 7,
                padding: "6px 12px",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                opacity: page === totalPages ? 0.4 : 1,
                fontSize: 13,
              }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}
{tab === "plans" && (
  <div>
    {selectedPlan ? (
      <TradeDetail
        trade={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onEdit={() => {
          setEditTrade(selectedPlan);
          setSelectedPlan(null);
        }}
        onExecute={() => executePlan(selectedPlan)}
        onSave={(updated) => { saveTrade(updated); setSelectedPlan(updated); }}
        onShare={() => setShareTarget(selectedPlan)}
        t={T}
      />
    ) : (
      <div>
        <div style={{ marginBottom: 12 }}>
          <input
            style={{
              background: T.input,
              border: `1px solid ${T.inputBorder}`,
              borderRadius: 8,
              color: T.text,
              padding: "9px 14px",
              fontSize: 13,
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
              outline: "none",
            }}
            value={planSearch}
            onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
            placeholder="Search ticker, strategy, tags, notes..."
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr auto auto",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <select
            style={sel}
            value={planFilter.type}
            onChange={(e) => { setPlanFilter(f => ({ ...f, type: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Types</option>
            <option value="stock">Stock</option>
            <option value="options">Options</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
          <select
            style={sel}
            value={planFilter.strategy}
            onChange={(e) => { setPlanFilter(f => ({ ...f, strategy: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Strategies</option>
            {planAllStrategies.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            style={sel}
            value={planFilter.tag}
            onChange={(e) => { setPlanFilter(f => ({ ...f, tag: e.target.value })); setPlanPage(1); }}
          >
            <option value="all">All Tags</option>
            {planAllTags.map(tg => <option key={tg}>{tg}</option>)}
          </select>
          <select
            style={{ ...sel, width: mobile ? "100%" : "auto" }}
            value={planPerPage}
            onChange={(e) => { setPlanPerPage(Number(e.target.value)); setPlanPage(1); }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          {!mobile && (
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: T.text3, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
              {filteredPlans.length} plans
            </div>
          )}
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          {paginatedPlans.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: T.text4, fontFamily: "'Space Mono',monospace", fontSize: 12 }}>
              No trade plans found
            </div>
          ) : (
            paginatedPlans.map((plan, i) => (
              <TradeRow
                key={plan.id}
                trade={plan}
                isFirst={i === 0}
                onClick={() => setSelectedPlan(plan)}
                onEdit={() => setEditTrade(plan)}
                onDelete={() => deleteTrade(plan.id)}
                t={T}
                mobile={mobile}
              />
            ))
          )}
        </div>
        {planTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
            <button
              style={{ ...sel, padding: "6px 12px", cursor: planPage === 1 ? "default" : "pointer", opacity: planPage === 1 ? 0.4 : 1 }}
              disabled={planPage === 1}
              onClick={() => setPlanPage(p => p - 1)}
            >←</button>
            {Array.from({ length: planTotalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{ ...sel, padding: "6px 12px", cursor: "pointer", background: n === planPage ? T.accent : T.input, color: n === planPage ? "#fff" : T.text }}
                onClick={() => setPlanPage(n)}
              >{n}</button>
            ))}
            <button
              style={{ ...sel, padding: "6px 12px", cursor: planPage === planTotalPages ? "default" : "pointer", opacity: planPage === planTotalPages ? 0.4 : 1 }}
              disabled={planPage === planTotalPages}
              onClick={() => setPlanPage(p => p + 1)}
            >→</button>
          </div>
        )}
      </div>
    )}
  </div>
)}
        {tab === "weekly" && (
          <WeeklyReview plList={plList} t={T} mobile={mobile} />
        )}

        {tab === "analytics" && !isPro && (
          <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="Analytics" />
        )}
        {tab === "analytics" && isPro && (
          <div>
            {/* All key stats */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="Total P/L" value={fmt(stats.totalPL)} sub={`${stats.total} trades`} color={stats.totalPL >= 0 ? T.accent : T.danger} t={T} />
              <StatCard label="Win Rate" value={`${(stats.winRate * 100).toFixed(0)}%`} sub={`${stats.wins}W/${stats.total - stats.wins}L`} t={T} />
              <StatCard label="Expectancy" value={fmt(stats.expectancy)} sub="per trade" color={stats.expectancy >= 0 ? T.accent : T.danger} t={T} />
              <StatCard label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} sub="wins/losses" t={T} />
              <StatCard label="Avg R" value={avgR !== null ? fmtR(avgR) : "—"} sub="per closed trade" color={avgR !== null && avgR >= 0 ? T.accent : avgR !== null ? T.danger : undefined} t={T} />
              <StatCard label="Avg Win" value={fmt(stats.avgWin)} color={T.accent} t={T} />
              <StatCard label="Avg Loss" value={fmt(stats.avgLoss)} color={T.danger} t={T} />
              <StatCard label="Best Trade" value={plList.length ? fmt(Math.max(...plList.map(t => t.pl))) : "—"} color={T.accent} t={T} />
              <StatCard label="Worst Trade" value={plList.length ? fmt(Math.min(...plList.map(t => t.pl))) : "—"} color={T.danger} t={T} />
              <StatCard label="Max Drawdown" value={maxDrawdown.value > 0 ? `-${fmt(maxDrawdown.value)}` : "—"} sub={maxDrawdown.pct > 0 ? `${(maxDrawdown.pct * 100).toFixed(1)}% of peak` : "no drawdown"} color={maxDrawdown.value > 0 ? T.danger : undefined} t={T} />
            </div>

            {/* Equity Curve */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                Equity Curve
              </div>
              <EquityCurve trades={plList} t={T} spyData={spyData} spyError={spyError} />
            </div>

            {/* Strategy + Tag/Emotion */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                  Strategy Performance
                </div>
                {(() => {
                  const maxStratPL = Math.max(...stratStats.map(s => Math.abs(s.pl)), 1);
                  return stratStats.map((s) => (
                    <div key={s.strategy} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: T.text2 }}>{s.strategy}</span>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {s.avgHold != null && (
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>
                              {s.avgHold < 60 ? `${s.avgHold}m` : `${Math.floor(s.avgHold/60)}h${s.avgHold%60}m`}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>{(s.winRate * 100).toFixed(0)}%WR</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: s.pl >= 0 ? T.accent : T.danger }}>{s.pl >= 0 ? "+" : ""}{fmt(s.pl)}</span>
                        </div>
                      </div>
                      <MiniBar value={s.pl} max={maxStratPL} t={T} />
                    </div>
                  ));
                })()}
              </div>

              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                  Tag Performance
                </div>
                {allTags.length === 0 ? (
                  <div style={{ color: T.text3, fontSize: 13 }}>No tags added yet</div>
                ) : (
                  allTags.map((tag) => {
                    const tagged = plList.filter((tr) => (tr.tags || []).includes(tag));
                    const tagPL = tagged.reduce((s, tr) => s + tr.pl, 0);
                    const tagWR = tagged.length ? tagged.filter((tr) => tr.pl > 0).length / tagged.length : 0;
                    return (
                      <div key={tag} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 13, color: T.text2 }}>{tag} <span style={{ fontSize: 10, color: T.text3 }}>({tagged.length})</span></span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>{(tagWR * 100).toFixed(0)}%WR</span>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: tagPL >= 0 ? T.accent : T.danger }}>{tagPL >= 0 ? "+" : ""}{fmt(tagPL)}</span>
                          </div>
                        </div>
                        <MiniBar value={tagPL} max={maxPL} t={T} />
                      </div>
                    );
                  })
                )}
                <div style={{ marginTop: 18, fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
                  Emotion Impact
                </div>
                {Object.entries(
                  plList.reduce((acc, tr) => { if (!acc[tr.emotion]) acc[tr.emotion] = 0; acc[tr.emotion] += tr.pl; return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).map(([em, val]) => (
                  <div key={em} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>{em}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: val >= 0 ? T.accent : T.danger }}>{val >= 0 ? "+" : ""}{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "mistakes" && (
          <div>
            <div
              style={{
                background: T.danger + "08",
                border: `1px solid ${T.danger}20`,
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: T.danger,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 5,
                }}
              >
                Total Cost of Mistakes
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  color: T.danger,
                }}
              >
                {fmt(mistakeStats.reduce((s, m) => s + m.cost, 0))}
              </div>
            </div>
            {mistakeStats.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: T.text4,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 12,
                }}
              >
                No mistakes logged — nice discipline.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {mistakeStats.map((m) => (
                  <div
                    key={m.mistake}
                    style={{
                      background: T.danger + "06",
                      border: `1px solid ${T.danger}15`,
                      borderRadius: 10,
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 14, color: T.text, marginBottom: 3 }}
                      >
                        {m.mistake}
                      </div>
                      <div style={{ fontSize: 12, color: T.text3 }}>
                        {plList.filter((tr) => tr.mistake === m.mistake).length}{" "}
                        occurrence(s)
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.danger,
                      }}
                    >
                      {fmt(m.cost)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 10,
                  color: T.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Flagged Trades
              </div>
              {plList
                .filter((tr) => tr.mistake && tr.mistake !== "None")
                .map((tr) => (
                  <div
                    key={tr.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {mobile ? (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 14,
                              fontWeight: 700,
                              color: T.text,
                            }}
                          >
                            {tr.ticker}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 13,
                              fontWeight: 700,
                              color: tr.pl >= 0 ? T.accent : T.danger,
                            }}
                          >
                            {tr.pl >= 0 ? "+" : ""}
                            {fmt(tr.pl)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.danger,
                            background: T.danger + "12",
                            borderRadius: 5,
                            padding: "2px 7px",
                          }}
                        >
                          {tr.mistake}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "85px 65px 1fr 100px 85px",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: T.text3,
                          }}
                        >
                          {fmtDate(tr.date)}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {tr.ticker}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: T.danger,
                            background: T.danger + "12",
                            borderRadius: 5,
                            padding: "2px 7px",
                            display: "inline-block",
                          }}
                        >
                          {tr.mistake}
                        </span>
                        <span style={{ fontSize: 12, color: T.text3 }}>
                          {tr.strategy}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            color: tr.pl >= 0 ? T.accent : T.danger,
                            textAlign: "right",
                          }}
                        >
                          {tr.pl >= 0 ? "+" : ""}
                          {fmt(tr.pl)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          {/* Day of Week */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
              Performance by Day
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: 10 }}>
              {dayOfWeekStats.map(d => (
                <div key={d.day} style={{ textAlign: "center", background: T.card2, borderRadius: 10, padding: "12px 8px" }}>
                  <div style={{ fontSize: 10, color: T.text3, fontFamily: "'Space Mono',monospace", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{d.short}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: d.total === 0 ? T.text4 : d.pl >= 0 ? T.accent : T.danger }}>
                    {d.total === 0 ? "—" : `${d.pl >= 0 ? "+" : ""}${fmt(d.pl)}`}
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                    {d.total === 0 ? "no trades" : `${(d.winRate * 100).toFixed(0)}% WR · ${d.total}t`}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>

{showAdd && (
        <TradeFormModal
          initial={planPrefill || undefined}
          editLabel={planPrefill ? "Execute Plan" : undefined}
          onClose={() => { setShowAdd(false); setPlanPrefill(null); }}
          onSave={addTrade}
          onCSVImport={() => { setShowAdd(false); setPlanPrefill(null); setShowCSV(true); }}
          t={T}
          isDark={isDark}
        />
      )}
      {editTrade && editTrade.status === "planned" && (
        <PlanModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={(plan) => { saveTrade(plan); setEditTrade(null); }}
          t={T}
          isDark={isDark}
        />
      )}
      {editTrade && editTrade.status !== "planned" && (
        <TradeFormModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={saveTrade}
          onCSVImport={() => { setEditTrade(null); setShowCSV(true); }}
          t={T}
          isDark={isDark}
        />
      )}
      {showCSV && (
        <CSVModal
          onClose={() => setShowCSV(false)}
          onImport={importTrades}
          t={T}
        />
      )}
      {showSettings && (
  <SettingsModal
    onClose={() => setShowSettings(false)}
    isDark={isDark}
    setIsDark={setIsDark}
    onClear={clearAll}
    t={T}
    onSignOut={() => { setShowSettings(false); signOut(); }}
    isPro={isPro}
    onUpgrade={() => { setShowSettings(false); handleUpgrade(); }}
    onManageBilling={() => { setShowSettings(false); handleManageBilling(); }}
    onTutorial={openTutorial}
  />
)}
      {showPlan && (
  <PlanModal
    onClose={() => setShowPlan(false)}
    onSave={savePlan}
    t={T}
    isDark={isDark}
  />
)}
      {showReplay && plList.length > 0 && (
        <TradeReplay trades={plList} onClose={() => setShowReplay(false)} t={T} />
      )}
      {shareTarget && (
        <ShareModal trade={shareTarget} onClose={() => setShareTarget(null)} t={T} isDark={isDark} />
      )}

      {showOnboarding && (
        <OnboardingModal onLoadSample={loadSampleTrades} onStartFresh={dismissOnboarding} t={T} />
      )}

      {/* Tutorial — shown after "Start Fresh" from onboarding */}
      {showTutorial && (
        <TutorialModal
          step={tutorialStep}
          onNext={() => setTutorialStep(s => s + 1)}
          onPrev={() => setTutorialStep(s => s - 1)}
          onClose={() => { setShowTutorial(false); setShowGuide(true); }}
          onOpenLog={() => setShowAdd(true)}
          onOpenPlan={() => setShowPlan(true)}
          onSetTab={setTab}
          t={T}
        />
      )}
    </div>
  );
}
