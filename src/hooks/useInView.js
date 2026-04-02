import { useRef, useState, useEffect } from "react";

/**
 * Returns [ref, inView].
 * Attach ref to a DOM element — inView flips to true once it enters
 * the viewport (fires only once, then the observer disconnects).
 */
export default function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}
