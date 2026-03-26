import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, pro_trial_until")
    .eq("id", userId)
    .single();

  if (!profile) return res.status(404).json({ error: "User not found" });
  if (profile.subscription_status !== "free") return res.status(400).json({ error: "Already on a paid plan" });
  if (profile.pro_trial_until) return res.status(400).json({ error: "Trial already used" });

  const trialUntil = new Date();
  trialUntil.setDate(trialUntil.getDate() + 14);

  await supabase
    .from("profiles")
    .update({ pro_trial_until: trialUntil.toISOString() })
    .eq("id", userId);

  res.status(200).json({ ok: true, pro_trial_until: trialUntil.toISOString() });
}
