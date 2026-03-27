import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { subject, message, userEmail } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

  const subjectLine = subject?.trim() || "Support Request";

  try {
    const result = await resend.emails.send({
      from: "Log-Folio <hello@log-folio.com>",
      reply_to: userEmail || "miranda.adrian.irving@gmail.com",
      to: "miranda.adrian.irving@gmail.com",
      subject: `[Log-Folio Support] ${esc(subjectLine)}`,
      html: `<p><strong>From:</strong> ${esc(userEmail || "Unknown")}</p>
             <p><strong>Subject:</strong> ${esc(subjectLine)}</p>
             <hr>
             <pre style="font-family:monospace;white-space:pre-wrap">${esc(message.trim())}</pre>`,
    });
    if (result.error) {
      console.error("resend error:", result.error);
      return res.status(500).json({ error: result.error.message || "Failed to send." });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact crash:", err);
    res.status(500).json({ error: err?.message || "Failed to send message." });
  }
}
