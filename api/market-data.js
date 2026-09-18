import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "./_lib/rateLimit.js";
import { fetchScreenerQuotes, filterPartyStarters } from "./_lib/partyStarter.js";
import { scanOptionsPartyStarters } from "./_lib/optionsPartyStarter.js";

// Vercel Hobby caps a deployment at 12 serverless functions, so the three
// market-data proxies (Polygon, Yahoo Finance, Alpha Vantage) live in one
// file, dispatched by `provider`, instead of one file each.

const YF_ALLOWED_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const YF_BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

async function getYfCrumb() {
  // Session cookie: the Yahoo home page, falling back to the much lighter
  // fc.yahoo.com if the home page can't be fetched.
  const joinCookies = (raw) => raw
    .split(/,(?=[^ ])/)
    .map(c => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
  let cookies = "";
  try {
    const pageRes = await fetch("https://finance.yahoo.com/", { headers: YF_BASE_HEADERS, redirect: "follow" });
    cookies = joinCookies(pageRes.headers.get("set-cookie") || "");
  } catch {
    const fcRes = await fetch("https://fc.yahoo.com/", { headers: YF_BASE_HEADERS, redirect: "manual" });
    cookies = typeof fcRes.headers.getSetCookie === "function"
      ? fcRes.headers.getSetCookie().map(c => c.split(";")[0].trim()).filter(Boolean).join("; ")
      : joinCookies(fcRes.headers.get("set-cookie") || "");
  }

  // Get crumb using those cookies
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...YF_BASE_HEADERS, Cookie: cookies },
  });
  const crumb = await crumbRes.text();
  return { crumb: crumb.trim(), cookies };
}

async function handlePolygon(req, res, userId) {
  const { path } = req.body || {};
  if (
    !path ||
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.includes("@") ||
    path.startsWith("//")
  ) {
    return res.status(400).json({ error: "Invalid path" });
  }

  if (userId && await checkRateLimit(userId, "polygon", { limit: 100, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }

  const key = process.env.POLYGON_API_KEY;
  if (!key) return res.status(500).json({ error: "Polygon API key not configured" });

  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.polygon.io${path}${sep}apiKey=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function handleYf(req, res, userId) {
  const { url } = req.body || {};
  if (!url || typeof url !== "string" || !YF_ALLOWED_HOSTS.some(h => url.startsWith(h))) {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (userId && await checkRateLimit(userId, "yf", { limit: 20, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");

  const isOptionsUrl = url.includes("/v7/finance/options");

  try {
    let finalUrl = url;
    let fetchHeaders = { ...YF_BASE_HEADERS };

    if (isOptionsUrl) {
      try {
        const { crumb, cookies } = await getYfCrumb();
        if (crumb && crumb.length > 0 && !crumb.startsWith("<")) {
          finalUrl = `${url}${url.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(crumb)}`;
          fetchHeaders = { ...YF_BASE_HEADERS, Cookie: cookies };
        }
      } catch {
        // proceed without crumb — may still work or return a useful error
      }
    }

    const response = await fetch(finalUrl, { headers: fetchHeaders });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Non-JSON response from upstream",
        status: response.status,
        preview: text.slice(0, 200),
      });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function handleAlphavantage(req, res, userId) {
  const { ticker } = req.body || {};
  if (!ticker || typeof ticker !== "string" || !/^[A-Z0-9.^=-]{1,10}$/i.test(ticker)) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  if (userId && await checkRateLimit(userId, "alphavantage", { limit: 10, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }

  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return res.status(500).json({ error: "Alpha Vantage API key not configured" });

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker.toUpperCase()}&outputsize=compact&apikey=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function handlePartyStarter(req, res, userId) {
  if (userId && await checkRateLimit(userId, "party-starter", { limit: 10, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }
  try {
    const quotes = await fetchScreenerQuotes(YF_BASE_HEADERS);
    if (!quotes.length) return res.status(502).json({ error: "Screener data unavailable" });
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate");
    return res.status(200).json({ picks: filterPartyStarters(quotes), scanned: quotes.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function handleOptionsPartyStarter(req, res, userId) {
  if (userId && await checkRateLimit(userId, "options-party-starter", { limit: 3, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }
  try {
    let auth = { crumb: "", cookies: "" };
    try { auth = await getYfCrumb(); } catch { /* chains may still load without a crumb */ }
    const headers = auth.cookies ? { ...YF_BASE_HEADERS, Cookie: auth.cookies } : YF_BASE_HEADERS;
    const yf = async (url) => {
      try {
        const isChain = url.includes("/v7/finance/options");
        const finalUrl = isChain && auth.crumb && !auth.crumb.startsWith("<")
          ? `${url}${url.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(auth.crumb)}` : url;
        const r = await fetch(finalUrl, { headers });
        return r.ok ? await r.json() : null;
      } catch {
        return null;
      }
    };
    const quotes = await fetchScreenerQuotes(YF_BASE_HEADERS, ["most_actives", "day_gainers", "day_losers"]);
    if (!quotes.length) return res.status(502).json({ error: "Screener data unavailable" });
    const { picks, funnel } = await scanOptionsPartyStarters(yf, quotes);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ picks, funnel });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { provider } = req.body || {};

  // Verify JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  let userId;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Unauthorized" });
    userId = user.id;
  }

  if (provider === "polygon") return handlePolygon(req, res, userId);
  if (provider === "yf") return handleYf(req, res, userId);
  if (provider === "alphavantage") return handleAlphavantage(req, res, userId);
  if (provider === "party-starter") return handlePartyStarter(req, res, userId);
  if (provider === "options-party-starter") return handleOptionsPartyStarter(req, res, userId);
  return res.status(400).json({ error: "Unknown provider" });
}
