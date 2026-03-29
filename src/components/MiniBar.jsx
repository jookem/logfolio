export default function MiniBar({ value, max, t }) {
  const w = (Math.abs(value) / Math.abs(max)) * 100;
  return (
    <div
      style={{
        height: 4,
        width: "100%",
        background: t.border2,
        borderRadius: 2,
        marginTop: 5,
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: value >= 0 ? t.positive : t.danger,
          borderRadius: 2,
        }}
      />
    </div>
  );
}
