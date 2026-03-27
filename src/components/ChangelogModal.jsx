import { useModalClose } from "../lib/useModalClose";
import { CHANGELOG } from "../lib/changelog";
import { CloseIcon } from "../lib/icons";

export default function ChangelogModal({ t, onClose }) {
  const { closing, trigger } = useModalClose();
  const sm = window.innerWidth < 400;
  return (
    <div className={closing ? "backdrop-exit" : "backdrop-enter"} style={{ position: "fixed", top: 0, left: 0, right: 0, minHeight: "100%", background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: sm ? 8 : 16 }}>
      <div className={closing ? "modal-minimize modal-scroll" : "modal-maximize modal-scroll"} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: sm ? 12 : 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: sm ? 14 : 28, marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: t.accent }}>
            What's New
          </div>
          <button onClick={() => trigger(onClose)} style={{ background: "none", border: "none", color: t.text3, fontSize: 20, cursor: "pointer" }}>
            <CloseIcon size="1em" />
          </button>
        </div>
        {CHANGELOG.map((entry) => (
          <div key={entry.version} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: t.text }}>
                v{entry.version}
              </span>
              <span style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace" }}>
                {entry.date}
              </span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {entry.items.map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13, color: t.text2, lineHeight: 1.6 }}>
                  <span style={{ color: t.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
