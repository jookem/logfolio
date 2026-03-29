import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const PADDING = 12; // min gap from viewport edge

export default function StatCard({ label, value, sub, color, t, info }) {
  const c = color || t.accent;
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close when another StatCard opens
  useEffect(() => {
    function handleOther(e) {
      if (e.detail !== label) setOpen(false);
    }
    document.addEventListener("statcard-open", handleOther);
    return () => document.removeEventListener("statcard-open", handleOther);
  }, [label]);

  function handleOpen() {
    document.dispatchEvent(new CustomEvent("statcard-open", { detail: label }));
    setOpen(true);
  }

  // Position popup before paint — avoids flash and stale-closure issues
  useLayoutEffect(() => {
    if (!open || !popRef.current || !btnRef.current) return;
    const pop = popRef.current;
    const btn = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;

    let top = btn.bottom + 8;
    // Center popup under the button, then clamp to viewport
    let left = btn.left + btn.width / 2 - popW / 2;
    if (left + popW > vw - PADDING) left = vw - PADDING - popW;
    if (left < PADDING) left = PADDING;

    // Flip above button if it overflows bottom
    if (top + popH > vh - PADDING) top = btn.top - popH - 8;
    if (top < PADDING) top = PADDING;

    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.visibility = "visible";
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (!e.target.closest("[data-statpop]")) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <>
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: "16px 18px",
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          position: "relative",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: t.text3,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 6,
            fontFamily: "'Space Mono', monospace",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {label}
          {info && (
            <button
              ref={btnRef}
              data-statpop
              onClick={handleOpen}
              title={`What is ${label}?`}
              style={{
                background: "none",
                border: `1px solid ${t.border}`,
                borderRadius: "50%",
                width: 14,
                height: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.text3,
                fontSize: 8,
                fontWeight: 700,
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ?
            </button>
          )}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: c,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: -1,
          }}
        >
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>{sub}</div>
        )}
      </div>

      {open && createPortal(
        <div
          ref={popRef}
          data-statpop
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            visibility: "hidden",
            zIndex: 9999,
            background: t.card,
            border: `1px solid ${t.border2}`,
            borderRadius: 10,
            padding: "14px 16px",
            maxWidth: `min(280px, calc(100vw - ${PADDING * 2}px))`,
            width: "max-content",
            boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
            fontFamily: "'DM Sans','Segoe UI',sans-serif",
            fontSize: 13,
            color: t.text,
            lineHeight: 1.65,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: t.text3, textTransform: "uppercase", letterSpacing: 2 }}>
              {label}
            </div>
            <button
              data-statpop
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
          {info}
        </div>,
        document.body
      )}
    </>
  );
}
