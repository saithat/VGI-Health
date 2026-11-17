import React from "react";
import { Router } from "./navigation";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { clinicalCssVariables, clinicalTheme } from "./ehr/ui/theme";
import { Notifications } from "@mantine/notifications";
import "./styles.css";
import "./ehr.css";
import { leanEntry } from "./entry";

const lean = leanEntry(location.href);
if (lean) location.replace(lean);
const root = lean ? null : document.getElementById("root");
if (!lean && !root) throw new Error("Missing app root");
Object.entries(clinicalCssVariables).forEach(([name, value]) =>
  document.documentElement.style.setProperty(name, value),
);
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <MantineProvider theme={clinicalTheme}>
        <Notifications
          position="bottom-right"
          classNames={{ root: "clinical-notifications" }}
        />
        <Router />
      </MantineProvider>
    </React.StrictMode>,
  );
