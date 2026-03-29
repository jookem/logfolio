import { sendWelcomeEmail } from "./_lib/email.js";
import { verifyAuth } from "./_lib/verifyAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, email } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: "Missing fields" });

  const { error: authError } = await verifyAuth(req, userId);
  if (authError) return res.status(authError === "Forbidden" ? 403 : 401).json({ error: authError });

  try {
    await sendWelcomeEmail(email);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("welcome email error:", err);
    res.status(500).json({ error: err?.message || "Failed." });
  }
}
