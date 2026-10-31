import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { MedplumProvider } from "@medplum/react-hooks";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@medplum/react/styles.css";
import { medplum } from "./data/medplum";
import { App } from "./App";
import { Dashboard } from "./dashboard/Dashboard";
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
      <MedplumProvider medplum={medplum}>
        {window.location.pathname === "/dashboard" ? <Dashboard /> : <App />}
      </MedplumProvider>
    </MantineProvider>
  </React.StrictMode>,
);
