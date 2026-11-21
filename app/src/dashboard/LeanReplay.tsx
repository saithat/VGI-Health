import "../lean-ui/painter.css";
import { useLayoutEffect, useRef } from "react";
import type { Event } from "../../../lean/generated/ehr-types";
import { createPainter } from "../lean-ui/painter";
import type { UiScreen } from "../core/types";
import type { Output } from "../lean-ui/layout";

interface ReplayProps {
  screen: UiScreen;
  output: Output;
  layout?: (input: string) => string;
  onEvent?: ((event: Event) => void) | undefined;
}

export function LeanReplay({ screen, output, layout, onEvent }: ReplayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const painter = createPainter(ref.current, {
      dispatch: event => onEvent?.(event),
      keyboard: (profile, rows, cols, state, key) => layout
        ? JSON.parse(layout(JSON.stringify({ op: "keyboard", profile, rows, cols, state, key })))
        : state,
    });
    painter.patch(screen, output);
    return () => painter.destroy();
  }, [screen, output, layout, onEvent]);
  return <div ref={ref} style={{ width: output.viewport.w / 64, height: output.viewport.h / 64 }} />;
}
