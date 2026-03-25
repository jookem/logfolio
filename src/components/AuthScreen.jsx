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
  const [showPassword, setShowPassword] = useState(false);

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

  const handleGoogle = async () => {
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
        width: "100%", maxWidth: 400, padding: 32,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <img src="/images/logfolio.svg" width={100} height={100} alt="Logfolio" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.accent, letterSpacing: 2, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>
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
              <div style={{ position: "relative" }}>
                <input style={{ ...inp, paddingRight: 40 }} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.text3, fontSize: 13, padding: 0 }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 11, color: T.text3, letterSpacing: 1 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <button
          onClick={handleGoogle}
          type="button"
          style={{
            width: "100%", padding: "11px 14px",
            background: T.input, border: `1px solid ${T.inputBorder}`,
            borderRadius: 8, color: T.text, fontSize: 12,
            fontWeight: 700, fontFamily: "'Space Mono', monospace",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.6 13.3A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

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
