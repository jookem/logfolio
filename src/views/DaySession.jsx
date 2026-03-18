import { useState, useEffect } from "react";
import { fmt, todayStr, typeLabels } from "../lib/utils";
import { STOCK_LIKE } from "../lib/constants";
import Tag from "../components/Tag";
import QuoteOfDay from "./QuoteOfDay";

export default function DaySession({ plList, plans, onAddTrade, onAddPlan, t, mobile, isDark }) {
  const today = todayStr();
  const todayTrades = plList.filter((tr) => tr.date === today);
  const sessionPL = todayTrades.reduce((s, tr) => s + tr.pl, 0);
  const wins = todayTrades.filter((tr) => tr.pl > 0).length;
  const losses = todayTrades.filter((tr) => tr.pl < 0).length;
  const [now, setNow] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

const timeStr = now.toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
  const dayName = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div>
      <QuoteOfDay t={t} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: t.text3,
              marginBottom: 4,
            }}
          >
            {dayName}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: mobile ? 32 : 42,
              fontWeight: 700,
              color: sessionPL >= 0 ? t.accent : t.danger,
              letterSpacing: -2,
            }}
          >
            {sessionPL >= 0 ? "+" : ""}
            {fmt(sessionPL)}
          </div>
          <div style={{ fontSize: 13, color: t.text3, marginTop: 5 }}>
            Session P&L · {todayTrades.length} trades · {wins}W {losses}L
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: mobile ? "flex-start" : "flex-end",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20,
              color: t.text3,
            }}
          >
            {timeStr}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                background: t.accent + "15",
                border: `1px solid ${t.accent}30`,
                borderRadius: 8,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.accent,
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: 2,
                }}
              >
                WINS
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: t.accent,
                }}
              >
                {wins}
              </div>
            </div>
            <div
              style={{
                background: t.danger + "15",
                border: `1px solid ${t.danger}30`,
                borderRadius: 8,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.danger,
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: 2,
                }}
              >
                LOSSES
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: t.danger,
                }}
              >
                {losses}
              </div>
            </div>
          </div>
        </div>
      </div>
      {todayTrades.length > 0 && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 20,
            }}
          >
            Running P&L
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 56,
            }}
          >
            {(() => {
              let running = 0;
              const runs = todayTrades.map((tr) => {
                running += tr.pl;
                return running;
              });
              const max = Math.max(...runs.map(Math.abs), 1);
              return runs.map((val, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(Math.abs(val) / max) * 46 + 10}px`,
                      background: todayTrades[i].pl >= 0 ? t.accent : t.danger,
                      borderRadius: 3,
                      opacity: 0.8,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 9,
                      color: t.text3,
                      fontFamily: "monospace",
                      overflow: "hidden",
                      maxWidth: "100%",
                      textAlign: "center",
                    }}
                  >
                    {todayTrades[i].ticker}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: t.text3,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Today's Trades
          </div>
          <button
            onClick={onAddTrade}
            style={{
              background: t.accent,
              border: "none",
              color: "#000",
              borderRadius: 7,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
              display: "flex",
              alignItems: "center",
              gap: 6,
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
        </div>
        {todayTrades.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: t.text4,
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
            }}
          >
            No trades logged today yet
          </div>
        ) : (
          [...todayTrades].reverse().map((tr, i) => (
            <div
              key={tr.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom:
                  i < todayTrades.length - 1 ? `1px solid ${t.border}` : "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                    marginBottom: 3,
                  }}
                >
                  {tr.ticker}
                </div>
                <div style={{ fontSize: 12, color: t.text3 }}>
                  {tr.strategy} ·{" "}
                  {tr.type === "options"
                    ? `${tr.legs?.length}L options`
                    : `${tr.shares} ${typeLabels(tr.type).units.toLowerCase()}`}
                </div>
                {tr.tags?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {tr.tags.map((tg) => (
                      <Tag key={tg} label={tg} t={t} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: tr.pl >= 0 ? t.accent : t.danger,
                  }}
                >
                  {tr.pl >= 0 ? "+" : ""}
                  {fmt(tr.pl)}
                </div>
                {tr.mistake !== "None" && (
                  <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>
                    ⚠ {tr.mistake}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 12, overflow: "hidden", marginTop: 20,
      }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 16px", borderBottom: `1px solid ${t.border}`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10,
              color: t.text3, textTransform: "uppercase", letterSpacing: 2,
            }}>
              Trade Plans
            </div>
            <button
              onClick={onAddPlan}
              style={{
                background: t.accent, border: "none", color: "#000",
                borderRadius: 7, padding: "6px 14px", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
                <path d="M6 15.8L7.14286 17L10 14" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 8.8L7.14286 10L10 7" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 9L18 9" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                <path d="M13 16L18 16" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
              </svg> PLAN
            </button>
          </div>
          {plans.map((plan, i) => (
            <div key={plan.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px",
              borderBottom: i < plans.length - 1 ? `1px solid ${t.border}` : "none",
            }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 3 }}>
                  {plan.ticker}
                </div>
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
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text3 }}>
                    @ ${(+plan.purchasePrice).toFixed(2)}
                  </div>
                )}
                {plan.plannedR && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.accent }}>
                    +{plan.plannedR.toFixed(2)}R
                  </div>
                )}
                {plan.stopLoss && (
                  <div style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>
                    SL ${plan.stopLoss}
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!plans || plans.length === 0) && (
            <div style={{ padding: 48, textAlign: "center", color: t.text4, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
              No trade plans yet
            </div>
          )}
        </div>
    </div>
  );
}
