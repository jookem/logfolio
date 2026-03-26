import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Common disposable / temporary email providers
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "tempmail.com", "10minutemail.com",
  "10minutemail.net", "10minemail.com", "throwaway.email", "trashmail.com",
  "trashmail.at", "trashmail.io", "trashmail.me", "trashmail.net", "trashmail.org",
  "maildrop.cc", "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
  "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf", "dispostable.com",
  "mailnull.com", "mailnesia.com", "tempr.email", "discard.email", "fakeinbox.com",
  "mailexpire.com", "spamgourmet.com", "crazymailing.com", "mail-temporaire.fr",
  "get2mail.fr", "filzmail.com", "spamhereplease.com", "spamgap.com",
  "getonemail.net", "mailzilla.org", "spambog.com", "spamfree24.org",
  "throwam.com", "despam.it", "mytrashmail.com", "mt2009.com", "spamobox.com",
  "spamoff.de", "wegwerfemail.de", "wegwerfmail.de", "wegwerfmail.net",
  "wegwerfmail.org", "einrot.com", "einrot.de", "lol.ovpn.to", "zetmail.com",
  "mohmal.com", "tempinbox.com", "spamevader.com", "spamfree.eu", "getnada.com",
]);

function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  // ── 1. Fetch profile ───────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, pro_trial_until, email")
    .eq("id", userId)
    .single();

  if (!profile) return res.status(404).json({ error: "User not found" });
  if (profile.subscription_status !== "free") return res.status(400).json({ error: "Already on a paid plan" });
  if (profile.pro_trial_until) return res.status(400).json({ error: "Trial already used" });

  // ── 2. Disposable email check ──────────────────────────────────────────────
  const email = profile.email || "";
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    return res.status(400).json({ error: "Disposable email addresses are not eligible for a free trial." });
  }

  // ── 3. Account age check (must be at least 1 hour old) ────────────────────
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
  if (authUser?.created_at) {
    const ageMs = Date.now() - new Date(authUser.created_at).getTime();
    if (ageMs < 60 * 60 * 1000) {
      return res.status(400).json({ error: "Account too new. Please wait a little before starting a trial." });
    }
  }

  // ── 4. IP rate limit (one trial per IP) ────────────────────────────────────
  const clientIP = getClientIP(req);
  if (clientIP) {
    const { data: ipMatch } = await supabase
      .from("profiles")
      .select("id")
      .eq("trial_ip", clientIP)
      .not("pro_trial_until", "is", null)
      .limit(1)
      .single();

    if (ipMatch) {
      return res.status(400).json({ error: "A free trial has already been used from this network." });
    }
  }

  // ── Grant trial ────────────────────────────────────────────────────────────
  const trialUntil = new Date();
  trialUntil.setDate(trialUntil.getDate() + 14);

  await supabase
    .from("profiles")
    .update({
      pro_trial_until: trialUntil.toISOString(),
      trial_ip: clientIP,
    })
    .eq("id", userId);

  res.status(200).json({ ok: true, pro_trial_until: trialUntil.toISOString() });
}
