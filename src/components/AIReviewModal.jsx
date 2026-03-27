import { useState, useEffect } from "react";
import { useModalClose } from "../lib/useModalClose";
import { CloseIcon } from "../lib/icons";
import { supabase } from "../lib/supabase";
import { calcPL, calcR } from "../lib/utils";

export default function AIReviewModal({ trade, t, onClose }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!user) { setError("Not authenticated"); setLoading(false); return; }
        const pl = calcPL(trade);
        const r = calcR(trade);
        const tradeData = { ...trade, pl, r };
        const res = await fetch("/api/review-trade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ tradeData, userId: user.id }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Failed to get review"); setLoading(false); return; }
        setReview(json.review);
      } catch (err) {
        setError(err?.message || "Failed.");
      }
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 460, padding: sm ? 14 : 28, marginTop: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: t.accent }}>
            AI Trade Review
          </div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
            <CloseIcon size="1em" />
          </button>
        </div>
        <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace", marginBottom: 16 }}>
          {trade.ticker} · {trade.direction} · {trade.date}
        </div>
        {loading && (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.text3, fontSize: 13, fontFamily: "'Space Mono',monospace" }}>
            Analyzing trade...
          </div>
        )}
        {error && (
          <div style={{ background: t.danger + "15", border: `1px solid ${t.danger}40`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: t.danger }}>
            {error}
          </div>
        )}
        {review && (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
              Coaching Feedback
            </div>
            <div style={{ fontSize: 14, color: t.text2, lineHeight: 1.75 }}>
              {review}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
