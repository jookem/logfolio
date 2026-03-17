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
        background: T.card,
        borderRadius: 16, padding: 32, width: "100%", maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <svg width="48" height="48" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
              <rect x="4.9" y="11" fill="#FF1212" width="4.3" height="12"/>
              <rect x="6.8" y="8.4" fill="#FF1212" width="0.4" height="17.1"/>
              <rect x="11.5" y="15.5" fill="#12B248" width="4.3" height="7.3"/>
              <rect x="13.4" y="13.9" fill="#12B248" width="0.4" height="10.5"/>
              <rect x="19.8" y="6" fill="#12B248" width="0.5" height="14.7"/>
              <rect x="17.9" y="7.5" fill="#12B248" width="4.3" height="10.7"/>
              <polyline fill="none" stroke="#3B82F6" strokeMiterlimit="10" points="4.7,29 6.7,27 13.7,27 20.3,21.8 25.1,20.8"/>
              <path fill="#FFFFFF" d="M25.5,19.1L25.1,19l-0.4-2.9c-0.1-0.5-0.1-0.7-0.1-0.9c0-0.3,0-0.6,0.1-0.8c0.1-0.2,0.1-0.5,0.3-0.9L27.5,6c0.2-0.6,0.6-1,1.1-1.3c0.3-0.1,0.6-0.2,1-0.2c0.2,0,0.5,0,0.7,0.1c1.2,0.4,1.8,1.7,1.4,2.8L29.1,15c-0.1,0.4-0.2,0.6-0.3,0.8c-0.1,0.2-0.2,0.5-0.4,0.7c-0.1,0.2-0.3,0.3-0.7,0.7l-1.9,1.9L25.5,19.1L25.5,19.1z"/>
              <path fill="#3B82F6" d="M29.6,4.9c0.2,0,0.4,0,0.6,0.1c0.9,0.3,1.4,1.3,1.1,2.3l-2.6,7.5l0,0.1c-0.1,0.4-0.2,0.6-0.3,0.7c-0.1,0.2-0.2,0.4-0.4,0.6c-0.1,0.2-0.3,0.3-0.6,0.6l-1.8,1.8c0,0,0,0,0,0c0,0,0,0,0,0c0,0-0.1,0-0.1-0.1l-0.3-2.5c-0.1-0.5-0.1-0.7-0.1-0.9c0-0.2,0-0.5,0.1-0.7c0-0.2,0.1-0.4,0.3-0.9L28,6.1c0.2-0.4,0.5-0.8,0.9-1C29.1,5,29.4,4.9,29.6,4.9 M29.6,4c-0.4,0-0.8,0.1-1.2,0.3c-0.6,0.3-1.1,0.8-1.4,1.5l-2.6,7.5c-0.2,0.5-0.2,0.7-0.3,0.9c-0.1,0.3-0.1,0.6-0.1,0.9c0,0.3,0,0.5,0.1,1l0.3,2.5c0,0.4,0.3,0.7,0.7,0.8l0.1,0l0.2,0c0.3,0,0.5-0.1,0.7-0.3l1.8-1.8c0.3-0.3,0.5-0.5,0.7-0.7c0.2-0.3,0.4-0.5,0.5-0.8c0.1-0.2,0.2-0.4,0.3-0.8l0-0.1l2.6-7.5c0.5-1.4-0.3-2.9-1.7-3.4C30.2,4.1,29.9,4,29.6,4L29.6,4z"/>
              <path fill="#3B82F6" d="M29.1,8.2c-0.8-0.3-1.3-0.8-1.5-1.1l-0.4,1.2c0.4,0.3,0.9,0.7,1.6,0.9c0.7,0.2,1.3,0.3,1.8,0.2L31,8.3C30.6,8.4,30,8.5,29.1,8.2z"/>
              <path fill="#3B82F6" d="M25.5,18.6C25.5,18.6,25.5,18.6,25.5,18.6c0.1,0.1,0.1,0.1,0.1,0l0.6-0.6l-0.8-0.3L25.5,18.6z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -1, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>
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
