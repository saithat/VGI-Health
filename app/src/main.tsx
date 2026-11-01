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

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
Object.entries(clinicalCssVariables).forEach(([name, value]) =>
  document.documentElement.style.setProperty(name, value),
);
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
