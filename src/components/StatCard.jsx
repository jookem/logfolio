import { useState } from "react";

export default function StatCard({ label, value, sub, color, t, info }) {
  const c = color || t.accent;
  const [open, setOpen] = useState(false);

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
              onClick={() => setOpen(true)}
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
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "24px 28px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  color: t.text3,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontFamily: "'Space Mono', monospace",
                  paddingTop: 2,
                }}
              >
                {label}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: t.text3,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 14, color: t.text, lineHeight: 1.7 }}>
              {info}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
