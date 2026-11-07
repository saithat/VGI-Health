import { useLayoutEffect, useRef } from "react";
import { UiChildren, type Emit } from "./nodes";
import type { UiNode } from "./types";
import "./urgent-strip.css";

/** Lean supplies all conditions and permitted acknowledgments. No local dismissal. */
export function UrgentStrip({
  nodes,
  onEvent,
}: {
  nodes: UiNode[];
  onEvent: Emit;
}) {
  const ref = useRef<HTMLElement>(null);
  const visible = nodes.length > 0;
  useLayoutEffect(() => {
    const strip = ref.current;
    const shell = strip?.closest<HTMLElement>(".clinical-app");
    if (!strip || !shell) return;
    const measure = () =>
      shell.style.setProperty(
        "--urgent-strip-height",
        `${Math.ceil(strip.getBoundingClientRect().height)}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => {
      observer.disconnect();
      shell.style.removeProperty("--urgent-strip-height");
    };
  }, [visible]);
  if (!visible) return null;
  return (
    <section
      ref={ref}
      className="urgent-alert-strip"
      aria-label="Urgent clinical alerts"
      aria-live="polite"
    >
      <UiChildren nodes={nodes} onEvent={onEvent} />
    </section>
  );
}
