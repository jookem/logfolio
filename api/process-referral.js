import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { newUserId, refCode } = req.body || {};
  if (!newUserId || !refCode) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, pro_trial_until, referred_count")
      .eq("referral_code", refCode)
      .single();

    if (!referrer) return res.status(200).json({ ok: true });

    await supabase
      .from("profiles")
      .update({ referred_by: refCode })
      .eq("id", newUserId);

    const now = new Date();
    const currentTrialEnd = referrer.pro_trial_until ? new Date(referrer.pro_trial_until) : null;
    const base = currentTrialEnd && currentTrialEnd > now ? currentTrialEnd : now;
    const newTrialEnd = new Date(base);
    newTrialEnd.setDate(newTrialEnd.getDate() + 30);

    await supabase
      .from("profiles")
      .update({
        referred_count: (referrer.referred_count || 0) + 1,
        pro_trial_until: newTrialEnd.toISOString(),
      })
      .eq("id", referrer.id);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("process-referral error:", err);
    res.status(500).json({ error: err?.message || "Failed." });
  }
}
