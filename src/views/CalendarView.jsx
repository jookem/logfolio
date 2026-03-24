import { useState, useMemo } from "react";
import { CalendarIcon } from "../lib/icons";
import { fmt, todayStr, typeLabels } from "../lib/utils";
import StatCard from "../components/StatCard";
import Tag from "../components/Tag";

export default function CalendarView({ plList, t, mobile }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const tStr = todayStr();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const prev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };
  const dayMap = useMemo(() => {
    const m = {};
    plList.forEach((tr) => {
      const k = tr.date.slice(0, 10);
      if (!m[k]) m[k] = { pl: 0, trades: [] };
      m[k].pl += tr.pl;
      m[k].trades.push(tr);
    });
    return m;
  }, [plList]);
  const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthTrades = plList.filter((tr) => tr.date.startsWith(prefix));
  const monthPL = monthTrades.reduce((s, tr) => s + tr.pl, 0);
  const monthWins = monthTrades.filter((tr) => tr.pl > 0).length;
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const selectedKey = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
        selectedDay
      ).padStart(2, "0")}`
    : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;
  const bestDay = (() => {
    const days = Object.entries(dayMap).filter(([k]) => k.startsWith(prefix));
    return days.length ? fmt(Math.max(...days.map(([, v]) => v.pl))) : "$0";
  })();

  return (
    <div>
      {/* Stats — always single column on mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Month P/L"
          value={fmt(monthPL)}
          sub={`${monthTrades.length} trades`}
          color={monthPL >= 0 ? t.accent : t.danger}
          t={t}
        />
        <StatCard
          label="Win Rate"
          value={
            monthTrades.length
              ? `${((monthWins / monthTrades.length) * 100).toFixed(0)}%`
              : "—"
          }
          sub={`${monthWins}W / ${monthTrades.length - monthWins}L`}
          t={t}
        />
        <StatCard
          label="Days"
          value={Object.keys(dayMap).filter((k) => k.startsWith(prefix)).length}
          sub="active trading days"
          t={t}
        />
        <StatCard label="Best Day" value={bestDay} t={t} />
      </div>

      {/* Calendar grid — always full width */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <button
            onClick={prev}
            style={{
              background: t.card2,
              border: `1px solid ${t.border}`,
              color: t.text2,
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ‹
          </button>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              color: t.text,
            }}
          >
            {monthName}
          </div>
          <button
            onClick={next}
            style={{
              background: t.card2,
              border: `1px solid ${t.border}`,
              color: t.text2,
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ›
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 3,
            marginBottom: 6,
          }}
        >
          {(mobile
            ? ["S", "M", "T", "W", "T", "F", "S"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: 10,
                color: t.text4,
                fontFamily: "'Space Mono', monospace",
                padding: "3px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: mobile ? 2 : 3,
          }}
        >
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            const data = dayMap[key];
            const isToday = key === tStr,
              isSelected = selectedDay === day,
              isGreen = data?.pl > 0;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                style={{
                  borderRadius: 7,
                  padding: mobile ? "4px 2px" : "5px 3px",
                  minHeight: mobile ? 44 : 52,
                  cursor: data ? "pointer" : "default",
                  border: isSelected
                    ? `1px solid ${t.accent}`
                    : isToday
                    ? `1px solid ${t.border2}`
                    : `1px solid transparent`,
                  background: isSelected
                    ? t.accent + "10"
                    : data
                    ? isGreen
                      ? t.accent + "08"
                      : t.danger + "08"
                    : "transparent",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: mobile ? 10 : 11,
                    color: isToday ? t.accent : data ? t.text : t.text4,
                    fontWeight: isToday ? 700 : 400,
                    marginBottom: 2,
                  }}
                >
                  {day}
                </div>
                {data && (
                  <>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: mobile ? 9 : 10,
                        color: isGreen ? t.accent : t.danger,
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {isGreen ? "+" : ""}
                      {fmt(data.pl)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                      {data.trades.slice(0, 3).map((_, ti) => (
                        <div key={ti} style={{ width: mobile ? 2 : 3, height: mobile ? 2 : 3, borderRadius: "50%", background: isGreen ? t.accent : t.danger, opacity: 0.7 }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail — always full width below calendar */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
        }}
      >
        {!selectedDay ? (
          <div
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: t.text4,
              textAlign: "center",
              gap: 8,
            }}
          >
            <CalendarIcon size={28} />

            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Tap a day to see trades
            </div>
          </div>
        ) : !selectedData ? (
          <div
            style={{
              padding: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: t.text4,
              textAlign: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28 }}>—</div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              No trades on this day
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  color: t.text3,
                  marginBottom: 3,
                }}
              >
                {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" }
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: selectedData.pl >= 0 ? t.accent : t.danger,
                }}
              >
                {selectedData.pl >= 0 ? "+" : ""}
                {fmt(selectedData.pl)}
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>
                {selectedData.trades.length} trade
                {selectedData.trades.length !== 1 ? "s" : ""} ·{" "}
                {selectedData.trades.filter((tr) => tr.pl > 0).length} wins
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedData.trades.map((tr) => (
                <div
                  key={tr.id}
                  style={{
                    background: t.card2,
                    borderRadius: 8,
                    padding: "11px 13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: t.text,
                      }}
                    >
                      {tr.ticker}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14,
                        fontWeight: 700,
                        color: tr.pl >= 0 ? t.accent : t.danger,
                      }}
                    >
                      {tr.pl >= 0 ? "+" : ""}
                      {fmt(tr.pl)}
                    </span>
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
                  {tr.mistake !== "None" && (
                    <div
                      style={{ fontSize: 11, color: t.danger, marginTop: 3 }}
                    >
                      ⚠ {tr.mistake}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
