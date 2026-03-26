import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ticker } = req.body || {};
  if (!ticker || typeof ticker !== "string" || !/^[A-Z0-9.^=-]{1,10}$/i.test(ticker)) {
    return res.status(400).json({ error: "Invalid ticker" });
  }

  // Verify JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await admin.auth.getUser(token);
    if (error) return res.status(401).json({ error: "Unauthorized" });
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
