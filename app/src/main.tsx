import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { Browse } from "./browser/Browse";
import { App } from "./App";
import { ReplayApp } from "./ReplayApp";
import "./styles.css";
import "./ehr.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
const theme = createTheme({
  primaryColor: "teal",
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: "11px", sm: "12px", md: "13px", lg: "15px", xl: "18px" },
  defaultRadius: "sm",
  components: { Button: { defaultProps: { fw: 600 } } },
});
createRoot(root).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      {window.location.pathname.replace(/\/$/, "") === "/dashboard" ? (
        <ReplayApp dashboard />
      ) : window.location.pathname.replace(/\/$/, "") === "/browse" ? (
        <Browse />
      ) : (
        <App />
      )}
    </MantineProvider>
  </React.StrictMode>,
);
