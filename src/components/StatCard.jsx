import { useState, useRef, useEffect } from "react";

export default function StatCard({ label, value, sub, color, t, info }) {
  const c = color || t.accent;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
    setOpen(true);
  }

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

      {open && (
        <div
          data-statpop
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "14px 16px",
            maxWidth: 280,
            width: "max-content",
            boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
            fontSize: 13,
            color: t.text,
            lineHeight: 1.65,
          }}
        >
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: t.text3, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            {label}
          </div>
          {info}
        </div>
      )}
    </>
  );
}
