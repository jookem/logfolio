import React from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

Sentry.init({
  dsn: "https://6376988f5f6e06674c6f521858119015@o4511096017125376.ingest.us.sentry.io/4511096021975040",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});

window.addEventListener("unhandledrejection", (event) => {
  Sentry.captureException(event.reason);
});

const root = createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
