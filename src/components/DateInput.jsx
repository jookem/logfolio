import { useRef } from "react";
import { CalendarIcon } from "../lib/icons";

export default function DateInput({ style, t, ...props }) {
  const ref = useRef(null);
  return (
    <div style={{ position: "relative" }}>
      <input
        ref={ref}
        type="date"
        style={{ ...style, paddingRight: 46 }}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => ref.current?.showPicker?.()}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: t?.text3 || "#888",
          display: "flex",
          alignItems: "center",
          padding: 0,
          pointerEvents: "all",
        }}
      >
        <CalendarIcon size={15} />
      </button>
    </div>
  );
}
