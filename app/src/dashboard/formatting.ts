import type { Savings } from "./agent-evidence";
export const eventLabel = (event: object) => JSON.stringify(event);
export function savings(value: Savings | null) {
  return value
    ? `${value.clicks} clicks · ${value.scrolls} scrolls · ${value.klmDeciSec} klmDeciSec · ${value.scrollPx == null || value.mouseTravelPx == null ? "pixel metrics not measured for archived runs" : `${value.scrollPx}px scroll · ${value.mouseTravelPx}px mouse`} · ${value.keystrokes} keys (secondary)`
    : "No prediction recorded";
}
