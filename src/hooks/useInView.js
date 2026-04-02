import { useRef, useState, useCallback } from "react";

/**
 * Returns [ref, inView].
 * Attach ref to a DOM element — inView flips to true once the element
 * is near the center of the viewport (fires only once, then disconnects).
 *
 * rootMargin "-30% 0px -30% 0px" shrinks the trigger zone to the middle
 * 40% of the viewport so animations only start when the section is
 * approximately centered on screen.
 *
 * Uses a callback ref so it works with conditionally-rendered elements.
 */
export default function useInView(threshold = 0, rootMargin = "-30% 0px -30% 0px") {
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
        { threshold, rootMargin }
      );
      obs.observe(el);
      obsRef.current = obs;
    },
    [threshold, rootMargin]
  );

  return [ref, inView];
}
