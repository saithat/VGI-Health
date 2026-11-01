import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { clinicalTheme } from "./ehr/ui/theme";
import { Browse } from "./browser/Browse";
import { App } from "./App";
import { ReplayApp } from "./ReplayApp";
import { Notifications } from "@mantine/notifications";
import { LiveApp } from "./LiveApp";
import "./styles.css";
import "./ehr.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
createRoot(root).render(
  <React.StrictMode>
    <MantineProvider theme={clinicalTheme}>
      <Notifications position="top-right" />
      {window.location.pathname.replace(/\/$/, "") === "/dashboard" ? (
        <ReplayApp dashboard />
      ) : window.location.pathname.replace(/\/$/, "") === "/browse" ? (
        <Browse />
      ) : new URLSearchParams(window.location.search).get("mode") ===
        "replay" ? (
        <App />
      ) : (
        <LiveApp />
      )}
    </MantineProvider>
  </React.StrictMode>,
);
