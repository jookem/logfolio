import { useState, useMemo, useEffect, useRef } from "react";
import { LogIcon, PlanIcon, CloseIcon, CheckIcon, WarningIcon, DeleteIcon, SettingsIcon, MenuIcon, LogoIcon } from "./lib/icons";
import { supabase } from "./lib/supabase";
import { uploadTradeMedia, deleteTradeMedia, deleteAllUserMedia } from "./lib/media";
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
  const { user, profile, loading: authLoading, isPro, isProPlus, canUseAI, aiAnalysesLeft, refreshProfile, signOut, isPasswordRecovery, setIsPasswordRecovery } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [pwResetMsg, setPwResetMsg] = useState(null);
  const [pwResetErr, setPwResetErr] = useState(null);
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
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const toggleBulk = (id) => setBulkSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearBulk = () => setBulkSelected(new Set());
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
          // Only migrate localStorage if it belongs to this exact user
          const local = loadTrades();
          const localUserId = localStorage.getItem("tradelog_user_id");
          if (local?.length && localUserId === user.id) {
            const rows = local.map(t => ({ id: t.id, user_id: user.id, data: t }));
            await supabase.from("trades").upsert(rows);
            setTrades(local);
          } else {
            // Supabase confirmed zero trades — show onboarding (only if not already dismissed)
            saveTrades([]);
            setTrades([]);
            if (!localStorage.getItem(`tradelog_onboarding_done_${user.id}`)) {
              setShowOnboarding(true);
            }
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
    localStorage.setItem("tradelog_user_id", user.id);
    // Supabase sync is done per-operation (add/save/delete) for efficiency
  }, [trades, user, tradesLoaded]);

  const dismissOnboarding = () => {
    if (user) localStorage.setItem(`tradelog_onboarding_done_${user.id}`, "1");
    setShowOnboarding(false);
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const loadSeedTrades = async () => {
    if (user) localStorage.setItem(`tradelog_onboarding_done_${user.id}`, "1");
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
  const addTrade = (trade) => {
    if (freeTierFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    if (trade.fromPlanId) {
      setTrades((p) => [...p.filter(t => t.id !== trade.fromPlanId), trade]);
      if (user) {
        supabase.from("trades").delete().eq("id", trade.fromPlanId).eq("user_id", user.id).then(() => {});
        deleteTradeMedia(user.id, trade.fromPlanId);
      }
    } else {
      setTrades((p) => [...p, trade]);
    }
    setShowAdd(false);
    setPlanPrefill(null);
    setTab("trades");
    showToast("Trade saved", T.accent, "log");
    if (user) {
      (async () => {
        const uploaded = await uploadTradeMedia(user.id, trade);
        setTrades((p) => p.map((t) => t.id === trade.id ? uploaded : t));
        const { error } = await supabase.from("trades").upsert({ id: uploaded.id, user_id: user.id, data: uploaded });
        if (error) {
          // Server rejected — roll back optimistic update
          setTrades((p) => p.filter((t) => t.id !== trade.id));
          showToast("Save failed — free tier limit reached", "#ff4d6d", "warning");
        }
      })();
    }
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
  const saveTrade = (trade) => {
    setTrades((p) => p.map((tr) => (tr.id === trade.id ? trade : tr)));
    setEditTrade(null);
    setSelected(trade);
    showToast("Trade updated", T.accent, "log");
    if (user) {
      (async () => {
        const uploaded = await uploadTradeMedia(user.id, trade);
        setTrades((p) => p.map((t) => t.id === trade.id ? uploaded : t));
        setSelected(uploaded);
        supabase.from("trades").upsert({ id: uploaded.id, user_id: user.id, data: uploaded }).then(() => {});
      })();
    }
  };
  const savePlan = (plan) => {
    if (freeTierPlanFull) { showToast("Free tier limit reached — upgrade to Pro", "#ff4d6d", "warning"); return; }
    setTrades((p) => [...p, plan]);
    setShowPlan(false);
    showToast("Trade plan saved", T.accent, "log");
    if (user) {
      (async () => {
        const uploaded = await uploadTradeMedia(user.id, plan);
        setTrades((p) => p.map((t) => t.id === plan.id ? uploaded : t));
        const { error } = await supabase.from("trades").upsert({ id: uploaded.id, user_id: user.id, data: uploaded });
        if (error) {
          setTrades((p) => p.filter((t) => t.id !== plan.id));
          showToast("Save failed — free tier limit reached", "#ff4d6d", "warning");
        }
      })();
    }
  };
  const handleUpgrade = async (plan = "pro") => {
    if (!user) return;
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email, plan }),
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
  const confirmDeleteExec = () => {
    const { id } = confirmDelete;
    setConfirmDelete(null);
    if (id === "__ALL__") { clearAllExec(); return; }
    setTrades((p) => p.filter((tr) => tr.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Deleted", T.danger, "delete");
    if (user) {
      supabase.from("trades").delete().eq("id", id).eq("user_id", user.id).then(() => {});
      deleteTradeMedia(user.id, id);
    }
  };
  const bulkDelete = () => {
    const ids = [...bulkSelected];
    setTrades(p => p.filter(tr => !ids.includes(tr.id)));
    if (ids.includes(selected?.id)) setSelected(null);
    clearBulk();
    showToast(`Deleted ${ids.length} trade${ids.length > 1 ? "s" : ""}`, T.danger, "delete");
    if (user) ids.forEach(id => {
      supabase.from("trades").delete().eq("id", id).eq("user_id", user.id).then(() => {});
      deleteTradeMedia(user.id, id);
    });
  };

const importTrades = (incoming) => {
  const month = new Date().toISOString().slice(0, 7);
  const thisMonthLogs = trades.filter(t => t.status !== "planned" && t.date?.startsWith(month)).length;
  const toImport = isPro ? incoming : incoming.slice(0, Math.max(0, 5 - thisMonthLogs));
  if (toImport.length === 0) { handleUpgrade("pro"); return; }
  setTrades((p) => [...p, ...toImport]);
  setShowCSV(false);
  setPage(1);
  if (user) {
    const rows = toImport.map(t => ({ id: t.id, user_id: user.id, data: t }));
    supabase.from("trades").upsert(rows).then(() => {});
  }
  if (!isPro && toImport.length < incoming.length)
    showToast(`Imported ${toImport.length}/${incoming.length} — free limit reached`, T.accent, "log");
  else
    showToast(`Imported ${toImport.length} trades`, T.accent, "log");
};
  const clearAll = () => {
    setConfirmDelete({ id: "__ALL__", ticker: "all trades", isPlan: false });
  };
  const clearAllExec = () => {
    setTrades([]);
    setSelected(null);
    localStorage.removeItem(STORAGE_KEY);
    showToast("All trades cleared", T.danger, "delete");
    if (user) {
      supabase.from("trades").delete().eq("user_id", user.id).then(() => {});
      deleteAllUserMedia(user.id);
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
    const n = plList.length;
    const meanPL = n ? totalPL / n : 0;
    const stdDev = n > 1
      ? Math.sqrt(plList.reduce((s, t) => s + Math.pow(t.pl - meanPL, 2), 0) / (n - 1))
      : 0;
    const sharpe = stdDev > 0 ? meanPL / stdDev : null;
    const downsideDev = n > 1
      ? Math.sqrt(plList.reduce((s, t) => s + Math.pow(Math.min(t.pl, 0), 2), 0) / (n - 1))
      : 0;
    const sortino = downsideDev > 0 ? meanPL / downsideDev : null;
    return {
      totalPL,
      winRate,
      avgWin,
      avgLoss,
      expectancy,
      profitFactor,
      sharpe,
      sortino,
      total: plList.length,
      wins: wins.length,
    };
  }, [plList]);

  // Treynor and Information Ratio — require SPY benchmark data
  const benchmarkStats = useMemo(() => {
    if (!spyData || spyData.length < 2 || plList.length < 2) return { treynor: null, alpha: null, infoRatio: null };

    // Build SPY daily return map: date -> pct return vs prior day
    const spyReturnMap = {};
    for (let i = 1; i < spyData.length; i++) {
      const ret = (spyData[i].close - spyData[i - 1].close) / spyData[i - 1].close;
      spyReturnMap[spyData[i].date] = ret;
    }

    // Group trade P/L by date
    const dailyPL = {};
    plList.forEach((t) => {
      dailyPL[t.date] = (dailyPL[t.date] || 0) + t.pl;
    });

    // Use accountSize to convert P/L to % return; fall back to normalising by mean abs P/L
    const accountSize = tradeDefaults?.accountSize;
    const tradingDates = Object.keys(dailyPL).filter((d) => spyReturnMap[d] !== undefined);
    if (tradingDates.length < 2) return { treynor: null, alpha: null, infoRatio: null };

    const portReturns = tradingDates.map((d) =>
      accountSize ? dailyPL[d] / accountSize : dailyPL[d]
    );
    const mktReturns = tradingDates.map((d) => spyReturnMap[d]);

    const n = tradingDates.length;
    const meanPort = portReturns.reduce((s, v) => s + v, 0) / n;
    const meanMkt = mktReturns.reduce((s, v) => s + v, 0) / n;

    // Beta = Cov(port, mkt) / Var(mkt)
    let cov = 0, varMkt = 0;
    for (let i = 0; i < n; i++) {
      cov += (portReturns[i] - meanPort) * (mktReturns[i] - meanMkt);
      varMkt += Math.pow(mktReturns[i] - meanMkt, 2);
    }
    cov /= n - 1;
    varMkt /= n - 1;
    const beta = varMkt > 0 ? cov / varMkt : null;
    const treynor = beta !== null && Math.abs(beta) > 0.0001 ? meanPort / beta : null;

    // Alpha (Jensen's) = mean port return - beta × mean market return (risk-free rate = 0)
    const alpha = beta !== null ? meanPort - beta * meanMkt : null;

    // IR = mean active return / std dev of active returns
    const activeReturns = portReturns.map((p, i) => p - mktReturns[i]);
    const meanActive = activeReturns.reduce((s, v) => s + v, 0) / n;
    const stdActive = Math.sqrt(activeReturns.reduce((s, v) => s + Math.pow(v - meanActive, 2), 0) / (n - 1));
    const infoRatio = stdActive > 0 ? meanActive / stdActive : null;

    return { treynor, alpha, infoRatio };
  }, [plList, spyData, tradeDefaults?.accountSize]);

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
            border: `1.5px solid ${toast.color}80`,
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
          <MenuIcon size={16} />
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
                <SettingsIcon size={16} />
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
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <LogIcon size={16} />
              </button>
              <button
                onClick={() => setShowPlan(true)}
                style={{
                  background: T.accent,
                  border: "none",
                  color: "#000",
                  borderRadius: 8,
                  padding: "0 13px",
                  height: 30,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <PlanIcon size={16} />
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
                      borderLeft: tab === id ? `2px solid ${T.accent}` : "2px solid transparent",
                      color: tab === id ? T.text : T.text3,
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "0 20px",
                      height: 54,
                      textAlign: "left",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s",
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
                <SettingsIcon size={16} /> SETTINGS
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
                <LogIcon size={16} /> LOG
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

<PlanIcon size={16} /> PLAN
</button>
            </div>
          </>
        )}
      </div>

      <div key={tab} className="tab-enter" style={{ padding: mobile ? 14 : 28 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === "ai" && (
          <ErrorBoundary compact>
            {isProPlus
              ? <AIInsights plList={plList} t={T} mobile={mobile} />
              : <UpgradePrompt t={T} onUpgrade={() => handleUpgrade("pro_plus")} feature="AI Insights" tier="pro_plus" />
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
              journals={journals}
              t={T}
              mobile={mobile}
              isDark={isDark}
              isPro={isPro}
              onUpgrade={() => handleUpgrade("pro")}
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
            style={{ ...sel, background: T.accent, border: `1px solid ${T.accent}`, color: "#000", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: "nowrap", padding: "6px 12px", fontWeight: 700 }}
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
              onSelect={() => toggleBulk(tr.id)}
              isSelected={bulkSelected.has(tr.id)}
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
        {bulkSelected.size > 0 && (
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 90, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 12, color: T.text2, fontFamily: "'Space Mono',monospace" }}>{bulkSelected.size} selected</span>
            <button onClick={bulkDelete} style={{ background: T.danger + "20", border: `1px solid ${T.danger}50`, color: T.danger, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Delete</button>
            <button onClick={clearBulk} style={{ background: "none", border: `1px solid ${T.border}`, color: T.text3, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Clear</button>
          </div>
        )}
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
          <UpgradePrompt t={T} onUpgrade={() => handleUpgrade("pro")} feature="Analytics" tier="pro" />
        )}
        {tab === "analytics" && isPro && (
          <ErrorBoundary compact>
          <div>
            {/* All key stats */}
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard label="Total P/L" value={fmt(stats.totalPL)} sub={`${stats.total} trades`} color={stats.totalPL >= 0 ? T.accent : T.danger} t={T} info="The sum of all realized profits and losses across your filtered trades. Positive means you made money; negative means you lost money over this period." />
              <StatCard label="Win Rate" value={`${(stats.winRate * 100).toFixed(0)}%`} sub={`${stats.wins}W/${stats.total - stats.wins}L`} t={T} info="The percentage of your trades that closed with a profit. A 50% win rate means half your trades were winners. Higher is generally better, but win rate alone doesn't tell the full story — a low win rate can still be profitable with large average wins." />
              <StatCard label="Expectancy" value={fmt(stats.expectancy)} sub="per trade" color={stats.expectancy >= 0 ? T.accent : T.danger} t={T} info="The average amount you can expect to make (or lose) per trade, calculated as: (Win Rate × Avg Win) + (Loss Rate × Avg Loss). A positive expectancy means your edge is working. This is arguably the most important metric for a trader." />
              <StatCard label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} sub="wins/losses" t={T} info="Total gross profit divided by total gross loss. A Profit Factor above 1.0 means you made more than you lost. Above 1.5 is decent, above 2.0 is considered strong. For example, a Profit Factor of 2.0 means you earned $2 for every $1 you lost." />
              <StatCard label="Avg R" value={avgR !== null ? fmtR(avgR) : "—"} sub="per closed trade" color={avgR !== null && avgR >= 0 ? T.accent : avgR !== null ? T.danger : undefined} t={T} info="Average return per trade measured in R-multiples, where 1R equals your initial risk on that trade. An Avg R of 1.5R means you made 1.5× your risk on average. This normalizes performance across trades with different position sizes." />
              <StatCard label="Avg Win" value={fmt(stats.avgWin)} color={T.accent} t={T} info="The average dollar profit of your winning trades. Compare this to Avg Loss to understand your reward-to-risk ratio. A healthy system typically has an Avg Win at least equal to or larger than the Avg Loss." />
              <StatCard label="Avg Loss" value={fmt(stats.avgLoss)} color={T.danger} t={T} info="The average dollar loss of your losing trades. This is shown as a negative number. Keeping Avg Loss small relative to Avg Win is key to long-term profitability — even with a lower win rate." />
              <StatCard label="Best Trade" value={plList.length ? fmt(Math.max(...plList.map(t => t.pl))) : "—"} color={T.accent} t={T} info="The single largest profit from one trade in your filtered set. Useful for identifying outlier wins and checking whether your overall P/L is heavily dependent on a few exceptional trades." />
              <StatCard label="Worst Trade" value={plList.length ? fmt(Math.min(...plList.map(t => t.pl))) : "—"} color={T.danger} t={T} info="The single largest loss from one trade in your filtered set. Useful for spotting when you broke your risk rules or got caught in an unexpected move. Large outlier losses often point to position sizing or stop-loss issues." />
              <StatCard label="Max Drawdown" value={maxDrawdown.value > 0 ? `-${fmt(maxDrawdown.value)}` : "—"} sub={maxDrawdown.pct > 0 ? `${(maxDrawdown.pct * 100).toFixed(1)}% of peak` : "no drawdown"} color={maxDrawdown.value > 0 ? T.danger : undefined} t={T} info="The largest peak-to-trough decline in your cumulative equity curve — how much your account dropped from its highest point before recovering. It measures the worst losing streak you endured. Smaller drawdowns mean a smoother, more consistent equity curve." />
              <StatCard label="Sharpe Ratio" value={stats.sharpe !== null ? stats.sharpe.toFixed(2) : "—"} sub="return / volatility" color={stats.sharpe !== null ? (stats.sharpe >= 1 ? T.accent : stats.sharpe >= 0 ? undefined : T.danger) : undefined} t={T} info="Measures return relative to total volatility (both up and down swings). Calculated as average P/L divided by the standard deviation of your P/L. Above 1.0 is good, above 2.0 is excellent. A low Sharpe means your returns are inconsistent even if profitable." />
              <StatCard label="Sortino Ratio" value={stats.sortino !== null ? stats.sortino.toFixed(2) : "—"} sub="return / downside risk" color={stats.sortino !== null ? (stats.sortino >= 1 ? T.accent : stats.sortino >= 0 ? undefined : T.danger) : undefined} t={T} info="Like the Sharpe Ratio, but only penalizes downside volatility (losing trades). Calculated as average P/L divided by the standard deviation of losing trades only. Higher is better — a high Sortino with a low Sharpe means your variance comes from big wins, not big losses." />
              <StatCard label="Treynor Ratio" value={benchmarkStats.treynor !== null ? benchmarkStats.treynor.toFixed(4) : "—"} sub={benchmarkStats.treynor !== null ? "return / market risk" : "needs SPY data"} color={benchmarkStats.treynor !== null ? (benchmarkStats.treynor > 0 ? T.accent : T.danger) : undefined} t={T} info="Measures return per unit of market (systematic) risk, using SPY as the benchmark. Beta captures how much your P/L moves with the overall market. A higher Treynor means you're being well-compensated for the market risk you're taking on. Shows '—' until SPY data loads." />
              <StatCard label="Info Ratio" value={benchmarkStats.infoRatio !== null ? benchmarkStats.infoRatio.toFixed(2) : "—"} sub={benchmarkStats.infoRatio !== null ? "active return / tracking error" : "needs SPY data"} color={benchmarkStats.infoRatio !== null ? (benchmarkStats.infoRatio >= 0.5 ? T.accent : benchmarkStats.infoRatio >= 0 ? undefined : T.danger) : undefined} t={T} info="Measures how consistently your trading outperforms SPY. Active return is your daily P/L minus what SPY returned that day. Tracking error is the volatility of that difference. Above 0.5 is solid, above 1.0 is exceptional. Shows '—' until SPY data loads." />
              <StatCard label="Alpha" value={benchmarkStats.alpha !== null ? benchmarkStats.alpha.toFixed(4) : "—"} sub={benchmarkStats.alpha !== null ? "excess return vs SPY" : "needs SPY data"} color={benchmarkStats.alpha !== null ? (benchmarkStats.alpha > 0 ? T.accent : T.danger) : undefined} t={T} info="Jensen's Alpha — the return your trading generates above what would be expected given your exposure to market movements (beta). Positive alpha means you're adding real skill beyond just riding the market. Negative alpha means the market is outperforming your adjusted returns. Shows '—' until SPY data loads." />
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
              ) : (() => {
                const tagRows = allTags.map((tag) => {
                  const tagged = plList.filter((tr) => (tr.tags || []).includes(tag));
                  const tagPL = tagged.reduce((s, tr) => s + tr.pl, 0);
                  const tagWR = tagged.length ? tagged.filter((tr) => tr.pl > 0).length / tagged.length : 0;
                  return { tag, tagged, tagPL, tagWR };
                });
                const maxTagPL = Math.max(...tagRows.map(r => Math.abs(r.tagPL)), 1);
                return tagRows.map(({ tag, tagged, tagPL, tagWR }) => (
                  <div key={tag} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, color: T.text2 }}>{tag} <span style={{ fontSize: 10, color: T.text3 }}>({tagged.length})</span></span>
                      <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ fontSize: 10, color: T.text3, fontFamily: "monospace" }}>{(tagWR * 100).toFixed(0)}%WR</span>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: tagPL >= 0 ? T.accent : T.danger }}>{tagPL >= 0 ? "+" : ""}{fmt(tagPL)}</span>
                      </div>
                    </div>
                    <MiniBar value={tagPL} max={maxTagPL} t={T} />
                  </div>
                ));
              })()}
            </div>

            {/* Emotion Impact */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                Emotion Impact
              </div>
              {plList.length === 0 ? (
                <div style={{ color: T.text3, fontSize: 13 }}>No trades logged yet</div>
              ) : (() => {
                const emotionRows = Object.entries(
                  plList.reduce((acc, tr) => {
                    const em = tr.emotion && tr.emotion !== "None" ? tr.emotion : "None";
                    if (!acc[em]) acc[em] = { pl: 0, count: 0, wins: 0 };
                    acc[em].pl += tr.pl; acc[em].count++; if (tr.pl > 0) acc[em].wins++;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1].pl - a[1].pl);
                const maxEmotionPL = Math.max(...emotionRows.map(([, d]) => Math.abs(d.pl)), 1);
                return emotionRows.map(([em, d]) => {
                  const winPct = Math.round((d.wins / d.count) * 100);
                  return (
                    <div key={em} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <div>
                          <span style={{ fontSize: 13, color: T.text2 }}>{em}</span>
                          <span style={{ fontSize: 10, color: T.text3, marginLeft: 8 }}>{d.count} trade{d.count !== 1 ? "s" : ""} · {winPct}%WR</span>
                        </div>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: d.pl >= 0 ? T.accent : T.danger }}>{d.pl >= 0 ? "+" : ""}{fmt(d.pl)}</span>
                      </div>
                      <MiniBar value={d.pl} max={maxEmotionPL} t={T} />
                    </div>
                  );
                });
              })()}
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
          trades={plList}
        />
      )}
      {editTrade && editTrade.status === "planned" && (
        <PlanModal
          initial={editTrade}
          onClose={() => setEditTrade(null)}
          onSave={(plan) => { saveTrade(plan); setEditTrade(null); }}
          t={T}
          isDark={isDark}
          trades={trades}
          spyData={spyData}
          isProPlus={isProPlus}
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
    onSignOut={() => { setShowSettings(false); saveTrades([]); localStorage.removeItem("tradelog_user_id"); signOut(); }}
    isPro={isPro}
    isProPlus={isProPlus}
    onUpgrade={(plan) => { setShowSettings(false); handleUpgrade(plan); }}
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
    trades={trades}
    spyData={spyData}
    isProPlus={isProPlus}
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

      {isPasswordRecovery && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: "100%", maxWidth: 380, padding: 28, fontFamily: "'Space Mono',monospace" }}>
            <div style={{ fontSize: 11, color: T.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>Set New Password</div>
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "10px 14px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "'Space Mono',monospace", outline: "none", marginBottom: 12 }}
            />
            {pwResetErr && <div style={{ fontSize: 12, color: T.danger, marginBottom: 10 }}>{pwResetErr}</div>}
            {pwResetMsg && <div style={{ fontSize: 12, color: T.accent, marginBottom: 10 }}>{pwResetMsg}</div>}
            <button
              onClick={async () => {
                if (newPassword.length < 6) { setPwResetErr("Password must be at least 6 characters."); return; }
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) { setPwResetErr(error.message); }
                else { setPwResetMsg("Password updated!"); setTimeout(() => { setIsPasswordRecovery(false); setNewPassword(""); setPwResetMsg(null); }, 1500); }
              }}
              style={{ width: "100%", padding: "11px 14px", background: T.accent, border: "none", borderRadius: 8, color: "#000", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace", cursor: "pointer" }}
            >
              Update Password
            </button>
          </div>
        </div>
      )}

      {/* Tutorial — shown after "Start Fresh" from onboarding */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 28px 24px", maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.danger + "15", border: `1px solid ${T.danger}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ color: T.danger }}><DeleteIcon size={20} /></span>
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
          onCloseLog={() => setShowAdd(false)}
          onOpenPlan={() => setShowPlan(true)}
          onClosePlan={() => setShowPlan(false)}
          onSetTab={setTab}
          t={T}
        />
      )}
    </div>
  );
}
