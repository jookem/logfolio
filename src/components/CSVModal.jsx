import { useState } from "react";
import { useModalClose } from "../lib/useModalClose";
import { todayStr } from "../lib/utils";
import { CloseIcon, ArrowsIcon, WarningIcon, CheckIcon } from "../lib/icons";

export default function CSVModal({ onClose, onImport, existingTrades = [], t }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const BROKERS = ["Webull", "Robinhood", "TD Ameritrade", "Interactive Brokers", "Tastytrade", "Charles Schwab"];

  const detectBroker = (headers) => {
    if (headers.includes("symbol") && headers.includes("side") && headers.includes("filled time")) return "webull";
    if (headers.includes("symbol") && headers.includes("side") && headers.includes("state")) return "robinhood";
    if (headers.includes("symbol") && headers.includes("buy/sell") && headers.includes("exec time")) return "tdameritrade";
    if (headers.includes("symbol") && headers.includes("buy/sell") && headers.includes("date/time")) return "ibkr";
    if (headers.includes("action") && headers.includes("instrument type") && headers.includes("underlying symbol")) return "tastytrade";
    if (headers.includes("symbol") && headers.includes("fees & comm") && headers.includes("amount")) return "schwab";
    return "unknown";
  };

  const parse = () => {
    setError("");
    try {
      const lines = csv.trim().split("\n").filter(Boolean);
      if (lines.length < 2) { setError("Need at least a header row and one data row."); return; }

      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, " "));
      const broker = detectBroker(headers);
      if (broker === "unknown") {
        setError("Broker format not recognised — falling back to generic parsing. Results may be incomplete. Supported formats: Webull, Robinhood, TD Ameritrade, Interactive Brokers, Tastytrade, Charles Schwab.");
      }

      const rows = lines.slice(1).map(line => {
        const vals = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });

      const parseDate = (str) => {
        if (!str) return todayStr();
        const clean = str.trim().split(/\s+/)[0];
        if (clean.includes("/")) {
          const parts = clean.split("/");
          if (parts[2]?.length === 4) return `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
          if (parts[0]?.length === 4) return `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}`;
        }
        if (clean.includes("-")) return clean.slice(0, 10);
        return todayStr();
      };

      const parseTime = (str) => {
        if (!str) return "";
        const parts = str.trim().split(/\s+/);
        if (parts.length < 2) return "";
        const hm = parts[1].split(":");
        if (hm.length < 2) return "";
        return `${hm[0].padStart(2,"0")}:${hm[1].padStart(2,"0")}`;
      };

      const parsePrice = (v) => parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0;

      let orders = [];

      if (broker === "webull") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker) return;
          const status = (row.status || "").toLowerCase();
          if (status === "failed" || status === "cancelled") return;
          const timeStr = row["filled time"] || row["placed time"] || "";
          orders.push({
            ticker,
            side: (row.side || "").toLowerCase(),
            price: parsePrice(row["avg price"] || row.price),
            shares: parsePrice(row.filled || row["total qty"]),
            date: parseDate(timeStr),
            time: parseTime(timeStr),
          });
        });
      } else if (broker === "robinhood") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker || row.state?.toLowerCase() !== "filled") return;
          const timeStr = row["last transaction at"] || row.date || "";
          orders.push({
            ticker,
            side: (row.side || "").toLowerCase(),
            price: parsePrice(row["average price"] || row.price),
            shares: parsePrice(row["filled quantity"] || row.quantity),
            date: parseDate(timeStr),
            time: parseTime(timeStr),
          });
        });
      } else if (broker === "tdameritrade") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker) return;
          const timeStr = row["exec time"] || row.date || "";
          orders.push({
            ticker,
            side: (row["buy/sell"] || "").toLowerCase(),
            price: parsePrice(row.price),
            shares: parsePrice(row.quantity),
            date: parseDate(timeStr),
            time: parseTime(timeStr),
          });
        });
      } else if (broker === "ibkr") {
        rows.forEach(row => {
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker || row["asset category"]?.toLowerCase() !== "stocks") return;
          const side = parsePrice(row.quantity) > 0 ? "buy" : "sell";
          const timeStr = row["date/time"] || row.date || "";
          orders.push({
            ticker,
            side,
            price: parsePrice(row["t. price"] || row.price),
            shares: Math.abs(parsePrice(row.quantity)),
            date: parseDate(timeStr),
            time: parseTime(timeStr),
          });
        });
      } else if (broker === "tastytrade") {
        rows.forEach(row => {
          if ((row.type || "").toLowerCase() !== "trade") return;
          const action = (row.action || "").toLowerCase();
          if (!action.includes("buy") && !action.includes("sell")) return;
          const ticker = (row["underlying symbol"] || row.symbol || "").toUpperCase();
          if (!ticker) return;
          orders.push({
            ticker,
            side: action.includes("buy") ? "buy" : "sell",
            price: parsePrice(row["average price"]),
            shares: Math.abs(parsePrice(row.quantity)),
            date: parseDate(row.date),
            time: parseTime(row.date),
          });
        });
      } else if (broker === "schwab") {
        rows.forEach(row => {
          const action = (row.action || "").toLowerCase();
          if (!action.includes("buy") && !action.includes("sell")) return;
          const ticker = (row.symbol || "").toUpperCase();
          if (!ticker) return;
          orders.push({
            ticker,
            side: action.includes("buy") ? "buy" : "sell",
            price: parsePrice(row.price),
            shares: Math.abs(parsePrice(row.quantity)),
            date: parseDate(row.date),
            time: parseTime(row.date),
          });
        });
      } else {
        rows.forEach(row => {
          const ticker = (row.symbol || row.ticker || "").toUpperCase();
          if (!ticker) return;
          const status = (row.status || "").toLowerCase();
          if (status === "failed" || status === "cancelled") return;
          const side = (row.side || row["buy/sell"] || row.action || "").toLowerCase();
          const timeStr = row.date || row["filled time"] || row["exec time"] || "";
          orders.push({
            ticker,
            side: side.includes("buy") ? "buy" : "sell",
            price: parsePrice(row["avg price"] || row.price || row["average price"]),
            shares: parsePrice(row.filled || row.quantity || row.shares),
            date: parseDate(timeStr),
            time: parseTime(timeStr),
          });
        });
      }

      // Sort chronologically so FIFO matching respects trade order
      orders.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "").localeCompare(b.time || "");
      });

      // Consolidate partial fills: merge same ticker + date + side into one order
      // with a weighted-average price. Brokers often split a single order into
      // many fill rows — without this step each fill burns a separate match slot.
      const consolidateOrders = (rawOrders) => {
        const groups = {};
        rawOrders.forEach(o => {
          const key = `${o.ticker}|${o.date}|${o.side}`;
          if (!groups[key]) groups[key] = { ...o, _shares: 0, _cost: 0 };
          groups[key]._shares += o.shares;
          groups[key]._cost  += o.shares * o.price;
        });
        return Object.values(groups).map(g => ({
          ...g,
          shares: g._shares,
          price: g._shares > 0 ? g._cost / g._shares : 0,
        }));
      };
      orders = consolidateOrders(orders);

      const byTicker = {};
      orders.forEach(o => {
        if (!byTicker[o.ticker]) byTicker[o.ticker] = { buys: [], sells: [] };
        if (o.side === "buy") byTicker[o.ticker].buys.push(o);
        else byTicker[o.ticker].sells.push(o);
      });

      const trades = [];
      let idBase = Date.now();
      Object.entries(byTicker).forEach(([ticker, { buys, sells }]) => {
        const buyQueue = [...buys];
        sells.forEach(sell => {
          const buy = buyQueue.shift();
          if (buy) {
            trades.push({
              id: idBase++,
              date: buy.date,
              exitDate: sell.date !== buy.date ? sell.date : undefined,
              ticker,
              type: "stock",
              direction: "long",
              entryPrice: buy.price,
              exitPrice: sell.price,
              shares: Math.min(buy.shares, sell.shares),
              entryTime: buy.time || "",
              exitTime: sell.time || "",
              strategy: "Breakout",
              emotion: "Calm",
              mistake: "None",
              notes: `Imported from ${broker}`,
              tags: [],
              legs: [],
            });
          }
        });
      });

      if (trades.length === 0) { setError("No completed trades found. Only closed trades will be imported."); return; }
      trades.sort((a, b) => new Date(b.date) - new Date(a.date));
      const duplicates = trades.filter(tr =>
        existingTrades.some(ex =>
          ex.ticker === tr.ticker &&
          ex.date === tr.date &&
          Math.abs((parseFloat(ex.entryPrice) || 0) - (parseFloat(tr.entryPrice) || 0)) < 0.01
        )
      );
      if (duplicates.length > 0) {
        setError(`⚠ ${duplicates.length} possible duplicate${duplicates.length > 1 ? "s" : ""} detected (same ticker, date & entry price already in your logs). Review before importing.`);
      }
      setPreview(trades);
    } catch (e) {
      setError("Could not parse file. " + e.message);
    }
  };

  const inp = {
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    color: t.text,
    padding: "10px 14px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'Space Mono', monospace",
    outline: "none",
  };
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", padding: sm ? 14 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent }}>CSV Import</div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}><CloseIcon size="1em" /></button>
        </div>
        <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Supported Brokers</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {BROKERS.map(b => (
              <span key={b} style={{ fontSize: 11, color: t.accent, background: t.accent + "15", border: `1px solid ${t.accent}30`, borderRadius: 5, padding: "3px 8px", fontFamily: "'Space Mono', monospace" }}>{b}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", lineHeight: 1.6 }}>
            Export your order history from your broker and paste the CSV/TSV below — format is auto-detected.
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <label
  style={{
    flex: 1,
    background: t.accent + "15",
    border: `1px solid ${t.accent}40`,
    color: t.accent,
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "'Space Mono',monospace",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  }}
>
  <ArrowsIcon size={32} /> Choose File
              <input type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setCsv(ev.target.result);
                reader.readAsText(file);
              }} />
            </label>
          </div>
          <textarea style={{ ...inp, height: 120, resize: "vertical" }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Or paste CSV/TSV content here..." />
        </div>
        {error && <div style={{ color: t.danger, fontSize: 13, marginBottom: 10, fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}><WarningIcon size={14} />{error}</div>}
        {preview.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.accent, fontFamily: "'Space Mono', monospace", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><CheckIcon size={14} />{preview.length} trades ready</div>
            <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
              {preview.slice(0, 4).map((tr, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderBottom: i < preview.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: t.text }}>{tr.ticker}</span>
                  <span style={{ fontSize: 12, color: t.text3 }}>{tr.notes}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: t.text3 }}>{tr.date}</span>
                </div>
              ))}
              {preview.length > 4 && <div style={{ padding: "7px 12px", fontSize: 12, color: t.text3 }}>+{preview.length - 4} more...</div>}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => trigger(onClose)} style={{ flex: 1, minWidth: 80, background: "none", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: 11, cursor: "pointer" }}>Cancel</button>
          <button onClick={parse} style={{ flex: 1, minWidth: 80, background: t.card2, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: 11, cursor: "pointer" }}>Preview</button>
          {preview.length > 0 && (
            <button onClick={() => onImport(preview)} style={{ flex: 2, minWidth: 120, background: t.accent, border: "none", color: "#000", borderRadius: 8, padding: 11, cursor: "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
              Import {preview.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
