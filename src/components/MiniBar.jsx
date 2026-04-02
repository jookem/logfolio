import useInView from "../hooks/useInView";

export default function MiniBar({ value, max, t }) {
  const w = (Math.abs(value) / Math.abs(max)) * 100;
  const [ref, inView] = useInView(0, "-15% 0px -15% 0px");
  return (
    <div
      ref={ref}
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
          width: inView ? `${w}%` : "0%",
          height: "100%",
          background: value >= 0 ? t.positive : t.danger,
          borderRadius: 2,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
}
