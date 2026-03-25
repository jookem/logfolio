import { useState, useRef } from "react";
import { ScreenshotIcon, CloseIcon } from "../lib/icons";

const MAX_IMAGES = 3;
const MAX_FILE_MB = 5;
const MAX_WIDTH = 1280;
const QUALITY = 0.8;

// Detect best supported format once at module load
const detectFormat = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1; canvas.height = 1;
  if (canvas.toDataURL("image/avif").startsWith("data:image/avif")) return "image/avif";
  if (canvas.toDataURL("image/webp").startsWith("data:image/webp")) return "image/webp";
  return "image/jpeg";
};
const ENCODE_FORMAT = detectFormat();

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      reject(new Error(`Image exceeds ${MAX_FILE_MB} MB limit`));
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(ENCODE_FORMAT, QUALITY));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function ScreenshotUpload({ value = [], onChange, t }) {
const fileInputRef = useRef(null);
const [lightbox, setLightbox] = useState(null);
const [error, setError] = useState(null);

const handleFiles = async (files) => {
  setError(null);
  const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
  const slotsLeft = MAX_IMAGES - value.length;
  if (slotsLeft <= 0) {
    setError(`Max ${MAX_IMAGES} screenshots per trade`);
    return;
  }
  const toProcess = imageFiles.slice(0, slotsLeft);
  if (imageFiles.length > slotsLeft) {
    setError(`Only ${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} remaining — first ${slotsLeft} added`);
  }

  const newImages = [];
  for (const file of toProcess) {
    try {
      const src = await compressImage(file);
      newImages.push({ id: Date.now() + Math.random(), src, name: file.name });
    } catch (e) {
      setError(e.message);
    }
  }
  if (newImages.length > 0) onChange([...value, ...newImages]);
};

  const removeImage = (id) => { setError(null); onChange(value.filter((img) => img.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
          <ScreenshotIcon size={13} />Chart Screenshots
        </div>
        <div style={{ fontSize: 11, color: value.length >= MAX_IMAGES ? t.danger : t.text3, fontFamily: "'Space Mono', monospace" }}>
          {value.length}/{MAX_IMAGES}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: t.danger, marginBottom: 8, padding: "4px 8px", background: t.danger + "15", borderRadius: 5 }}>
          {error}
        </div>
      )}

      {/* Upload button */}
      {value.length < MAX_IMAGES && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{
            border: `1px dashed ${t.accent}40`, borderRadius: 8,
            padding: "14px", textAlign: "center", cursor: "pointer",
            background: t.accent + "08", marginBottom: value.length > 0 ? 10 : 0,
          }}
        >
          <div style={{ fontSize: 13, color: t.accent, fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
            Click or drag & drop charts
          </div>
          <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>PNG, JPG, WebP · max {MAX_FILE_MB} MB · saved as {ENCODE_FORMAT.split("/")[1].toUpperCase()} {MAX_WIDTH}px</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Thumbnails */}
      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {value.map((img) => (
            <div key={img.id} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "16/9", background: t.border }}>
              <img
                src={img.src}
                alt={img.name}
                onClick={() => setLightbox(img.src)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                style={{
                  position: "absolute", top: 3, right: 3,
                  background: "rgba(0,0,0,0.7)", border: "none",
                  color: "#fff", borderRadius: "50%", width: 18, height: 18,
                  cursor: "pointer", fontSize: 11, display: "flex",
                  alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
            zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <img src={lightbox} alt="chart" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }} />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.1)", border: "none",
              color: "#fff", borderRadius: "50%", width: 36, height: 36,
              cursor: "pointer", fontSize: 18,
            }}
          ><CloseIcon size="1em" /></button>
        </div>
      )}
    </div>
  );
}
