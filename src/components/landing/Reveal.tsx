"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "armed" | "in";

// Fades a section in the first time it scrolls into view.
//
// Three deliberate choices:
//  - Elements already on screen on the first paint are left alone, so nothing
//    flashes or re-animates above the fold.
//  - Before any JavaScript runs the content is simply visible, so the page works
//    without hydration.
//  - prefers-reduced-motion wins over everything: no arming, no animation.
export function Reveal({
  children,
  delay = 0,
  className,
  id,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already visible: animating now would look like the content blinked.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    setPhase("armed");
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setPhase("in");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style = { "--folio-delay": `${delay}ms` } as React.CSSProperties;
  if (phase === "armed") style.opacity = 0;

  return (
    <div ref={ref} id={id} style={style} className={`${phase === "in" ? "folio-reveal" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
