import { sendWelcomeEmail } from "./lib/email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    await sendWelcomeEmail(email);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("welcome email error:", err);
    res.status(500).json({ error: err?.message || "Failed to send." });
  }
}
