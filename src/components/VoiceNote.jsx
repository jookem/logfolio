import { useState, useRef, useEffect } from "react";
import { RecIcon } from "../lib/icons";

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
  const [micError, setMicError] = useState(false);

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
      setMicError(true);
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
    <div>
      <div style={{
        fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace",
        textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}><RecIcon size={13} />Voice Note</div>

      {micError && (
        <div style={{ fontSize: 12, color: t.danger, marginBottom: 8 }}>Microphone access denied. Check your browser permissions.</div>
      )}
      {!audioUrl ? (
        <button
          onClick={recording ? stopRecording : () => { setMicError(false); startRecording(); }}
          style={{
            width: "100%",
            background: recording ? t.danger + "20" : t.accent + "08",
            border: `1px dashed ${recording ? t.danger : t.accent}40`,
            color: recording ? t.danger : t.accent,
            borderRadius: 8, padding: "14px", cursor: "pointer",
            fontSize: 13, fontFamily: "'Space Mono', monospace",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {recording ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: t.danger, display: "inline-block",
                  animation: "pulse 1s infinite",
                }} />
                Stop — {fmtTime(elapsed)}
              </div>
              <div style={{ fontSize: 11, color: isNearLimit ? t.danger : t.text3, opacity: 0.8 }}>
                -{fmtTime(remaining)} remaining
              </div>
            </>
          ) : (
            <>
              <div>Record Voice Note</div>
              <div style={{ fontSize: 11, color: t.text3, opacity: 0.7 }}>
                max {fmtTime(MAX_SECONDS)}
              </div>
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
