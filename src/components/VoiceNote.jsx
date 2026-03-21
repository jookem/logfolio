import { useState, useRef, useEffect } from "react";

const MAX_SECONDS = 120; // 2 minutes

// Prefer Opus (best compression); fall back to browser default
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
];
const AUDIO_MIME = PREFERRED_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || "";

export default function VoiceNote({ value, onChange, t }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(value || null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setAudioUrl(value || null);
  }, [value]);

  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mrRef = useRef(null);

  const stopRecording = () => {
    mrRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
    setElapsed(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, AUDIO_MIME ? { mimeType: AUDIO_MIME } : {});
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
      setElapsed(0);

      let secs = 0;
      timerRef.current = setInterval(() => {
        secs += 1;
        setElapsed(secs);
        if (secs >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    onChange(null);
  };

  const remaining = MAX_SECONDS - elapsed;
  const isNearLimit = elapsed >= MAX_SECONDS - 15;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{
      background: t.card2, border: `1px solid ${t.border}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{
        fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10,
      }}>Voice Note</div>

      {!audioUrl ? (
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{
            width: "100%",
            background: recording ? t.danger + "20" : t.accent + "15",
            border: `1px solid ${recording ? t.danger : t.accent}40`,
            color: recording ? t.danger : t.accent,
            borderRadius: 8, padding: "10px 14px", cursor: "pointer",
            fontSize: 13, fontFamily: "'Space Mono', monospace",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {recording ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: t.danger, display: "inline-block",
                animation: "pulse 1s infinite",
              }} />
              Stop — {fmtTime(elapsed)}
              <span style={{
                marginLeft: "auto", fontSize: 11,
                color: isNearLimit ? t.danger : t.text3,
                opacity: 0.8,
              }}>
                -{fmtTime(remaining)}
              </span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11C17 13.7614 14.7614 16 12 16C9.23858 16 7 13.7614 7 11V8Z" stroke="currentColor" strokeWidth="2"/>
  <path d="M13 8L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M13 11L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M4 11C4 15.4183 7.58172 19 12 19C16.4183 19 20 15.4183 20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg> Record Voice Note
              <span style={{ marginLeft: "auto", fontSize: 11, color: t.text3, opacity: 0.7 }}>
                max {fmtTime(MAX_SECONDS)}
              </span>
            </>
          )}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36 }} />
          <button
            onClick={clearRecording}
            style={{
              background: "none", border: `1px solid ${t.danger}40`,
              color: t.danger, borderRadius: 7, padding: "6px 12px",
              cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace",
            }}
          >
            × Delete Recording
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );
}
