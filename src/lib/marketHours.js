// US equity market hours (NYSE/Nasdaq regular session, 9:30 AM to 4:00 PM ET).
// Handles weekends, full-day holidays and 1:00 PM early closes.
// Update the two tables below each year.

const HOLIDAYS = new Set([
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

const EARLY_CLOSE = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]);

const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const EARLY_CLOSE_MIN = 13 * 60;

const etFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

function etParts(date) {
  const p = Object.fromEntries(etFmt.formatToParts(date).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// The real instant for a wall-clock time in New York (DST-safe).
function etWallToUtc(y, m, d, minutes) {
  const wall = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = etParts(new Date(guess));
    guess += wall - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  }
  return new Date(guess);
}

const pad = (n) => String(n).padStart(2, "0");

// Trading session for a calendar day, or null when the market is closed all day.
function sessionFor(y, m, d) {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const key = `${y}-${pad(m)}-${pad(d)}`;
  if (dow === 0 || dow === 6 || HOLIDAYS.has(key)) return null;
  return { open: etWallToUtc(y, m, d, OPEN_MIN), close: etWallToUtc(y, m, d, EARLY_CLOSE.has(key) ? EARLY_CLOSE_MIN : CLOSE_MIN) };
}

/**
 * @returns {{ open: boolean, target: Date, msLeft: number }}
 * target is the next close when open, otherwise the next open.
 */
export function getMarketStatus(now = new Date()) {
  const { y, m, d } = etParts(now);
  for (let i = 0; i < 10; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    const s = sessionFor(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
    if (!s) continue;
    if (now >= s.open && now < s.close) return { open: true, target: s.close, msLeft: s.close - now };
    if (now < s.open) return { open: false, target: s.open, msLeft: s.open - now };
  }
  return { open: false, target: now, msLeft: 0 };
}

export function isMarketOpen(now = new Date()) {
  return getMarketStatus(now).open;
}

/** HH:MM:SS, with a day count in front for long waits, e.g. "2d 17:22:05". */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const mi = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${days > 0 ? `${days}d ` : ""}${pad(h)}:${pad(mi)}:${pad(s)}`;
}
