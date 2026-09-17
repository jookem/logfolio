import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "./_lib/verifyAuth.js";
import { checkRateLimit } from "./_lib/rateLimit.js";
import { snapRequest } from "./_lib/snaptrade.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isProUser(profile) {
  const proTrialActive = profile?.pro_trial_until && new Date(profile.pro_trial_until) > new Date();
  const isProPlus = profile?.subscription_status === "pro_plus";
  return profile?.subscription_status === "pro" || isProPlus || proTrialActive;
}

// Registers the caller with SnapTrade the first time they connect a broker,
// storing the returned userSecret. Idempotent — reuses the stored secret on
// every later call.
async function ensureSnapTradeUser(userId) {
  const { data: existing } = await supabase
    .from("broker_connections")
    .select("snaptrade_user_secret")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.snaptrade_user_secret) return existing.snaptrade_user_secret;

  const { userSecret } = await snapRequest("POST", "/snapTrade/registerUser", {
    body: { userId },
  });
  await supabase.from("broker_connections").upsert({ user_id: userId, snaptrade_user_secret: userSecret });
  return userSecret;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { user: authUser, error: authError } = await verifyAuth(req);
  if (authError) return res.status(401).json({ error: authError });
  const userId = authUser.id;

  if (await checkRateLimit(userId, "snaptrade", { limit: 30, windowSecs: 60 })) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
  }

  const { data: profile } = await supabase.from("profiles").select("subscription_status, pro_trial_until").eq("id", userId).single();
  if (!isProUser(profile)) return res.status(403).json({ error: "Broker sync is a Pro feature" });

  const { action } = req.body || {};

  try {
    if (action === "connect") {
      const userSecret = await ensureSnapTradeUser(userId);
      const { redirectURI } = await snapRequest("POST", "/snapTrade/login", {
        body: {
          userId,
          userSecret,
          immediateRedirect: true,
          customRedirect: process.env.APP_URL,
        },
      });
      return res.status(200).json({ url: redirectURI });
    }

    if (action === "status") {
      const { data: existing } = await supabase
        .from("broker_connections")
        .select("snaptrade_user_secret")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing?.snaptrade_user_secret) return res.status(200).json({ connected: false, accounts: [] });

      const userSecret = existing.snaptrade_user_secret;
      const [accounts, authorizations] = await Promise.all([
        snapRequest("GET", "/accounts", { params: { userId, userSecret } }),
        snapRequest("GET", "/authorizations", { params: { userId, userSecret } }),
      ]);
      return res.status(200).json({
        connected: true,
        accounts: (accounts || []).map(a => ({
          id: a.id,
          name: a.name,
          number: a.number,
          institutionName: a.institution_name,
        })),
        authorizations: (authorizations || []).map(a => ({
          id: a.id,
          brokerage: a.brokerage?.name,
          disabled: !!a.disabled,
        })),
      });
    }

    if (action === "activities") {
      const { accountId, startDate, endDate } = req.body || {};
      if (!accountId) return res.status(400).json({ error: "Missing accountId" });

      const { data: existing } = await supabase
        .from("broker_connections")
        .select("snaptrade_user_secret")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing?.snaptrade_user_secret) return res.status(400).json({ error: "No broker connected" });

      const activities = await snapRequest("GET", `/accounts/${accountId}/activities`, {
        params: {
          userId,
          userSecret: existing.snaptrade_user_secret,
          type: "BUY,SELL",
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      });

      const orders = (activities?.data || activities || [])
        .filter(a => (a.type === "BUY" || a.type === "SELL") && a.symbol?.symbol && a.trade_date)
        .map(a => {
          const [date, time] = a.trade_date.split("T");
          return {
            ticker: a.symbol.symbol.toUpperCase(),
            side: a.type === "BUY" ? "buy" : "sell",
            price: Number(a.price) || 0,
            shares: Math.abs(Number(a.units) || 0),
            date,
            time: time ? time.slice(0, 5) : "",
          };
        })
        .filter(o => o.shares > 0);

      return res.status(200).json({ orders });
    }

    if (action === "disconnect") {
      const { authorizationId } = req.body || {};
      if (!authorizationId) return res.status(400).json({ error: "Missing authorizationId" });

      const { data: existing } = await supabase
        .from("broker_connections")
        .select("snaptrade_user_secret")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing?.snaptrade_user_secret) return res.status(400).json({ error: "No broker connected" });

      await snapRequest("DELETE", `/authorizations/${authorizationId}`, {
        params: { userId, userSecret: existing.snaptrade_user_secret },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
