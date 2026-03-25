import { useState, useEffect } from "react";
import { fmt, todayStr, typeLabels } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";
import Tag from "../components/Tag";
import QuoteOfDay from "./QuoteOfDay";
import { LogIcon, PlanIcon } from "../lib/icons";

const BADGE_DEFS = [
  { id: "first_trade",  icon: "/images/firstTrade.svg",       color: "#e8eaed", label: "First Trade",   desc: "Logged your first trade",                     check: ({ trades }) => trades.length >= 1 },
  { id: "ten_trades",   icon: "/images/tenthTrade.svg",       color: "#3B82F6", label: "10 Trades",     desc: "Logged 10 trades",                            check: ({ trades }) => trades.length >= 10 },
  { id: "fifty_trades", icon: "/images/fiftyTrades.svg",      color: "#8b5cf6", label: "50 Trades",     desc: "Logged 50 trades",                            check: ({ trades }) => trades.length >= 50 },
  { id: "century",      icon: "/images/onehundrethTrade.svg", color: "#b8860b", label: "Century",       desc: "Logged 100 trades",                           check: ({ trades }) => trades.length >= 100 },
  { id: "big_winner",   icon: "/images/bigWinner.svg",        color: "#f59e0b", label: "Big Winner",    desc: "Single trade over $500",                      check: ({ trades }) => trades.some(t => t.pl >= 500) },
  { id: "green_day",    icon: "/images/greenDay.svg",         color: "#12B248", label: "Green Day",     desc: "First profitable trading day",                check: ({ trades }) => { const d = {}; trades.forEach(t => { d[t.date] = (d[t.date] || 0) + t.pl; }); return Object.values(d).some(pl => pl > 0); } },
  { id: "plan_follower",icon: "/images/planExecuted.svg",     color: "#3B82F6", label: "Plan Follower", desc: "Executed 3 or more trade plans",              check: ({ trades }) => trades.filter(t => t.fromPlanId).length >= 3 },
  { id: "win_streak",   icon: "/images/hotStreak.svg",        color: "#FF1212", label: "Hot Streak",    desc: "3 consecutive winning trades",                check: ({ streak }) => streak?.type === "W" && streak?.count >= 3 },
  { id: "disciplined",  icon: "/images/discipline.svg",       color: "#93c5fd", label: "Disciplined",   desc: "10 trades in a row with no mistakes",         check: ({ trades }) => { const l = trades.slice(-10); return l.length === 10 && l.every(t => !t.mistake || t.mistake === "None"); } },
  { id: "journal_week", icon: "/images/journalCheck.svg",     color: "#f97316", label: "Journal Habit", desc: "7-day journal writing streak",                check: ({ journalStreak }) => journalStreak >= 7 },
];

export default function DaySession({ plList, plans, onAddTrade, onAddPlan, journals = {}, t, mobile, isDark, isPro, onUpgrade }) {
  const today = todayStr();
  const todayTrades = plList.filter((tr) => tr.date === today);
  const sessionPL = todayTrades.reduce((s, tr) => s + tr.pl, 0);
  const wins = todayTrades.filter((tr) => tr.pl > 0).length;
  const losses = todayTrades.filter((tr) => tr.pl < 0).length;

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

  // Trade anniversary — any trade exactly 1 year ago
  const yearAgo = (() => { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
  const anniversaryTrades = plList.filter(tr => tr.date === yearAgo);

  // Badges
  const earnedIds = new Set(BADGE_DEFS.filter(b => b.check({ trades: plList, streak, journalStreak })).map(b => b.id));

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dayName = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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

      <QuoteOfDay t={t} />

      {/* Trade anniversary */}
      {anniversaryTrades.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.accent}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>1 Year Ago Today</div>
          {anniversaryTrades.map(tr => (
            <div key={tr.id} style={{ fontSize: 13, color: t.text }}>
              {tr.ticker} ·{" "}
              <span style={{ color: tr.pl >= 0 ? t.accent : t.danger, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                {tr.pl >= 0 ? "+" : ""}{fmt(tr.pl)}
              </span>
              <span style={{ fontSize: 11, color: t.text3 }}> · {tr.strategy}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: t.text3, marginBottom: 4 }}>{dayName}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: mobile ? 32 : 42, fontWeight: 700, color: sessionPL >= 0 ? t.accent : t.danger, letterSpacing: -2 }}>
            {sessionPL >= 0 ? "+" : ""}{fmt(sessionPL)}
          </div>
          <div style={{ fontSize: 13, color: t.text3, marginTop: 5 }}>
            Session P&L · {todayTrades.length} trades · {wins}W {losses}L
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: mobile ? "flex-start" : "flex-end", gap: 10 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: t.text3 }}>{timeStr}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {statCard("WINS", wins, t.accent)}
            {statCard("LOSSES", losses, t.danger)}
            {streak && streak.count >= 2 && statCard("STREAK", `${streak.count}${streak.type}`, streak.type === "W" ? t.accent : t.danger)}
            {journalStreak >= 1 && statCard("JOURNAL", `${journalStreak}D`, "#a78bfa")}
          </div>
        </div>
      </div>

      {/* Running P&L */}
      {todayTrades.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 20 }}>Running P&L</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56 }}>
            {(() => {
              let running = 0;
              const runs = todayTrades.map((tr) => { running += tr.pl; return running; });
              const max = Math.max(...runs.map(Math.abs), 1);
              return runs.map((val, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", height: `${(Math.abs(val) / max) * 46 + 10}px`, background: todayTrades[i].pl >= 0 ? t.accent : t.danger, borderRadius: 3, opacity: 0.8 }} />
                  <div style={{ fontSize: 9, color: t.text3, fontFamily: "monospace", overflow: "hidden", maxWidth: "100%", textAlign: "center" }}>{todayTrades[i].ticker}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Today's trades */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: tr.pl >= 0 ? t.accent : t.danger }}>
                  {tr.pl >= 0 ? "+" : ""}{fmt(tr.pl)}
                </div>
                {tr.mistake !== "None" && <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>⚠ {tr.mistake}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trade plans */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginTop: 20 }}>
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


      {/* Achievement badges */}
      {plList.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", marginTop: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Achievements</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {BADGE_DEFS.map(b => {
              const earned = earnedIds.has(b.id);
              return (
                <div key={b.id} title={b.desc} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: earned
                      ? `linear-gradient(135deg, ${b.color}40, ${b.color}15)`
                      : t.card2,
                    border: `1.5px solid ${earned ? b.color : t.border2}`,
                    boxShadow: earned ? `0 0 12px ${b.color}66` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    filter: earned ? `drop-shadow(0 0 6px ${b.color})` : "grayscale(40%) brightness(1.4)",
                    opacity: earned ? 1 : 0.6,
                    transition: "all 0.2s ease",
                  }}>
                    <img src={b.icon} width={32} height={32} alt={b.label} style={{ filter: isDark ? "brightness(0) invert(1)" : "none" }} />
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: earned ? b.color : t.text2,
                    fontFamily: "'Space Mono', monospace",
                    textAlign: "center",
                    maxWidth: 52,
                    lineHeight: 1.3,
                    fontWeight: earned ? 700 : 400,
                  }}>{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
