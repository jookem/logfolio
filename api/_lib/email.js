import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Log-Folio <hello@log-folio.com>";
const REPLY_TO = "miranda.adrian.irving@gmail.com";

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function base(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0a;font-family:monospace">
  <div style="max-width:520px;margin:0 auto;background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:40px">
    <div style="margin-bottom:28px">
      <span style="color:#00ff87;font-size:13px;font-weight:700;letter-spacing:3px">LOG-FOLIO</span>
    </div>
    ${content}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1a1a1a;font-size:11px;color:#555;line-height:1.8">
      <a href="https://log-folio.com" style="color:#00ff87;text-decoration:none">log-folio.com</a>
      &nbsp;·&nbsp; Trade smarter.
    </div>
  </div>
</body>
</html>`;
}

export async function sendTrialStarted(email) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  const formatted = expiryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: email,
    subject: "Your 14-day Pro trial has started",
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Your Pro trial is live.</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.7">You have full access to Pro features until <strong style="color:#f4f5f7">${formatted}</strong>.</p>
      <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:14px">WHAT'S UNLOCKED</div>
        ${["Full Analytics dashboard", "Unlimited trade logging", "CSV import"].map(f =>
          `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px;color:#ccc">
            <span style="color:#00ff87;font-weight:700">✓</span> ${f}
          </div>`
        ).join("")}
      </div>
      <a href="https://log-folio.com" style="display:inline-block;background:#00ff87;color:#000;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.5px">Open Log-Folio →</a>
    `),
  });
}

export async function sendTrialExpiringSoon(email, daysLeft, expiryDate) {
  const formatted = new Date(expiryDate).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const urgency = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

  await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: email,
    subject: `Your Pro trial expires ${urgency}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Your trial ends ${urgency}.</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.7">
        Your free Pro trial expires on <strong style="color:#f4f5f7">${formatted}</strong>. Upgrade to keep access to Analytics, unlimited trades, and CSV import.
      </p>
      <a href="https://log-folio.com" style="display:inline-block;background:#00ff87;color:#000;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.5px;margin-bottom:16px">Upgrade to Pro · $4.99/mo →</a>
      <p style="margin:16px 0 0;font-size:12px;color:#555">If you choose not to upgrade, you'll move to the free plan (5 trades/month) on ${formatted}.</p>
    `),
  });
}

export async function sendPaymentConfirmation(email, plan) {
  const planName = plan === "pro_plus" ? "Pro Plus" : "Pro";
  const price = plan === "pro_plus" ? "$14.99" : "$4.99";
  const features = plan === "pro_plus"
    ? ["Full Analytics dashboard", "Unlimited trade logging", "CSV import", "AI Insights (3/day)", "AI Assist in trade planning (3/day)"]
    : ["Full Analytics dashboard", "Unlimited trade logging", "CSV import"];

  await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: email,
    subject: `You're now on Log-Folio ${planName}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Welcome to ${planName}.</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.7">Your subscription is active at <strong style="color:#f4f5f7">${price}/month</strong>. Here's what you have access to:</p>
      <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:14px">${planName.toUpperCase()} FEATURES</div>
        ${features.map(f =>
          `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px;color:#ccc">
            <span style="color:#00ff87;font-weight:700">✓</span> ${f}
          </div>`
        ).join("")}
      </div>
      <a href="https://log-folio.com" style="display:inline-block;background:#00ff87;color:#000;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.5px">Open Log-Folio →</a>
    `),
  });
}

export async function sendWeeklySummary(email, { stats, narrative }) {
  const { weekStart, weekEnd, totalTrades, wins, losses, winRate, totalPL } = stats;
  const plColor = totalPL >= 0 ? "#00ff87" : "#ff4d6d";
  const plSign = totalPL >= 0 ? "+" : "";
  await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: email,
    subject: `Your trading week: ${weekStart} – ${weekEnd}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Weekly Trading Summary</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.7">${weekStart} – ${weekEnd}</p>
      <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:14px">YOUR WEEK</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:4px">
          <div>
            <div style="font-size:10px;color:#555;letter-spacing:1.5px;margin-bottom:4px">TRADES</div>
            <div style="font-size:18px;font-weight:700;color:#f4f5f7;font-family:monospace">${totalTrades}</div>
          </div>
          <div>
            <div style="font-size:10px;color:#555;letter-spacing:1.5px;margin-bottom:4px">WIN RATE</div>
            <div style="font-size:18px;font-weight:700;color:#f4f5f7;font-family:monospace">${winRate}%</div>
          </div>
          <div>
            <div style="font-size:10px;color:#555;letter-spacing:1.5px;margin-bottom:4px">P&L</div>
            <div style="font-size:18px;font-weight:700;color:${plColor};font-family:monospace">${plSign}$${Math.abs(totalPL).toFixed(0)}</div>
          </div>
        </div>
      </div>
      ${narrative ? `<p style="margin:0 0 28px;font-size:13px;color:#ccc;line-height:1.8;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px">${esc(narrative)}</p>` : ""}
      <a href="https://log-folio.com" style="display:inline-block;background:#00ff87;color:#000;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.5px">Open Log-Folio →</a>
    `),
  });
}

export async function sendWelcomeEmail(email) {
  await resend.emails.send({
    from: FROM,
    reply_to: REPLY_TO,
    to: email,
    subject: "Welcome to Log-Folio",
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Welcome to Log-Folio.</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.7">Log-Folio is your personal trading journal — built to help you track trades, spot patterns, and improve your edge over time.</p>
      <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:14px">WHAT YOU CAN DO</div>
        ${["Log trades with entry, exit, emotion and mistakes", "Analyze your performance with detailed analytics", "Plan trades and track your ideas", "Review your journal week by week"].map(f =>
          `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px;color:#ccc">
            <span style="color:#00ff87;font-weight:700">✓</span> ${f}
          </div>`
        ).join("")}
      </div>
      <a href="https://log-folio.com" style="display:inline-block;background:#00ff87;color:#000;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.5px">Start Logging →</a>
    `),
  });
}

export async function sendSupportEmail({ subject, message, userEmail }) {
  const subjectLine = subject?.trim() ? subject.trim() : "Support Request";
  await resend.emails.send({
    from: FROM,
    reply_to: userEmail || REPLY_TO,
    to: REPLY_TO,
    subject: `[Log-Folio Support] ${esc(subjectLine)}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f4f5f7">Support Request</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#888;line-height:1.7">From: <strong style="color:#f4f5f7">${esc(userEmail || "Unknown")}</strong></p>
      <div style="background:#0d0d0d;border:1px solid #1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:12px">${esc(subjectLine).toUpperCase()}</div>
        <div style="font-size:13px;color:#ccc;line-height:1.8;white-space:pre-wrap">${esc(message.trim())}</div>
      </div>
      <p style="margin:0;font-size:11px;color:#555">Reply to this email to respond directly to the user.</p>
    `),
  });
}
