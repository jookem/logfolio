import { useState } from "react";
import { supabase } from "../lib/supabase";

const DARK = {
  bg: "#0d0d0d", surface: "#141414", border: "#1e1e1e",
  text: "#e8e8e8", text2: "#b0b0b0", text3: "#666",
  input: "#1a1a1a", inputBorder: "#2a2a2a",
  accent: "#00ff88", danger: "#ff4444",
};
const LIGHT = {
  bg: "#f5f5f5", surface: "#ffffff", border: "#e5e5e5",
  text: "#111", text2: "#444", text3: "#888",
  input: "#f9f9f9", inputBorder: "#ddd",
  accent: "#00b060", danger: "#e03030",
};

export default function AuthScreen({ isDark }) {
  const T = isDark ? DARK : LIGHT;
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const inputStyle = {
    background: T.input, border: `1px solid ${T.inputBorder}`,
    borderRadius: 8, color: T.text, padding: "10px 14px",
    fontSize: 13, width: "100%", boxSizing: "border-box",
    fontFamily: "inherit", outline: "none",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link.");
    } else if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setError(error.message);
      else setMessage("Password reset email sent.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 32, width: "100%", maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: T.accent,
            letterSpacing: -1, marginBottom: 4,
          }}>
            LOG-FOLIO
          </div>
          <div style={{ fontSize: 12, color: T.text3 }}>
            {mode === "login" ? "Sign in to your account" :
             mode === "signup" ? "Create your account" :
             "Reset your password"}
          </div>
        </div>

        {/* Google button */}
        {mode !== "reset" && (
          <button
            onClick={handleGoogle}
            style={{
              width: "100%", padding: "10px 14px",
              background: "none", border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.text, fontSize: 13,
              fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 16,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        {mode !== "reset" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.text3 }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
              Email
            </div>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== "reset" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
                Password
              </div>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div style={{
              background: DARK.danger + "15", border: `1px solid ${DARK.danger}40`,
              borderRadius: 7, padding: "8px 12px", fontSize: 12,
              color: DARK.danger, marginBottom: 12,
            }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{
              background: T.accent + "15", border: `1px solid ${T.accent}40`,
              borderRadius: 7, padding: "8px 12px", fontSize: 12,
              color: T.accent, marginBottom: 12,
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px 14px",
              background: T.accent, border: "none",
              borderRadius: 8, color: "#000", fontSize: 13,
              fontWeight: 700, fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." :
             mode === "login" ? "Sign In" :
             mode === "signup" ? "Create Account" :
             "Send Reset Email"}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: T.text3 }}>
          {mode === "login" && (
            <>
              <span
                onClick={() => { setMode("reset"); setError(null); setMessage(null); }}
                style={{ cursor: "pointer", color: T.text2 }}
              >
                Forgot password?
              </span>
              <span style={{ margin: "0 8px" }}>·</span>
              <span
                onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                style={{ cursor: "pointer", color: T.accent }}
              >
                Create account
              </span>
            </>
          )}
          {mode === "signup" && (
            <span
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              style={{ cursor: "pointer", color: T.accent }}
            >
              Already have an account? Sign in
            </span>
          )}
          {mode === "reset" && (
            <span
              onClick={() => { setMode("login"); setError(null); setMessage(null); }}
              style={{ cursor: "pointer", color: T.accent }}
            >
              Back to sign in
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
