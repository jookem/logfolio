// Shared by CSVModal and BrokerSyncModal: turns a flat list of fills/orders
// ({ ticker, side: "buy"|"sell", price, shares, date, time }) into round-trip
// trade objects via FIFO matching, plus duplicate detection against the
// user's existing trades.
export function matchOrdersToTrades(orders, sourceLabel, existingTrades = []) {
  const sorted = [...orders].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "").localeCompare(b.time || "");
  });

  const byTicker = {};
  sorted.forEach(o => {
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
      // If no matching buy exists the position was opened before this export —
      // still create the trade so the sell isn't silently dropped.
      trades.push({
        id: idBase++,
        date: buy ? buy.date : sell.date,
        exitDate: buy && sell.date !== buy.date ? sell.date : undefined,
        ticker,
        type: "stock",
        direction: "long",
        entryPrice: buy ? buy.price : 0,
        exitPrice: sell.price,
        shares: buy ? Math.min(buy.shares, sell.shares) : sell.shares,
        entryTime: buy ? buy.time || "" : "",
        exitTime: sell.time || "",
        strategy: "Breakout",
        emotion: "Calm",
        mistake: "None",
        notes: buy ? `Imported from ${sourceLabel}` : `Imported from ${sourceLabel} (entry pre-dates export)`,
        tags: [],
        legs: [],
      });
    });
  });

  trades.sort((a, b) => new Date(b.date) - new Date(a.date));

  const duplicateCount = trades.filter(tr =>
    existingTrades.some(ex =>
      ex.ticker === tr.ticker &&
      ex.date === tr.date &&
      Math.abs((parseFloat(ex.entryPrice) || 0) - (parseFloat(tr.entryPrice) || 0)) < 0.01
    )
  ).length;

  return { trades, duplicateCount };
}
