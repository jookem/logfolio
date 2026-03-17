import { useState } from "react";
import { supabase } from "../lib/supabase";

function tk(dark) {
  return dark ? {
    bg: "#000", surface: "rgba(255,255,255,0.03)", border: "#1a1a1a",
    text: "#ffff", text2: "#f4f5f7", text3: "#b0b0b0",
    input: "#111", inputBorder: "#2a2a2a", card: "#0d0d0d",
    accent: "#00ff87", danger: "#ff4d6d",
  } : {
    bg: "#f4f5f7", surface: "rgba(0,0,0,0.02)", border: "#e2e4e9",
    text: "#0d0f14", text2: "#4a5068", text3: "#9499ad",
    input: "#fff", inputBorder: "#d0d4de", card: "#fff",
    accent: "#00b87a", danger: "#e63757",
  };
}

export default function AuthScreen({ isDark }) {
  const T = tk(isDark);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const inp = {
    background: T.input, border: `1px solid ${T.inputBorder}`,
    borderRadius: 8, color: T.text, padding: "10px 14px",
    fontSize: 13, width: "100%", boxSizing: "border-box",
    fontFamily: "'Space Mono', monospace", outline: "none",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setMessage("Password reset email sent.");
    }
    setLoading(false);
  };

  const reset = () => { setError(null); setMessage(null); };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 32, width: "100%", maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -1, marginBottom: 6 }}>
            LOG-FOLIO
          </div>
          <div style={{ fontSize: 11, color: T.text3, textTransform: "uppercase", letterSpacing: 2 }}>
            {mode === "login" ? "Sign in to your account" :
             mode === "signup" ? "Create your account" :
             "Reset your password"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
              Email
            </div>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          {mode !== "reset" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
                Password
              </div>
              <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
          )}

          {error && (
            <div style={{
              background: T.danger + "15", border: `1px solid ${T.danger}40`,
              borderRadius: 8, padding: "8px 12px", fontSize: 12,
              color: T.danger, marginBottom: 14,
            }}>{error}</div>
          )}
          {message && (
            <div style={{
              background: T.accent + "15", border: `1px solid ${T.accent}40`,
              borderRadius: 8, padding: "8px 12px", fontSize: 12,
              color: T.accent, marginBottom: 14,
            }}>{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px 14px",
              background: T.accent, border: "none",
              borderRadius: 8, color: "#000", fontSize: 12,
              fontWeight: 700, fontFamily: "'Space Mono', monospace",
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

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: T.text3, display: "flex", justifyContent: "center", gap: 12 }}>
          {mode === "login" && (
            <>
              <span onClick={() => { setMode("reset"); reset(); }} style={{ cursor: "pointer", color: T.text2 }}>Forgot password?</span>
              <span>·</span>
              <span onClick={() => { setMode("signup"); reset(); }} style={{ cursor: "pointer", color: T.accent }}>Create account</span>
            </>
          )}
          {mode === "signup" && (
            <span onClick={() => { setMode("login"); reset(); }} style={{ cursor: "pointer", color: T.accent }}>Already have an account? Sign in</span>
          )}
          {mode === "reset" && (
            <span onClick={() => { setMode("login"); reset(); }} style={{ cursor: "pointer", color: T.accent }}>Back to sign in</span>
          )}
        </div>
      </div>
    </div>
  );
}
