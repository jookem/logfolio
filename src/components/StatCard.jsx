import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import useInView from "../hooks/useInView";

const PADDING = 20; // min gap from viewport edge

// Parses a pre-formatted value string into { num, format } so we can
// animate from 0 → target and re-format identically on every frame.
// Returns null for non-numeric values like "—" or "∞".
function parseAnimatable(str) {
  if (!str || typeof str !== "string") return null;
  if (str === "—" || str === "∞" || str.length > 20) return null;

  // Currency: "$1,234" or "-$1,234"
  const cur = str.match(/^(-?)(\$)([\d,]+)$/);
  if (cur) {
    const sign = cur[1] === "-" ? -1 : 1;
    const num = sign * parseInt(cur[3].replace(/,/g, ""), 10);
    return {
      num,
      format: (v) => {
        const abs = Math.abs(Math.round(v));
        return `${v < 0 ? "-" : ""}$${abs.toLocaleString("en-US")}`;
      },
    };
  }

  // Percentage: "67%"
  const pct = str.match(/^(\d+)%$/);
  if (pct) {
    const num = parseInt(pct[1], 10);
    return { num, format: (v) => `${Math.round(v)}%` };
  }

  // R-multiple: "+1.50R" or "-0.30R"
  const r = str.match(/^([+-])([\d.]+)R$/);
  if (r) {
    const sign = r[1] === "-" ? -1 : 1;
    const num = sign * parseFloat(r[2]);
    const dec = r[2].includes(".") ? r[2].split(".")[1].length : 2;
    return {
      num,
      format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(dec)}R`,
    };
  }

  // Plain decimal (Sharpe, Sortino, Beta, etc.): "1.23", "-0.45", "0.1234"
  const dec = str.match(/^(-?)([\d]+)(\.[\d]+)?$/);
  if (dec) {
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    const places = dec[3] ? dec[3].length - 1 : 0;
    return { num, format: (v) => v.toFixed(places) };
  }

  return null;
}

export default function StatCard({ label, value, sub, color, t, info }) {
  const c = color || t.accent;
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [cardRef, inView] = useInView(0, "-15% 0px -15% 0px");

  // Count-up animation: runs once when card enters viewport
  const [displayed, setDisplayed] = useState(value);
  useEffect(() => {
    if (!inView) return;
    const parsed = parseAnimatable(value);
    if (!parsed) { setDisplayed(value); return; }

    const DURATION = 900;
    const target = parsed.num;
    const startTime = performance.now();
    let rafId;

    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(parsed.format(target * eased));
      if (t < 1) rafId = requestAnimationFrame(tick);
      else setDisplayed(value); // land on exact formatted string
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, value]);

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

    // Center popup under the button, then clamp to viewport
    let left = btn.left + btn.width / 2 - popW / 2;
    if (left + popW > vw - PADDING) left = vw - PADDING - popW;
    if (left < PADDING) left = PADDING;

    const spaceBelow = vh - PADDING - (btn.bottom + 8);
    const spaceAbove = btn.top - PADDING - 8;

    let top;
    if (popH <= spaceBelow || spaceBelow >= spaceAbove) {
      top = btn.bottom + 8;
      if (popH > spaceBelow) {
        pop.style.maxHeight = `${Math.max(spaceBelow, 120)}px`;
        pop.style.overflowY = "auto";
      }
    } else {
      top = btn.top - Math.min(popH, spaceAbove) - 8;
      if (popH > spaceAbove) {
        pop.style.maxHeight = `${Math.max(spaceAbove, 120)}px`;
        pop.style.overflowY = "auto";
      }
    }
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
        ref={cardRef}
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
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
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
          {displayed}
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
