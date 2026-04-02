import { useRef, useState, useCallback } from "react";

/**
 * Returns [ref, inView].
 * Attach ref to a DOM element — inView flips to true once it enters
 * the viewport (fires only once, then the observer disconnects).
 * Uses a callback ref so it works with conditionally-rendered elements.
 */
export default function useInView(threshold = 0.1) {
  const [inView, setInView] = useState(false);
  const obsRef = useRef(null);

  const ref = useCallback(
    (el) => {
      if (obsRef.current) {
        obsRef.current.disconnect();
        obsRef.current = null;
      }
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
            obsRef.current = null;
          }
        },
        { threshold }
      );
      obs.observe(el);
      obsRef.current = obs;
    },
    [threshold]
  );

  return [ref, inView];
}
