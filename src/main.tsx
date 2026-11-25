import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";
import { ServerStatusBanner } from "./components/system/ServerStatusBanner";
import { AuthProvider } from "./lib/AuthProvider";
import { installGlobalErrorReporting } from "./lib/clientEvents";
import "./styles.css";

installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ServerStatusBanner />
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
