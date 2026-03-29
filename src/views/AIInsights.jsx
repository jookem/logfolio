import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { WarningIcon, CheckIcon, CircleIcon } from "../lib/icons";
import { jsPDF } from "jspdf";

const DAILY_LIMIT = 3;
const today = () => new Date().toISOString().slice(0, 10);

const getDailyUsage = (userId) => {
  try {
    const raw = localStorage.getItem(`ai_daily_${userId}`);
    if (!raw) return { date: "", count: 0 };
    return JSON.parse(raw);
  } catch { return { date: "", count: 0 }; }
};
const saveDailyUsage = (userId, data) => {
  try { localStorage.setItem(`ai_daily_${userId}`, JSON.stringify(data)); } catch {}
};

// Compress an image file to JPEG, max 1200px wide, returns { base64, mediaType }
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AIInsights({ plList, t, mobile }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [insightsAt, setInsightsAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedToday, setUsedToday] = useState(0);
  const [chartImage, setChartImage] = useState(null); // { base64, mediaType, previewUrl }
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const usage = getDailyUsage(user.id);
    setUsedToday(usage.date === today() ? usage.count : 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("ai_insights, ai_insights_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.ai_insights) {
          setInsights(data.ai_insights);
          setInsightsAt(data.ai_insights_at);
        }
      });
  }, [user]);

  const generatePDF = async () => {
    if (!insights) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 22;

    // Colour palette (light-mode for print readability)
    const C = {
      accent:    [0, 184, 122],
      danger:    [230, 55, 87],
      amber:     [245, 158, 11],
      black:     [13, 15, 20],
      gray:      [74, 80, 104],
      muted:     [149, 153, 173],
      rule:      [197, 200, 212],
      cardBg:    [244, 245, 247],
    };
    const scoreColor = insights.score >= 70 ? C.accent : insights.score >= 40 ? C.amber : C.danger;
    const patternColor = (type) => type === "warning" ? C.danger : type === "strength" ? C.accent : C.muted;

    // ── Branding bar ──────────────────────────────────
    doc.setFillColor(...C.black);
    doc.rect(0, 0, pageW, 14, "F");

    // Logo — render SVG to canvas to preserve transparency over the black bar
    try {
      const svgText = await fetch("/images/logfolio.svg").then(r => r.text());
      const logoDataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 76; canvas.height = 76;
          canvas.getContext("2d").drawImage(img, 0, 0, 76, 76);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = url;
      });
      doc.addImage(logoDataUrl, "PNG", margin, 1.5, 10, 10);
    } catch { /* skip logo if fetch fails */ }

    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text("LOG-FOLIO", margin + 12, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text("AI Pattern Analysis Report", margin + 39, 8);

    y = 24;

    // ── Title & meta ──────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C.black);
    doc.text("AI Pattern Analysis", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.gray);
    const dateStr = insightsAt
      ? new Date(insightsAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date().toLocaleDateString();
    doc.text(`Generated ${dateStr}  ·  Based on ${plList.length} trades`, margin, y);
    y += 9;

    // ── Score row ─────────────────────────────────────
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(margin, y, contentW, 24, 2, 2, "F");

    // Circle
    const cx = margin + 16, cy = y + 12;
    doc.setDrawColor(...scoreColor);
    doc.setLineWidth(1.5);
    doc.circle(cx, cy, 9, "S");
    doc.setFont("courier", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...scoreColor);
    const scoreTxt = String(insights.score);
    doc.text(scoreTxt, cx - doc.getTextWidth(scoreTxt) / 2, cy + 2.5);

    // Label + description — constrained to the left column so they don't bleed into counts
    const lx = cx + 14;
    const countsStartX = margin + contentW - 56; // counts occupy the right 56mm
    const descMaxW = countsStartX - lx - 4;      // description stops before counts area
    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...scoreColor);
    doc.text(insights.scoreLabel, lx, cy - 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.gray);
    const descLines = doc.splitTextToSize("Overall trader rating based on consistency, discipline and execution", descMaxW);
    doc.text(descLines, lx, cy + 6);

    // Pattern counts — right-aligned, 3 columns of ~18mm each
    const counts = {
      warning:  insights.patterns.filter(p => p.type === "warning").length,
      strength: insights.patterns.filter(p => p.type === "strength").length,
      neutral:  insights.patterns.filter(p => p.type === "neutral").length,
    };
    [["Warnings", counts.warning, C.danger], ["Strengths", counts.strength, C.accent], ["Neutral", counts.neutral, C.muted]].forEach(([label, n, col], i) => {
      const tx = countsStartX + i * 19;
      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...col);
      doc.text(String(n), tx, cy - 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...col);
      doc.text(label, tx, cy + 5);
    });
    y += 30;

    // ── Section header ────────────────────────────────
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("PATTERNS", margin, y);
    y += 6;

    // ── Pattern cards ─────────────────────────────────
    insights.patterns.forEach((p) => {
      const col = patternColor(p.type);
      const detailLines = doc.splitTextToSize(p.detail, contentW - 10);
      const actionLines = doc.splitTextToSize(p.action, contentW - 10);
      const cardH = 6 + 5.5 + detailLines.length * 4.8 + 5 + 4 + actionLines.length * 4.8 + 5;

      if (y + cardH > 275) { doc.addPage(); y = 20; }

      doc.setFillColor(...C.cardBg);
      doc.roundedRect(margin, y, contentW, cardH, 2, 2, "F");
      doc.setFillColor(...col);
      doc.roundedRect(margin, y, 3, cardH, 1, 1, "F");

      let cy2 = y + 6;

      // Type badge
      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...col);
      doc.text(p.type.toUpperCase(), margin + 7, cy2);
      cy2 += 5.5;

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...C.black);
      doc.text(p.title, margin + 7, cy2);
      cy2 += detailLines.length > 0 ? 4.5 : 0;

      // Detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.gray);
      detailLines.forEach(line => { cy2 += 4.8; doc.text(line, margin + 7, cy2); });
      cy2 += 5;

      // Action label
      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...col);
      doc.text("ACTION", margin + 7, cy2);
      cy2 += 4;

      // Action text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.gray);
      actionLines.forEach(line => { cy2 += 4.8; doc.text(line, margin + 7, cy2); });

      y += cardH + 4;
    });

    // ── Footer disclaimer ─────────────────────────────
    if (y + 22 > 280) { doc.addPage(); y = 20; }
    y += 3;
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    const disclaimer = "Not financial advice. These insights are generated by AI based on your trade journal data and are for educational and self-reflection purposes only. They do not constitute financial, investment, or trading advice. Always do your own research before making any trading decisions.";
    doc.splitTextToSize(disclaimer, contentW).forEach(line => { doc.text(line, margin, y); y += 4.5; });
    y += 2;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("log-folio.com", margin, y);

    doc.save(`logfolio-ai-analysis-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleImageSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) { setError("Image too large. Please use a screenshot under 8 MB."); return; }
    setError(null);
    try {
      const compressed = await compressImage(file);
      // Guard: base64 payload should stay under ~1.5 MB to avoid serverless body limit
      if (compressed.base64.length > 1.5 * 1024 * 1024) {
        setError("Image is too large after compression. Please crop or resize the screenshot.");
        return;
      }
      const previewUrl = `data:${compressed.mediaType};base64,${compressed.base64}`;
      setChartImage({ ...compressed, previewUrl });
    } catch {
      setError("Could not load image. Please try a different file.");
    }
  };

  const analysePatterns = async () => {
    if (plList.length < 3) {
      setError("Add at least 3 trades to generate insights.");
      return;
    }
    const usage = getDailyUsage(user?.id);
    const todayCount = usage.date === today() ? usage.count : 0;
    if (todayCount >= DAILY_LIMIT) {
      setError(`Daily limit reached (${DAILY_LIMIT} analyses/day). Resets at midnight.`);
      return;
    }
    setLoading(true);
    setError(null);
    setInsights(null);

    const summary = plList.map((tr) => ({
      date: tr.date,
      ticker: tr.ticker,
      strategy: tr.strategy,
      type: tr.type,
      pl: tr.pl,
      emotion: tr.emotion,
      mistake: tr.mistake,
      tags: tr.tags,
      direction: tr.direction,
      dayOfWeek: new Date(tr.date).toLocaleDateString("en-US", { weekday: "long" }),
      hour: new Date(tr.date).getHours(),
    }));

    const totalPL = plList.reduce((s, t) => s + t.pl, 0);
    const wins = plList.filter((t) => t.pl > 0);
    const losses = plList.filter((t) => t.pl < 0);
    const winRate = ((wins.length / plList.length) * 100).toFixed(0);

    const promptText = `You are an expert trading coach analysing a trader's journal data.${chartImage ? " The trader has also provided a chart screenshot for additional context." : ""} Identify patterns, weaknesses and strengths. Be specific with numbers and percentages from the data.${chartImage ? "\n\nFor the chart: describe what you observe (trend, key levels, setup quality, entry/exit timing if visible) and how it relates to the trader's patterns." : ""}

Here is their trade history:
${JSON.stringify(summary, null, 2)}

Overall stats:
- Total trades: ${plList.length}
- Win rate: ${winRate}%
- Total P&L: $${totalPL.toFixed(0)}
- Avg win: $${wins.length ? (wins.reduce((s, t) => s + t.pl, 0) / wins.length).toFixed(0) : 0}
- Avg loss: $${losses.length ? (losses.reduce((s, t) => s + t.pl, 0) / losses.length).toFixed(0) : 0}

Return ONLY a JSON object with no markdown, no backticks, no preamble. Use exactly this structure:
{
  "score": <overall trader score 0-100>,
  "scoreLabel": "<one word label like Developing/Consistent/Strong/Elite>",
  "patterns": [
    {
      "type": "warning|strength|neutral",
      "title": "<short title>",
      "detail": "<specific insight with numbers from the data>",
      "action": "<one concrete recommended action>"
    }
  ]
}
Provide 4-6 patterns${chartImage ? " (include 1-2 patterns specifically about the chart if relevant)" : ""}. Be brutally honest but constructive.`;

    const messageContent = chartImage
      ? [
          { type: "image", source: { type: "base64", media_type: chartImage.mediaType, data: chartImage.base64 } },
          { type: "text", text: promptText },
        ]
      : promptText;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          feature: "insights",
          messages: [{ role: "user", content: messageContent }],
        }),
      });

      const data = await response.json();
      if (response.status === 429) {
        setError(data.error || "Daily limit reached. Resets at midnight.");
        setLoading(false);
        return;
      }
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      if (!data.content) throw new Error("Empty response from API");
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const now = new Date().toISOString();
      setInsights(parsed);
      setInsightsAt(now);
      const newCount = todayCount + 1;
      saveDailyUsage(user?.id, { date: today(), count: newCount });
      setUsedToday(newCount);
      if (user) {
        await supabase
          .from("profiles")
          .update({ ai_insights: parsed, ai_insights_at: now })
          .eq("id", user.id);
      }
    } catch (e) {
      setError("Could not generate insights. Please try again. " + e.message);
    }
    setLoading(false);
  };

  const scoreColor = insights
    ? insights.score >= 70 ? t.accent : insights.score >= 40 ? "#f59e0b" : t.danger
    : t.text3;

  return (
    <div>
      {/* ── AI Pattern Detector header ───────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            AI Pattern Detector
          </div>
          <div style={{ fontSize: 13, color: t.text3 }}>
            Powered by Claude · Based on {plList.length} trades
          </div>
          {insightsAt && (
            <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>
              Last analysed {new Date(insightsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < usedToday ? t.text3 : t.accent, opacity: i < usedToday ? 0.3 : 1 }} />
            ))}
            <span style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", marginLeft: 4 }}>
              {DAILY_LIMIT - usedToday}/{DAILY_LIMIT} remaining today
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {insights && (
            <button
              onClick={() => generatePDF()}
              style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.text3, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace" }}
            >
              Export PDF
            </button>
          )}
          <button
            onClick={analysePatterns}
            disabled={loading || usedToday >= DAILY_LIMIT}
            style={{ background: usedToday >= DAILY_LIMIT ? t.card2 : t.accent, border: `1px solid ${usedToday >= DAILY_LIMIT ? t.border : "transparent"}`, color: usedToday >= DAILY_LIMIT ? t.text3 : "#000", borderRadius: 8, padding: "8px 16px", cursor: (loading || usedToday >= DAILY_LIMIT) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Analysing..." : usedToday >= DAILY_LIMIT ? "Limit reached" : "↻ Re-analyse"}
          </button>
        </div>
      </div>

      {/* Chart image upload */}
      <div style={{ marginBottom: 20 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); e.target.value = ""; }}
        />
        {chartImage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px" }}>
            <img src={chartImage.previewUrl} alt="Chart" style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 2 }}>Chart attached</div>
              <div style={{ fontSize: 11, color: t.text3 }}>Claude will analyse this chart alongside your trade data</div>
            </div>
            <button
              onClick={() => setChartImage(null)}
              style={{ background: "none", border: "none", color: t.text4, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ width: "100%", background: "none", border: `1px dashed ${t.border}`, borderRadius: 10, padding: "14px 20px", cursor: "pointer", color: t.text3, fontSize: 12, fontFamily: "'Space Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
          >
            + Attach chart screenshot (optional)
          </button>
        )}
      </div>

      {loading && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 48, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: t.accent, marginBottom: 8 }}>
            Analysing your trading patterns...
          </div>
          <div style={{ fontSize: 12, color: t.text3 }}>{chartImage ? "Claude is reviewing your trade history and chart" : "Claude is reviewing your trade history"}</div>
        </div>
      )}

      {error && (
        <div style={{ background: t.danger + "10", border: `1px solid ${t.danger}30`, borderRadius: 12, padding: 20, color: t.danger, fontSize: 13, fontFamily: "'Space Mono',monospace", marginBottom: 24 }}>
          ⚠ {error}
        </div>
      )}

      {insights && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${scoreColor}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{insights.score}</div>
                <div style={{ fontSize: 9, color: t.text3, textTransform: "uppercase", letterSpacing: 1 }}>score</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: scoreColor, marginBottom: 4 }}>{insights.scoreLabel}</div>
                <div style={{ fontSize: 12, color: t.text3, lineHeight: 1.5 }}>Overall trader rating based on consistency, discipline and execution</div>
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Pattern Summary</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["warning", t.danger, "Warnings", <WarningIcon size={12} />], ["strength", t.accent, "Strengths", <CheckIcon size={12} />], ["neutral", t.text3, "Neutral", <CircleIcon size={12} />]].map(([type, color, label, icon]) => (
                  <div key={type} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color }}>{insights.patterns.filter((p) => p.type === type).length}</div>
                    <div style={{ fontSize: 11, color, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>{icon}{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.patterns.map((p, i) => {
              const color = p.type === "warning" ? t.danger : p.type === "strength" ? t.accent : t.text3;
              const icon = p.type === "warning"
                ? <WarningIcon size={16} />
                : p.type === "strength"
                  ? <CheckIcon size={16} />
                  : <CircleIcon size={16} />;
              return (
                <div key={i} style={{ background: t.surface, border: `1px solid ${color}25`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${color}15`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color, marginTop: 1, flexShrink: 0, display: "flex" }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color, marginBottom: 5 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.6 }}>{p.detail}</div>
                    </div>
                  </div>
                  <div style={{ padding: "11px 18px", background: color + "08", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 11, color, fontFamily: "'Space Mono',monospace", flexShrink: 0, marginTop: 1 }}>ACTION</span>
                    <div style={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}>{p.action}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, padding: "12px 16px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
            <span style={{ flexShrink: 0, color: t.text3, display: "flex" }}><WarningIcon size={16} /></span>
            <p style={{ margin: 0, fontSize: 11, color: t.text3, lineHeight: 1.6 }}>
              <strong style={{ color: t.text2 }}>Not financial advice.</strong> These insights are generated by AI based on your trade journal data and are for educational and self-reflection purposes only. They do not constitute financial, investment, or trading advice. Always do your own research before making any trading decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
