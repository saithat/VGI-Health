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

declare global {
  interface Window {
    renderEhr: (tree: Html) => void;
    renderUi: (screen: UiScreen) => void;
  }
}
const element = document.getElementById("root");
if (!element) throw new Error("Missing offline root");
const root = createRoot(element);
window.renderEhr = (tree) => {
  flushSync(() => root.render(paint(tree, () => {})));
};

window.renderUi = (screen) => {
  flushSync(() => root.render(<MantineProvider theme={clinicalTheme}><UiScreenView screen={screen} onEvent={() => {}} /></MantineProvider>));
};
