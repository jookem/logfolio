export default function Tag({ label, t, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: t.tagBg,
        color: t.tagText,
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 11,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {label}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6 }}>
          ×
        </span>
      )}
    </span>
  );
}
