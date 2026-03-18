import React from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#000", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "#00ff87", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>
            LOG-FOLIO
          </div>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 24, maxWidth: 360 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#00ff87", border: "none", color: "#000",
              borderRadius: 8, padding: "10px 24px", cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
