import { createRoot } from "react-dom/client";
import { Painter } from "../ui-library/Painter";
import { loadDiscoveryPreview } from "../data";
import "../ui-library/painter.css";
const element = document.getElementById("root");
if (!element) throw Error("Missing preview root");
const root = createRoot(element);
void loadDiscoveryPreview(
  "",
  new URLSearchParams(location.search).get("id") ?? "",
)
  .then(({ paint }) =>
    root.render(
      <main
        aria-label="Lean paint at 1440 by 900"
        style={{
          position: "relative",
          width: 1440,
          height: 900,
          overflow: "hidden",
          background: "#edf2f5",
        }}
      >
        <Painter boxes={paint.boxes} />
      </main>,
    ),
  )
  .catch((e) => root.render(<p role="alert">{String(e)}</p>));
