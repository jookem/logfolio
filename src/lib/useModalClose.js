import { useState, useCallback } from "react";

export function useModalClose(duration = 220) {
  const [closing, setClosing] = useState(false);
  const trigger = useCallback((fn) => {
    if (closing) return;
    setClosing(true);
    setTimeout(fn, duration);
  }, [closing, duration]);
  return { closing, trigger };
}
