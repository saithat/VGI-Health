import React from "react";
import { Router } from "./navigation";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { clinicalTheme } from "./ehr/ui/theme";
import { Notifications } from "@mantine/notifications";
import "./styles.css";
import "./ehr.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
createRoot(root).render(
  <React.StrictMode>
    <MantineProvider theme={clinicalTheme}>
      <Notifications position="top-right" />
      <Router />
    </MantineProvider>
  </React.StrictMode>,
);
