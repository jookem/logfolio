import { sendSupportEmail } from "./lib/email.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { subject, message, userEmail } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

  try {
    await sendSupportEmail({ subject, message, userEmail });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact email error:", err);
    res.status(500).json({ error: err?.message || "Failed to send message. Please try again." });
  }
}
