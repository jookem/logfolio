import { useState, useEffect, useRef, useMemo } from "react";
import { fmt, todayStr, typeLabels } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";
import Tag from "../components/Tag";
import QuoteOfDay from "./QuoteOfDay";
import { LogIcon, PlanIcon, FirstTradeIcon, GreenDayIcon } from "../lib/icons";
import useLiveQuotes from "../hooks/useLiveQuotes";

const BADGE_DEFS = [
  { id: "first_trade",  IconCmp: FirstTradeIcon,               color: "#fbbf24", label: "First Trade",   desc: "Logged your first trade",                     check: ({ trades }) => trades.length >= 1 },
  { id: "ten_trades",   icon: "/images/tenthTrade.svg",        color: "#f97316", label: "10 Trades",     desc: "Logged 10 trades",                            check: ({ trades }) => trades.length >= 10 },
  { id: "fifty_trades", icon: "/images/fiftyTrades.svg",       color: "#8b5cf6", label: "50 Trades",     desc: "Logged 50 trades",                            check: ({ trades }) => trades.length >= 50 },
  { id: "century",      icon: "/images/onehundrethTrade.svg",  color: "#3b82f6", label: "Century",       desc: "Logged 100 trades",                           check: ({ trades }) => trades.length >= 100 },
  { id: "big_winner",   icon: "/images/bigWinner.svg",         color: "#d4af37", sparkle: true,          label: "Big Winner",    desc: "Single trade over $500",                      check: ({ trades }) => trades.some(t => t.pl >= 500) },
  { id: "green_day",    IconCmp: GreenDayIcon,                  color: "#22c55e", label: "Green Day",     desc: "First profitable trading day",                check: ({ trades }) => { const d = {}; trades.forEach(t => { d[t.date] = (d[t.date] || 0) + t.pl; }); return Object.values(d).some(pl => pl > 0); } },
  { id: "plan_follower",icon: "/images/planExecuted.svg",      color: "#92400e", label: "Plan Follower", desc: "Executed 3 or more trade plans",              check: ({ trades }) => trades.filter(t => t.fromPlanId).length >= 3 },
  { id: "win_streak",   icon: "/images/hotStreak.svg",         color: "#ef4444", label: "Hot Streak",    desc: "3 consecutive winning trades",                check: ({ streak }) => streak?.type === "W" && streak?.count >= 3 },
  { id: "disciplined",  icon: "/images/discipline.svg",        color: "#db2777", label: "Disciplined",   desc: "10 trades in a row with no mistakes",         check: ({ trades }) => { const l = trades.slice(-10); return l.length === 10 && l.every(t => !t.mistake || t.mistake === "None"); } },
  { id: "journal_week", icon: "/images/journalCheck.svg",      color: "#14b8a6", label: "Journal Habit", desc: "7-day journal writing streak",                check: ({ journalStreak }) => journalStreak >= 7 },
];

export default function DaySession({ plList, plans, onAddTrade, onAddPlan, journals = {}, t, mobile, isDark, isPro, onUpgrade, userId }) {
  const today = todayStr();
  const todayTrades = plList.filter((tr) => tr.date === today);

  // Open positions — stock-like trades with no exit price logged yet
  const openPositions = useMemo(() =>
    plList.filter(tr =>
      STOCK_LIKE.includes(tr.type) &&
      tr.entryPrice > 0 &&
      (!tr.exitPrice || tr.exitPrice === 0)
    ), [plList]);

  const openTickers = useMemo(() =>
    [...new Set(openPositions.map(tr => tr.ticker))],
  [openPositions]);

  const { quotes, lastUpdated, marketOpen, refresh } = useLiveQuotes(openTickers);

  // For open positions, substitute live quote price for P&L; fall back to 0 if no quote yet
  const effectivePL = (tr) => {
    if (tr.exitPrice > 0) return tr.pl;
    const quote = quotes[tr.ticker];
    if (!quote) return 0;
    const dir = tr.direction === "short" ? -1 : 1;
    return dir * (quote.price - tr.entryPrice) * (tr.shares || 1);
  };

  const sessionPL = todayTrades.reduce((s, tr) => s + effectivePL(tr), 0);
  const wins = todayTrades.filter((tr) => effectivePL(tr) > 0).length;
  const losses = todayTrades.filter((tr) => effectivePL(tr) < 0).length;

  // Count-up animation for Session P&L — runs on mount and whenever sessionPL changes
  const [displayedPL, setDisplayedPL] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const target = sessionPL;
    const DURATION = 900;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedPL(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplayedPL(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sessionPL]);

  // Trigger Running P&L bar grow-in animation one frame after mount
  const [barsVisible, setBarsVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const streak = (() => {
    const sorted = [...plList].sort((a, b) => a.date.localeCompare(b.date));
    if (!sorted.length) return null;
    const last = sorted[sorted.length - 1];
    const type = last.pl > 0 ? "W" : last.pl < 0 ? "L" : null;
    if (!type) return null;
    let count = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const isWin = sorted[i].pl > 0;
      if ((type === "W" && isWin) || (type === "L" && !isWin && sorted[i].pl < 0)) count++;
      else break;
    }
    return { count, type };
  })();

  // Journal streak — consecutive days with a journal entry going back from today
  const journalStreak = (() => {
    let count = 0;
    const d = new Date(today);
    while (true) {
      const ds = d.toISOString().slice(0, 10);
      if (journals[ds]?.trim()) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  })();

  // Avg daily P&L (excluding today)
  const avgDailyPL = (() => {
    const byDate = {};
    plList.forEach(tr => {
      if (tr.date === today) return;
      byDate[tr.date] = (byDate[tr.date] || 0) + tr.pl;
    });
    const days = Object.values(byDate);
    return days.length ? days.reduce((s, v) => s + v, 0) / days.length : null;
  })();
  const vsAvg = avgDailyPL !== null ? sessionPL - avgDailyPL : null;

  // Personal bests
  const bestTrade = plList.length ? plList.reduce((b, tr) => tr.pl > (b?.pl ?? -Infinity) ? tr : b, null) : null;
  const allTimeWins = plList.filter(tr => tr.pl > 0).length;
  const winRate = plList.length ? Math.round((allTimeWins / plList.length) * 100) : null;

  // Resume banner
  const lastTradeDate = plList.length
    ? plList.reduce((latest, tr) => tr.date > latest ? tr.date : latest, "0")
    : null;
  const daysSinceTrade = lastTradeDate && lastTradeDate !== "0"
    ? Math.floor((new Date(today) - new Date(lastTradeDate)) / 86400000)
    : null;
  const showResumeBanner = daysSinceTrade !== null && daysSinceTrade >= 3;

  // Feature 6: This week last year (Mon–Fri surrounding the date 1 year ago)
  const weekLastYearTrades = useMemo(() => {
    const yearAgoDate = new Date(today);
    yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
    const dow = yearAgoDate.getDay(); // 0=Sun
    const daysToMonday = (dow + 6) % 7;
    const weekStart = new Date(yearAgoDate);
    weekStart.setDate(yearAgoDate.getDate() - daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);
    return plList.filter(tr => tr.date >= startStr && tr.date <= endStr);
  }, [plList, today]);

  // Badges
  const earnedIds = new Set(BADGE_DEFS.filter(b => b.check({ trades: plList, streak, journalStreak })).map(b => b.id));
  const earnedIdsStr = [...earnedIds].sort().join(",");

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dayName = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const marketCountdown = (() => {
    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const etDay = etNow.getDay();
    const totalSec = etNow.getHours() * 3600 + etNow.getMinutes() * 60 + etNow.getSeconds();
    const openSec = 9 * 3600 + 30 * 60; // 9:30 AM ET
    const closeSec = 16 * 3600;          // 4:00 PM ET
    const isWeekday = etDay >= 1 && etDay <= 5;
    const isOpen = isWeekday && totalSec >= openSec && totalSec < closeSec;
    const fmtSec = (s) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    };
    if (isOpen) return { label: "MARKET CLOSES IN", time: fmtSec(closeSec - totalSec), open: true };
    let secsUntilOpen;
    if (isWeekday && totalSec < openSec) {
      secsUntilOpen = openSec - totalSec;
    } else {
      let daysAhead = 1, checkDay = (etDay + 1) % 7;
      while (checkDay === 0 || checkDay === 6) { daysAhead++; checkDay = (checkDay + 1) % 7; }
      secsUntilOpen = daysAhead * 86400 - totalSec + openSec;
    }
    return { label: "MARKET OPENS IN", time: fmtSec(secsUntilOpen), open: false };
  })();

  // Feature 3: EOD review reminder
  const isAfterMarketClose = (() => {
    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const etDay = etNow.getDay();
    const totalSec = etNow.getHours() * 3600 + etNow.getMinutes() * 60 + etNow.getSeconds();
    return etDay >= 1 && etDay <= 5 && totalSec >= 16 * 3600;
  })();
  const eodKey = userId ? `eod_dismissed_${userId}_${today}` : null;
  const [eodDismissed, setEodDismissed] = useState(() => eodKey ? !!localStorage.getItem(eodKey) : false);
  const showEodBanner = !eodDismissed && isAfterMarketClose && todayTrades.length > 0;

  // Feature 2: Morning intention
  const intentionKey = userId ? `intention_${userId}_${today}` : null;
  const [intention, setIntention] = useState(() => intentionKey ? localStorage.getItem(intentionKey) || "" : "");
  const [intentionDraft, setIntentionDraft] = useState("");

  // Feature 5: Badge unlock toasts
  const badgesSeenKey = userId ? `badges_seen_${userId}` : null;
  const [badgeToasts, setBadgeToasts] = useState([]);

  useEffect(() => {
    if (!badgesSeenKey) return;
    const seen = new Set((localStorage.getItem(badgesSeenKey) || "").split(",").filter(Boolean));
    const newBadges = BADGE_DEFS.filter(b => earnedIds.has(b.id) && !seen.has(b.id));
    if (newBadges.length > 0) {
      setBadgeToasts(newBadges.map(b => b.id));
      localStorage.setItem(badgesSeenKey, [...new Set([...seen, ...newBadges.map(b => b.id)])].join(","));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedIdsStr, badgesSeenKey]);

  useEffect(() => {
    if (badgeToasts.length === 0) return;
    const timer = setTimeout(() => setBadgeToasts([]), 4500);
    return () => clearTimeout(timer);
  }, [badgeToasts.length]);

  const handleSetIntention = () => {
    const trimmed = intentionDraft.trim();
    if (!trimmed) return;
    if (intentionKey) localStorage.setItem(intentionKey, trimmed);
    setIntention(trimmed);
    setIntentionDraft("");
  };

  const handleEodDismiss = () => {
    if (eodKey) localStorage.setItem(eodKey, "1");
    setEodDismissed(true);
  };

  const statCard = (label, value, color) => (
    <div style={{ background: color + "15", border: `1px solid ${color}30`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 10, color, fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  return (
    <div>
      {/* Resume banner */}
      {showResumeBanner && (
        <div style={{ background: t.accent + "12", border: `1px solid ${t.accent}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>Welcome back</div>
            <div style={{ fontSize: 12, color: t.text3 }}>Your last trade was {daysSinceTrade} days ago on {lastTradeDate}. Ready to get back in?</div>
          </div>
          <button onClick={onAddTrade} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", whiteSpace: "nowrap" }}>
            Log Trade
          </button>
        </div>
      )}

      {/* Feature 2: Morning intention */}
      {userId && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: intention ? 6 : 10 }}>
            Today's Focus
          </div>
          {intention ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 13, color: t.text2, fontStyle: "italic", flex: 1 }}>"{intention}"</div>
              <button
                onClick={() => { setIntention(""); if (intentionKey) localStorage.removeItem(intentionKey); }}
                style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={intentionDraft}
                onChange={e => setIntentionDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSetIntention()}
                placeholder="What is your intention for today's trading session?"
                style={{ flex: 1, background: t.input, border: `1px solid ${t.border}`, borderRadius: 7, padding: "7px 12px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={handleSetIntention}
                disabled={!intentionDraft.trim()}
                style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "7px 14px", cursor: intentionDraft.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", opacity: intentionDraft.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      <QuoteOfDay t={t} plList={plList} streak={streak} />

      {/* Feature 3: EOD review reminder */}
      {showEodBanner && (
        <div style={{ background: "#a78bfa18", border: "1px solid #a78bfa40", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>Market's closed</div>
            <div style={{ fontSize: 12, color: t.text3 }}>You had {todayTrades.length} trade{todayTrades.length !== 1 ? "s" : ""} today. Take a moment to review and journal.</div>
          </div>
          <button
            onClick={handleEodDismiss}
            style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Feature 6: This week last year */}
      {weekLastYearTrades.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.accent}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>This Week Last Year</div>
          {weekLastYearTrades.map(tr => (
            <div key={tr.id} style={{ fontSize: 13, color: t.text, marginBottom: 2 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: t.text3 }}>{tr.date} · </span>
              {tr.ticker} ·{" "}
              <span style={{ color: tr.pl >= 0 ? t.positive : t.danger, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                {tr.pl >= 0 ? "+" : ""}{fmt(tr.pl)}
              </span>
              <span style={{ fontSize: 11, color: t.text3 }}> · {tr.strategy}</span>
            </div>
          ))}
        </div>
      )}

      {/* Session row — stacked on mobile, side-by-side on desktop */}
      <div style={{ display: mobile ? "block" : "flex", gap: 20, marginBottom: 24, alignItems: "stretch" }}>

        {/* Date + time card */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: mobile ? 20 : 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 15 : 18, fontWeight: 700, color: t.text2, textAlign: "center" }}>{dayName}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 22 : 28, color: t.text3, textAlign: "center" }}>{timeStr}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 4 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: marketCountdown.open ? t.accent : t.text3, textTransform: "uppercase", letterSpacing: 1.5 }}>{marketCountdown.label}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 14 : 16, color: marketCountdown.open ? t.accent : t.text3 }}>{marketCountdown.time}</div>
          </div>
        </div>

        {/* P&L + stats card */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: mobile ? 20 : 0, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Session P&L</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 32 : 40, fontWeight: 700, color: sessionPL >= 0 ? t.positive : t.danger, letterSpacing: -1, lineHeight: 1 }}>
              {displayedPL >= 0 ? "+" : ""}{fmt(displayedPL)}
            </div>
            {(wins > 0 || losses > 0 || (streak && streak.count >= 2) || journalStreak >= 1) && (
              <div style={{ display: "flex", gap: 6, flexWrap: mobile ? "wrap" : "nowrap", justifyContent: "center" }}>
                {statCard("WINS", wins, t.positive)}
                {statCard("LOSSES", losses, t.danger)}
                {streak && streak.count >= 2 && statCard("STREAK", `${streak.count}${streak.type}`, streak.type === "W" ? t.positive : t.danger)}
                {journalStreak >= 1 && statCard("JOURNAL", `${journalStreak}D`, "#a78bfa")}
                {vsAvg !== null && todayTrades.length > 0 && statCard("VS AVG", `${vsAvg >= 0 ? "+" : ""}${fmt(vsAvg)}`, vsAvg >= 0 ? t.positive : t.danger)}
              </div>
            )}
          </div>
        </div>

        {/* Running P&L */}
        {todayTrades.length > 0 ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: mobile ? 20 : 0, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Running P&L</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: 1, minHeight: 56 }}>
              {(() => {
                let running = 0;
                const runs = todayTrades.map((tr) => { running += effectivePL(tr); return running; });
                const max = Math.max(...runs.map(Math.abs), 1);
                return runs.map((val, i) => {
                  const ePL = effectivePL(todayTrades[i]);
                  const targetH = (Math.abs(val) / max) * 46 + 10;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{ width: "100%", height: `${barsVisible ? targetH : 0}px`, background: ePL >= 0 ? t.positive : t.danger, borderRadius: 3, opacity: 0.8, transition: `height 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s` }} />
                      <div style={{ fontSize: 9, color: t.text3, fontFamily: "'Space Mono', monospace", overflow: "hidden", maxWidth: "100%", textAlign: "center" }}>{todayTrades[i].ticker}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : !mobile && (
          <div style={{ background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 16, padding: "16px 20px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: t.text4, textAlign: "center" }}>No trades logged today</div>
          </div>
        )}

      </div>

      {/* Open Positions — live price layer */}
      {openPositions.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Open Positions</div>
              {marketOpen && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.positive, boxShadow: `0 0 6px ${t.positive}`, animation: "lf-pulse 2s ease-in-out infinite" }} />
                  <span style={{ fontSize: 9, color: t.positive, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>LIVE</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {lastUpdated && (
                <span style={{ fontSize: 9, color: t.text4, fontFamily: "'Space Mono', monospace" }}>
                  {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={refresh}
                title="Refresh prices"
                style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, color: t.text3, cursor: "pointer", fontSize: 10, padding: "2px 8px", fontFamily: "'Space Mono', monospace" }}
              >
                ↻
              </button>
            </div>
          </div>
          <style>{`@keyframes lf-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {openPositions.map((tr, i) => {
              const quote = quotes[tr.ticker];
              const currentPrice = quote?.price ?? null;
              const unreal = currentPrice != null
                ? (tr.direction === "short" ? tr.entryPrice - currentPrice : currentPrice - tr.entryPrice) * (tr.shares || 1)
                : null;
              const unrealColor = unreal == null || !marketOpen ? t.text3 : unreal >= 0 ? t.positive : t.danger;
              return (
                <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: t.card, borderRadius: 8 }}>
                  <div style={{ minWidth: 52 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: t.text }}>{tr.ticker}</div>
                    <div style={{ fontSize: 9, color: tr.direction === "short" ? t.danger : t.positive, textTransform: "uppercase", letterSpacing: 1 }}>{tr.direction}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.text3 }}>
                      {tr.shares} {tr.shares === 1 ? "share" : "shares"} @ {fmt(tr.entryPrice)}
                    </div>
                    {currentPrice != null && (
                      <div style={{ fontSize: 11, color: t.text3 }}>
                        {marketOpen ? "Current:" : "Last close:"} <span style={{ fontFamily: "'Space Mono', monospace", color: t.text, fontWeight: 600 }}>{fmt(currentPrice)}</span>
                        {marketOpen && quote.changePct != null && (
                          <span style={{ marginLeft: 6, color: quote.changePct >= 0 ? t.positive : t.danger, fontFamily: "'Space Mono', monospace" }}>
                            {quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                    {currentPrice == null && (
                      <div style={{ fontSize: 11, color: t.text4, fontStyle: "italic" }}>Price unavailable</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {unreal != null && marketOpen ? (
                      <>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: unrealColor }}>
                          {unreal >= 0 ? "+" : ""}{fmt(unreal)}
                        </div>
                        <div style={{ fontSize: 9, color: t.text4, textTransform: "uppercase", letterSpacing: 1 }}>unrealized</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: t.text4 }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {openPositions.length > 0 && marketOpen && Object.keys(quotes).length > 0 && (() => {
            const totalUnreal = openPositions.reduce((sum, tr) => {
              const q = quotes[tr.ticker];
              if (!q) return sum;
              return sum + (tr.direction === "short" ? tr.entryPrice - q.price : q.price - tr.entryPrice) * (tr.shares || 1);
            }, 0);
            return (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>{marketOpen ? "Total Unrealized" : "Total (Last Close)"}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: marketOpen ? (totalUnreal >= 0 ? t.positive : t.danger) : t.text3 }}>
                    {totalUnreal >= 0 ? "+" : ""}{fmt(totalUnreal)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Trades + Plans row — stacked on mobile, side-by-side on desktop */}
      <div style={{ display: mobile ? "block" : "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Today's trades */}
        <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginBottom: mobile ? 20 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Today's Trades</div>
            <button onClick={onAddTrade} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
              <LogIcon size="1em" /> LOG
            </button>
          </div>
          {todayTrades.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: t.text4, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>No trades logged today yet</div>
          ) : (
            [...todayTrades].reverse().map((tr, i) => (
              <div key={tr.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < todayTrades.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>{tr.ticker}</div>
                  <div style={{ fontSize: 12, color: t.text3 }}>
                    {tr.strategy} · {tr.type === "options" ? `${tr.legs?.length}L options` : `${tr.shares} ${typeLabels(tr.type).units.toLowerCase()}`}
                  </div>
                  {tr.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {tr.tags.map((tg) => <Tag key={tg} label={tg} t={t} />)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: tr.pl >= 0 ? t.positive : t.danger }}>
                    {tr.pl >= 0 ? "+" : ""}{fmt(tr.pl)}
                  </div>
                  {tr.mistake !== "None" && <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>⚠ {tr.mistake}</div>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Trade plans */}
        <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginBottom: mobile ? 20 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>Trade Plans</div>
            <button onClick={onAddPlan} style={{ background: t.accent, border: "none", color: "#000", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
              <PlanIcon size="1em" /> PLAN
            </button>
          </div>
          {plans.map((plan, i) => (
            <div key={plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < plans.length - 1 ? `1px solid ${t.border}` : "none" }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>{plan.ticker}</div>
                <div style={{ fontSize: 12, color: t.text3 }}>
                  {plan.strategy} · {plan.type === "options" ? `${plan.legs?.length}L options` : `${plan.numShares || plan.shares || "—"} ${typeLabels(plan.type).units.toLowerCase()}`}
                </div>
                {plan.checklist?.length > 0 && (
                  <div style={{ fontSize: 11, color: plan.checklistComplete ? t.accent : "#f59e0b", marginTop: 3, fontFamily: "'Space Mono', monospace" }}>
                    {plan.checklistComplete ? "✓ Checklist complete" : `⚠ ${(plan.checklist || []).filter(c => c.checked).length}/${plan.checklist.length} checked`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {STOCK_LIKE.includes(plan.type) && plan.purchasePrice && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text3 }}>@ ${(+plan.purchasePrice).toFixed(2)}</div>
                )}
                {plan.plannedR && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.accent }}>+{plan.plannedR.toFixed(2)}R</div>}
                {plan.stopLoss && <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>SL ${plan.stopLoss}</div>}
              </div>
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <div style={{ padding: 48, textAlign: "center", color: t.text4, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>No trade plans yet</div>
          )}
        </div>

      </div>


      {/* Achievement badges */}
      {plList.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginTop: 20 }}>
          <style>{`@keyframes sparkle { 0%,100%{box-shadow:0 0 8px 2px #d4af3799,0 0 0 0 #d4af3700} 50%{box-shadow:0 0 18px 6px #d4af37cc,0 0 28px 10px #d4af3744} } @keyframes badgeToast { 0%{opacity:0;transform:translateY(16px)} 15%{opacity:1;transform:translateY(0)} 85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-8px)} }`}</style>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Achievements</div>
          <div style={ mobile ? { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", justifyItems: "center", gap: "12px 0" } : { display: "flex", justifyContent: "space-between" }}>
            {BADGE_DEFS.map(b => {
              const earned = earnedIds.has(b.id);
              const iconColor = earned ? (isDark ? "#fff" : "#000") : t.text3;
              return (
                <div key={b.id} title={b.desc} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: earned ? `linear-gradient(135deg, ${b.color}50, ${b.color}20)` : t.text3 + "12",
                    border: `1.5px solid ${earned ? b.color : t.text3 + "40"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: earned && b.sparkle ? "sparkle 2s ease-in-out infinite" : "none",
                    boxShadow: earned && !b.sparkle ? `0 0 10px ${b.color}55` : "none",
                    transition: "all 0.2s ease",
                  }}>
                    {b.IconCmp
                      ? <div style={{ color: iconColor }}><b.IconCmp size={30} /></div>
                      : <img src={b.icon} width={30} height={30} alt={b.label} style={{ filter: isDark ? "brightness(0) invert(1)" : "brightness(0)", opacity: earned ? 1 : 0.4 }} />}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: earned ? (isDark ? "#fff" : "#000") : t.text3,
                    fontFamily: "'Space Mono', monospace",
                    textAlign: "center",
                    lineHeight: 1.3,
                    fontWeight: earned ? 700 : 400,
                    maxWidth: 60,
                  }}>{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature 5: Badge unlock toasts */}
      {badgeToasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
          {badgeToasts.map(id => {
            const b = BADGE_DEFS.find(x => x.id === id);
            if (!b) return null;
            return (
              <div key={id} style={{ background: t.card, border: `1.5px solid ${b.color}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 12px ${b.color}44`, animation: "badgeToast 4.5s ease forwards", minWidth: 220 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${b.color}50, ${b.color}20)`, border: `1.5px solid ${b.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {b.IconCmp
                    ? <div style={{ color: isDark ? "#fff" : "#000" }}><b.IconCmp size={20} /></div>
                    : <img src={b.icon} width={20} height={20} alt={b.label} style={{ filter: isDark ? "brightness(0) invert(1)" : "brightness(0)" }} />}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: b.color, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Badge Unlocked</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: t.text3 }}>{b.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
