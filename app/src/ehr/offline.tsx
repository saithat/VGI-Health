// Offline release harness. Uses exactly the production painter and stylesheet.
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { paint } from "./painter";
import type { Html } from "./html";
import "../ehr.css";

declare global {
  interface Window {
    renderEhr: (tree: Html) => void;
  }
}
const element = document.getElementById("root");
if (!element) throw new Error("Missing offline root");
const root = createRoot(element);
window.renderEhr = (tree) => {
  flushSync(() => root.render(paint(tree, () => {})));
};
