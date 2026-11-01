import type { PresentationBundle } from "./ui/presentation-types";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@medplum/react/styles.css";
import "../styles.css";
import "../ehr.css";
// Offline release harness. Uses exactly the production painter and stylesheet.
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MantineProvider } from "@mantine/core";
import { UiScreenView } from "./ui/Screen";
import type { UiScreen } from "./ui/types";
import { clinicalTheme } from "./ui/theme";
import { paint } from "./painter";
import type { Html } from "./html";
import type { Event } from "../../../lean/generated/ehr-types";

declare global {
  interface Window {
    renderEhr: (tree: Html) => void;
    renderUi: (
      screen: UiScreen,
      presentationsOrEvent?:
        PresentationBundle | null | ((event: Event) => void),
      onEvent?: (event: Event) => void,
    ) => void;
  }
}
const element = document.getElementById("root");
if (!element) throw new Error("Missing offline root");
const root = createRoot(element);
window.renderEhr = (tree) => {
  flushSync(() => root.render(paint(tree, () => {})));
};

window.renderUi = (screen, presentationsOrEvent, onEvent) => {
  const presentations =
    typeof presentationsOrEvent === "function"
      ? null
      : (presentationsOrEvent ?? null);
  const emit =
    typeof presentationsOrEvent === "function"
      ? presentationsOrEvent
      : (onEvent ?? (() => {}));
  flushSync(() =>
    root.render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView
          screen={screen}
          onEvent={emit}
          presentations={presentations}
        />
      </MantineProvider>,
    ),
  );
};
