import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "./lib/email.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, userId, email, refCode } = req.body || {};

  if (action === "referral") {
    if (!userId || !refCode) return res.status(400).json({ error: "Missing fields" });
    try {
      const { data: referrer } = await supabase.from("profiles").select("id, pro_trial_until, referred_count").eq("referral_code", refCode).single();
      if (!referrer) return res.status(200).json({ ok: true });
      await supabase.from("profiles").update({ referred_by: refCode }).eq("id", userId);
      const now = new Date();
      const currentEnd = referrer.pro_trial_until ? new Date(referrer.pro_trial_until) : null;
      const base = currentEnd && currentEnd > now ? currentEnd : now;
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + 30);
      await supabase.from("profiles").update({ referred_count: (referrer.referred_count || 0) + 1, pro_trial_until: newEnd.toISOString() }).eq("id", referrer.id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("referral error:", err);
      return res.status(500).json({ error: err?.message || "Failed." });
    }
  }

  // Default: welcome email
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    await sendWelcomeEmail(email);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("welcome email error:", err);
    res.status(500).json({ error: err?.message || "Failed." });
  }
}
