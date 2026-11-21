import { output } from "../browser/ui-library/schema";
import { useEffect,useState } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import "@mantine/core/styles.css";
import "../styles.css";
import "../lean-ui/painter.css";
import "./trajectory-frame.css";
import { clinicalCssVariables } from "../theme";
import { uiScreenSchema } from "../core/types";
import { trajectorySchema } from "./trajectories-data";
import {
TrajectorySurface,
type TrajectoryFrameState,
} from "./TrajectoryFrame";

const messageSchema = z.object({
  type: z.literal("trajectory-state"),
  output,
  screen: uiScreenSchema,
  trace: trajectorySchema.shape.trace,
  count: z.number().int().nonnegative(),
  speed: z.number().positive(),
  title: z.string(),
});
function RecordedFrame() {
  const [state, setState] = useState<TrajectoryFrameState>();
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== parent || event.origin !== location.origin) return;
      const parsed = messageSchema.safeParse(event.data);
      if (parsed.success) setState(parsed.data);
    };
    window.addEventListener("message", receive);
    parent.postMessage("trajectory-ready", location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  return state ? <TrajectorySurface {...state} /> : null;
}
Object.entries(clinicalCssVariables).forEach(([name, value]) =>
  document.documentElement.style.setProperty(name, value),
);
const root = document.getElementById("root");
if (!root) throw new Error("Missing replay root");
createRoot(root).render(<RecordedFrame />);
