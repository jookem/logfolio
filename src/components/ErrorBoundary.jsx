import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.compact) {
        return (
          <div style={{
            margin: "24px auto",
            maxWidth: 480,
            padding: "20px 24px",
            background: "rgba(255,77,77,0.08)",
            border: "1px solid rgba(255,77,77,0.3)",
            borderRadius: 12,
            textAlign: "center",
            fontFamily: "'Space Mono', monospace",
          }}>
            <div style={{ fontSize: 12, color: "#ff4d4d", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 16 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                background: "transparent",
                border: "1px solid #ff4d4d",
                color: "#ff4d4d",
                borderRadius: 8,
                padding: "6px 18px",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Mono', monospace",
          padding: 24,
          textAlign: "center",
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
              background: "#00ff87",
              border: "none",
              color: "#000",
              borderRadius: 8,
              padding: "10px 24px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Space Mono', monospace",
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
