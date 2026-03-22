import { useState, useMemo, useEffect, useRef } from "react";
import { LogIcon, PlanIcon, CloseIcon, CheckIcon, WarningIcon, DeleteIcon, SettingsIcon, MenuIcon, LogoIcon } from "./lib/icons";
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
  setCurrency,
  setTimezone,
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
import ErrorBoundary from "./components/ErrorBoundary";
import CalendarView from "./views/CalendarView";
import DaySession from "./views/DaySession";
import WeeklyReview from "./views/WeeklyReview";
import AIInsights from "./views/AIInsights";
import JournalView from "./views/JournalView";

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
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, ticker, isPlan }
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
  const [tradeDefaults, setTradeDefaults] = useState({ type: "stock", strategy: "Breakout", direction: "long" });
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

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const loadSeedTrades = async () => {
    setShowOnboarding(false);
    const seeded = SEED_TRADES.map(t => ({ ...t, id: Date.now() + Math.random() }));
    setTrades(seeded);
    if (user) {
      const rows = seeded.map(t => ({ id: t.id, user_id: user.id, data: t }));
      await supabase.from("trades").upsert(rows);
    }
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
    if (profile?.trade_defaults) setTradeDefaults(profile.trade_defaults);
  }, [profile]);

  const saveTradeDefaults = (defaults) => {
    setTradeDefaults(defaults);
    if (user) supabase.from("profiles").update({ trade_defaults: defaults }).eq("id", user.id).then(() => {});
  };

  useEffect(() => {
    setCurrency(tradeDefaults.currency);
    setTimezone(tradeDefaults.timezone);
  }, [tradeDefaults.currency, tradeDefaults.timezone]);

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

  const TAB_ORDER = ["today", "weekly", "calendar", "trades", "plans", "analytics", "ai", "journal"];
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

  const currentMonth = todayStr().slice(0, 7);
  const freeTierFull = !isPro && trades.filter(t => t.status !== "planned" && t.date?.startsWith(currentMonth)).length >= 5;
  const freeTierPlanFull = !isPro && trades.filter(t => t.status === "planned" && t.date?.startsWith(currentMonth)).length >= 5;

  const deleteTrade = (id) => {
    const trade = trades.find((tr) => tr.id === id);
    setConfirmDelete({ id, ticker: trade?.ticker || "this entry", isPlan: trade?.status === "planned" });
  };
  const confirmDeleteExec = async () => {
    const { id } = confirmDelete;
    setConfirmDelete(null);
    if (id === "__ALL__") { await clearAllExec(); return; }
    setTrades((p) => p.filter((tr) => tr.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Deleted", T.danger, "delete");
    if (user) await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
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
    setConfirmDelete({ id: "__ALL__", ticker: "all trades", isPlan: false });
  };
  const clearAllExec = async () => {
    setTrades([]);
    setSelected(null);
    localStorage.removeItem(STORAGE_KEY);
    showToast("All trades cleared", T.danger, "delete");
    if (user) await supabase.from("trades").delete().eq("user_id", user.id);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch("/api/yf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
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
    });
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

const avgR = useMemo(() => {
  const withR = plList.filter(t => t.r !== null && t.r !== undefined);
  return withR.length ? withR.reduce((s, t) => s + t.r, 0) / withR.length : null;
}, [plList]);

const tickerBreakdown = useMemo(() => {
  const map = {};
  plList.forEach(t => {
    if (!map[t.ticker]) map[t.ticker] = { pl: 0, total: 0, wins: 0 };
    map[t.ticker].pl += t.pl;
    map[t.ticker].total++;
    if (t.pl > 0) map[t.ticker].wins++;
  });
  return Object.entries(map)
    .map(([ticker, d]) => ({ ticker, ...d, winRate: d.total ? d.wins / d.total : 0 }))
    .sort((a, b) => b.pl - a.pl);
}, [plList]);

const mistakeBreakdown = useMemo(() => {
  const map = {};
  plList.forEach(t => {
    if (t.mistake && t.mistake !== "None") {
      if (!map[t.mistake]) map[t.mistake] = { cost: 0, count: 0 };
      map[t.mistake].cost += t.pl;
      map[t.mistake].count++;
    }
  });
  return Object.entries(map)
    .map(([mistake, d]) => ({ mistake, ...d }))
    .sort((a, b) => a.cost - b.cost);
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

  // ── Time performance (analytics tab) ────────────────────────────────────
  const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const stratLeaderboard = useMemo(() => {
    const map = {};
    plList.forEach(tr => {
      const s = tr.strategy || "Unknown";
      if (!map[s]) map[s] = { wins: 0, total: 0, pl: 0 };
      map[s].total++; map[s].pl += tr.pl;
      if (tr.pl > 0) map[s].wins++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, winRate: d.total ? d.wins / d.total : 0 }))
      .sort((a, b) => b.pl - a.pl);
  }, [plList]);
  const dowBreakdown = useMemo(() => {
    const map = {};
    DAYS_ORDER.forEach(d => { map[d] = { wins: 0, total: 0, pl: 0 }; });
    plList.forEach(tr => {
      const d = new Date(tr.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
      if (map[d]) { map[d].total++; map[d].pl += tr.pl; if (tr.pl > 0) map[d].wins++; }
    });
    return DAYS_ORDER.map(day => ({ day, ...map[day] })).filter(d => d.total > 0);
  }, [plList]);
  const hourHeatmap = useMemo(() => {
    const map = {};
    plList.forEach(tr => {
      if (!tr.entryTime) return;
      const h = parseInt(tr.entryTime.split(":")[0], 10);
      if (isNaN(h)) return;
      if (!map[h]) map[h] = { wins: 0, total: 0, pl: 0 };
      map[h].total++; map[h].pl += tr.pl;
      if (tr.pl > 0) map[h].wins++;
    });
    return map;
  }, [plList]);
  const activeHours = Object.keys(hourHeatmap).map(Number).sort((a, b) => hourHeatmap[b].pl - hourHeatmap[a].pl);
  const maxTimeAbsPL = Math.max(
    ...dowBreakdown.map(d => Math.abs(d.pl)),
    ...activeHours.map(h => Math.abs(hourHeatmap[h].pl)),
    1
  );

  const nav = [
    ["today", "Today"],
    ["weekly", "Weekly"],
    ["calendar", "Calendar"],
    ["trades", "Logs"],
    ["plans", "Plans"],
    ["analytics", "Analytics"],
    ["ai", "AI Insights"],
    ["journal", "Journal"],
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
          {toast.icon === "log" && <CheckIcon size={14} />}
          {toast.icon === "plan" && <PlanIcon size={14} />}
          {toast.icon === "delete" && <DeleteIcon size={14} />}
          {toast.icon === "warning" && <WarningIcon size={14} />}
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
        <LogoIcon width={28} height={28} />
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
          <MenuIcon size="1em" />
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
                <SettingsIcon size="1em" />
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
                <LogIcon size="1em" /> LOG
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
<PlanIcon size="1em" /> PLAN
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
                <SettingsIcon size="1em" /> SETTINGS
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

<PlanIcon size="1em" /> PLAN
</button>
            </div>
          </>
        )}
      </div>

      <div key={tab} className="tab-enter" style={{ padding: mobile ? 14 : 28 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === "ai" && (
          <ErrorBoundary compact>
            {isPro
              ? <AIInsights plList={plList} t={T} mobile={mobile} />
              : <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="AI Insights" />
            }
          </ErrorBoundary>
        )}
        {tab === "today" && (
          <ErrorBoundary compact>
            <DaySession
              plList={plList}
              plans={trades.filter(t => t.status === "planned")}
              onAddTrade={() => setShowAdd(true)}
              onAddPlan={() => setShowPlan(true)}
              t={T}
              mobile={mobile}
              isDark={isDark}
            />
          </ErrorBoundary>
        )}

        {tab === "calendar" && (
          <ErrorBoundary compact>
            <CalendarView plList={plList} t={T} mobile={mobile} />
          </ErrorBoundary>
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
          <ErrorBoundary compact>
            <WeeklyReview plList={plList} t={T} mobile={mobile} />
          </ErrorBoundary>
        )}

        {tab === "analytics" && !isPro && (
          <UpgradePrompt t={T} onUpgrade={handleUpgrade} feature="Analytics" />
        )}
        {tab === "analytics" && isPro && (
          <ErrorBoundary compact>
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

            {/* Strategy Leaderboard */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Strategy Leaderboard</div>
              {stratLeaderboard.length === 0 ? (
                <div style={{ fontSize: 13, color: T.text3, fontStyle: "italic" }}>Log trades with strategies to see rankings.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stratLeaderboard.map((s, i) => {
                    const winPct = Math.round(s.winRate * 100);
                    const plColor = s.pl >= 0 ? T.accent : T.danger;
                    const rankColors = ["#f59e0b", T.text3, "#cd7f32"];
                    return (
                      <div key={s.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 12, alignItems: "center" }}>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: i < 3 ? rankColors[i] : T.text4, fontWeight: 700, textAlign: "center" }}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontSize: 11, color: T.text3 }}>{s.total} trade{s.total !== 1 ? "s" : ""}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${winPct}%`, borderRadius: 3, background: winPct >= 50 ? T.accent : T.danger, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 72 }}>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: winPct >= 50 ? T.accent : T.danger, fontWeight: 700 }}>{winPct}%WR</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: plColor }}>{s.pl >= 0 ? "+" : ""}{fmt(s.pl)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Day of Week + Best Time to Trade — matching row format */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Day of Week */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Day of Week</div>
                {dowBreakdown.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.text3 }}>No trade data yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...dowBreakdown].sort((a, b) => b.pl - a.pl).map(({ day, total, wins, pl }) => {
                      const winPct = Math.round((wins / total) * 100);
                      const avgPL = pl / total;
                      const color = pl >= 0 ? T.accent : T.danger;
                      const barWidth = Math.round((Math.abs(pl) / maxTimeAbsPL) * 100);
                      return (
                        <div key={day}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: T.text, fontWeight: 700, minWidth: 34 }}>{day}</span>
                              <span style={{ fontSize: 12, color, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{winPct}%</span>
                              <span style={{ fontSize: 11, color: T.text3 }}>{total} trade{total !== 1 ? "s" : ""}</span>
                            </div>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color }}>{avgPL >= 0 ? "+" : ""}{fmt(avgPL)} avg</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: T.border2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>Sorted by total P&L · bar shows relative performance</div>
                  </div>
                )}
              </div>

              {/* Best Time to Trade */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Best Time to Trade</div>
                {activeHours.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.text3 }}>Add entry times when logging trades to unlock hourly performance data.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeHours.map(h => {
                      const d = hourHeatmap[h];
                      const color = d.pl >= 0 ? T.accent : T.danger;
                      const winPct = Math.round((d.wins / d.total) * 100);
                      const barWidth = Math.round((Math.abs(d.pl) / maxTimeAbsPL) * 100);
                      const label = h < 10 ? `0${h}:00` : `${h}:00`;
                      const avgPL = d.pl / d.total;
                      return (
                        <div key={h}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: T.text, fontWeight: 700, minWidth: 44 }}>{label}</span>
                              <span style={{ fontSize: 12, color, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{winPct}%</span>
                              <span style={{ fontSize: 11, color: T.text3 }}>{d.total} trade{d.total !== 1 ? "s" : ""}</span>
                            </div>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color }}>{avgPL >= 0 ? "+" : ""}{fmt(avgPL)} avg</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: T.border2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>Sorted by total P&L · bar shows relative performance</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tag Performance + Emotion Impact */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
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
            </div>

            {/* Emotion Impact */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                Emotion Impact
              </div>
              {plList.length === 0 ? (
                <div style={{ color: T.text3, fontSize: 13 }}>No trades logged yet</div>
              ) : (
                Object.entries(
                  plList.reduce((acc, tr) => {
                    const em = tr.emotion && tr.emotion !== "None" ? tr.emotion : "None";
                    if (!acc[em]) acc[em] = { pl: 0, count: 0, wins: 0 };
                    acc[em].pl += tr.pl; acc[em].count++; if (tr.pl > 0) acc[em].wins++;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1].pl - a[1].pl).map(([em, d]) => {
                  const winPct = Math.round((d.wins / d.count) * 100);
                  return (
                    <div key={em} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                      <div>
                        <span style={{ fontSize: 13, color: T.text2 }}>{em}</span>
                        <span style={{ fontSize: 10, color: T.text3, marginLeft: 8 }}>{d.count} trade{d.count !== 1 ? "s" : ""} · {winPct}%WR</span>
                      </div>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: d.pl >= 0 ? T.accent : T.danger }}>{d.pl >= 0 ? "+" : ""}{fmt(d.pl)}</span>
                    </div>
                  );
                })
              )}
            </div>
            </div>

            {/* Ticker Performance + Mistake Cost */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Ticker Performance */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Ticker Performance</div>
                {tickerBreakdown.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.text3 }}>No trades logged yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tickerBreakdown.slice(0, 8).map(({ ticker, pl, total, winRate }) => {
                      const winPct = Math.round(winRate * 100);
                      const color = pl >= 0 ? T.accent : T.danger;
                      const maxAbs = Math.max(...tickerBreakdown.map(t => Math.abs(t.pl)), 1);
                      const barWidth = Math.round((Math.abs(pl) / maxAbs) * 100);
                      return (
                        <div key={ticker}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: T.text, fontWeight: 700, minWidth: 52 }}>{ticker}</span>
                              <span style={{ fontSize: 12, color, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{winPct}%</span>
                              <span style={{ fontSize: 11, color: T.text3 }}>{total}t</span>
                            </div>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color }}>{pl >= 0 ? "+" : ""}{fmt(pl)}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    {tickerBreakdown.length > 8 && (
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>+{tickerBreakdown.length - 8} more tickers</div>
                    )}
                  </div>
                )}
              </div>

              {/* Mistake Cost */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Mistake Cost</div>
                {mistakeBreakdown.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.text3 }}>No mistakes flagged yet — nice discipline.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {mistakeBreakdown.map(({ mistake, cost, count }) => {
                      const maxAbs = Math.max(...mistakeBreakdown.map(m => Math.abs(m.cost)), 1);
                      const barWidth = Math.round((Math.abs(cost) / maxAbs) * 100);
                      return (
                        <div key={mistake}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 12, color: T.text }}>{mistake}</span>
                              <span style={{ fontSize: 11, color: T.text3 }}>{count}×</span>
                            </div>
                            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: cost >= 0 ? T.accent : T.danger }}>{cost >= 0 ? "+" : ""}{fmt(cost)}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: T.danger, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                      Total cost: <span style={{ color: T.danger, fontFamily: "'Space Mono',monospace" }}>{fmt(mistakeBreakdown.reduce((s, m) => s + m.cost, 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </ErrorBoundary>
        )}

        {tab === "journal" && (
          <JournalView journals={journals} onSave={saveJournal} t={T} mobile={mobile} />
        )}

      </div>

{showAdd && (
        <TradeFormModal
          initial={planPrefill || undefined}
          defaults={planPrefill ? undefined : tradeDefaults}
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
    user={user}
    onSignOut={() => { setShowSettings(false); signOut(); }}
    isPro={isPro}
    onUpgrade={() => { setShowSettings(false); handleUpgrade(); }}
    onManageBilling={() => { setShowSettings(false); handleManageBilling(); }}
    onTutorial={openTutorial}
    tradeDefaults={tradeDefaults}
    onSaveDefaults={saveTradeDefaults}
    trades={trades}
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
        <OnboardingModal onStartFresh={dismissOnboarding} onLoadSamples={loadSeedTrades} t={T} />
      )}

      {/* Tutorial — shown after "Start Fresh" from onboarding */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 28px 24px", maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.danger + "15", border: `1px solid ${T.danger}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6H5H21M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Delete {confirmDelete.isPlan ? "plan" : "trade"}?
            </div>
            <div style={{ fontSize: 13, color: T.text3, marginBottom: 24 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", color: T.text2 }}>{confirmDelete.ticker}</span> will be permanently removed.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 0", color: T.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExec}
                style={{ flex: 1, background: T.danger, border: "none", borderRadius: 10, padding: "10px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
