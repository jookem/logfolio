import { useRef } from "react";
import { TimeIcon } from "../lib/icons";

export default function TimeInput({ style, t, className, ...props }) {
  const ref = useRef(null);
  return (
    <div style={{ position: "relative" }}>
      <input
        ref={ref}
        type="time"
        className={className}
        style={{ ...style, paddingRight: 58 }}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => ref.current?.showPicker?.()}
        style={{
          position: "absolute",
          right: 32,
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
        <TimeIcon size={15} />
      </button>
    </div>
  );
}
