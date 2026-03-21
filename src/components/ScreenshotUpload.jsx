import { useState, useRef } from "react";

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
    <div style={{ background: t.card2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5 }}>
          Chart Screenshots
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
          <div style={{ fontSize: 20, marginBottom: 4, color: t.accent }}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
             <path d="M2 13.3636C2 10.2994 2 8.76721 2.74902 7.6666C3.07328 7.19014 3.48995 6.78104 3.97524 6.46268C4.69555 5.99013 5.59733 5.82123 6.978 5.76086C7.63685 5.76086 8.20412 5.27068 8.33333 4.63636C8.52715 3.68489 9.37805 3 10.3663 3H13.6337C14.6219 3 15.4728 3.68489 15.6667 4.63636C15.7959 5.27068 16.3631 5.76086 17.022 5.76086C18.4027 5.82123 19.3044 5.99013 20.0248 6.46268C20.51 6.78104 20.9267 7.19014 21.251 7.6666C22 8.76721 22 10.2994 22 13.3636C22 16.4279 22 17.9601 21.251 19.0607C20.9267 19.5371 20.51 19.9462 20.0248 20.2646C18.9038 21 17.3433 21 14.2222 21H9.77778C6.65675 21 5.09624 21 3.97524 20.2646C3.48995 19.9462 3.07328 19.5371 2.74902 19.0607C2.53746 18.7498 2.38566 18.4045 2.27673 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  <path d="M19 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg></div>
          <div style={{ fontSize: 13, color: t.accent, fontFamily: "'Space Mono', monospace" }}>
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
          ><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
<path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
<path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
</svg></button>
        </div>
      )}
    </div>
  );
}
