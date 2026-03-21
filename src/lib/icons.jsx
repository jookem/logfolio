// Centralized SVG icon library.
// All icons use currentColor for theme compatibility (light + dark).
// LogoIcon retains brand colors.

// ── App logo ──────────────────────────────────────────────────────────────────
export const LogoIcon = ({ width = 44, height = 44 }) => (
  <svg viewBox="0 0 35 35" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <rect x="3.8" y="14.7" fill="#FF1212" width="4.3" height="12" />
    <rect x="5.7" y="12.1" fill="#FF1212" width="0.4" height="17.1" />
    <rect x="11.3" y="18.2" fill="#12B248" width="4.3" height="7.3" />
    <rect x="13.2" y="16.6" fill="#12B248" width="0.4" height="10.5" />
    <rect x="20.6" y="7.9" fill="#12B248" width="0.5" height="14.7" />
    <rect x="18.7" y="9.4" fill="#12B248" width="4.3" height="10.7" />
    <polyline points="5.6,30.7 13.7,29.4 21.3,24.5 28.6,22.2" fill="none" stroke="#3B82F6" strokeLinecap="round" strokeMiterlimit="10" />
    <path fill="#87B3F4" d="M30.7,7.2c0-1.2-1-2.2-2.2-2.2c-1.2,0-2.2,1-2.2,2.2l0,0.7c0,0,0,0,0.1,0c0.5,0.2,1.2,0.5,2.1,0.5s1.6-0.2,2.1-0.5c0,0,0,0,0.1,0V7.2z" />
    <path fill="#3B82F6" d="M26.4,7.8L26.4,7.8C26.4,7.9,26.4,7.9,26.4,7.8c0.5,0.3,1.3,0.5,2.2,0.5c0.9,0,1.6-0.2,2.1-0.5c0,0,0,0,0.1,0l0,6.6c0,0.4,0,0.7,0,0.9c0,0.3-0.1,0.5-0.2,0.8c-0.1,0.2-0.2,0.4-0.4,0.8l-1.1,2.1c-0.1,0.2-0.3,0.3-0.5,0.3c-0.2,0-0.4-0.1-0.5-0.3L27,17c-0.2-0.4-0.3-0.6-0.4-0.8c-0.1-0.2-0.1-0.5-0.2-0.8c0-0.2,0-0.4,0-0.9L26.4,7.8z" />
  </svg>
);

// ── Action icons ──────────────────────────────────────────────────────────────

// Log a trade / Execute plan (document with + and folded corner)
export const LogIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" />
    <path d="M7 4V7M7 10V7M7 7H4M7 7H10" />
  </svg>
);

// Plan a trade (checklist document)
export const PlanIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M6 15.8L7.14286 17L10 14" />
    <path d="M6 8.8L7.14286 10L10 7" />
    <path d="M13 9L18 9" />
    <path d="M13 16L18 16" />
    <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" />
  </svg>
);

// Edit / pen (pen tip + document outline) — from pen.svg
export const EditIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 800 800" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="50" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="133.3333" style={{ display: "block" }}>
    <path d="M709.3,213.3l-318,318c-31.7,31.7-125.7,46.3-146.7,25.3c-21-21-6.7-115,25-146.7L588,91.7c7.9-8.6,17.4-15.4,27.9-20.2c10.6-4.8,22-7.4,33.6-7.6c11.6-0.2,23.2,1.9,33.9,6.2c10.8,4.3,20.6,10.8,28.8,19c8.2,8.2,14.7,18,19,28.8c4.3,10.8,6.4,22.3,6.1,34c-0.3,11.6-2.9,23.1-7.7,33.6C724.8,196,717.9,205.5,709.3,213.3L709.3,213.3z" />
    <path d="M366.7,133.3H200c-35.4,0-69.3,14-94.3,39.1c-25,25-39.1,58.9-39.1,94.3V600c0,35.4,14,69.3,39.1,94.3c25,25,58.9,39.1,94.3,39.1h366.7c73.7,0,100-60,100-133.3V433.3" />
  </svg>
);

// Delete (document with X cross) — from delete.svg
export const DeleteIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M20 14V7C20 5.34315 18.6569 4 17 4H12M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20M13.5 20H7C5.34315 20 4 18.6569 4 17V12" />
    <path d="M4 4L6.5 6.5M9 9L6.5 6.5M6.5 6.5L9 4M6.5 6.5L4 9" />
  </svg>
);

// Share (arrow out of box) — from share.svg
export const ShareIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M19.6495 0.799565C18.4834 -0.72981 16.0093 0.081426 16.0093 1.99313V3.91272C12.2371 3.86807 9.65665 5.16473 7.9378 6.97554C6.10034 8.9113 5.34458 11.3314 5.02788 12.9862C4.86954 13.8135 5.41223 14.4138 5.98257 14.6211C6.52743 14.8191 7.25549 14.7343 7.74136 14.1789C9.12036 12.6027 11.7995 10.4028 16.0093 10.5464V13.0069C16.0093 14.9186 18.4834 15.7298 19.6495 14.2004L23.3933 9.29034C24.2022 8.2294 24.2022 6.7706 23.3933 5.70966L19.6495 0.799565ZM7.48201 11.6095C9.28721 10.0341 11.8785 8.55568 16.0093 8.55568H17.0207C17.5792 8.55568 18.0319 9.00103 18.0319 9.55037L18.0317 13.0069L21.7754 8.09678C22.0451 7.74313 22.0451 7.25687 21.7754 6.90322L18.0317 1.99313V4.90738C18.0317 5.4567 17.579 5.90201 17.0205 5.90201H16.0093C11.4593 5.90201 9.41596 8.33314 9.41596 8.33314C8.47524 9.32418 7.86984 10.502 7.48201 11.6095Z" />
    <path d="M7 1.00391H4C2.34315 1.00391 1 2.34705 1 4.00391V20.0039C1 21.6608 2.34315 23.0039 4 23.0039H20C21.6569 23.0039 23 21.6608 23 20.0039V17.0039C23 16.4516 22.5523 16.0039 22 16.0039C21.4477 16.0039 21 16.4516 21 17.0039V20.0039C21 20.5562 20.5523 21.0039 20 21.0039H4C3.44772 21.0039 3 20.5562 3 20.0039V4.00391C3 3.45162 3.44772 3.00391 4 3.00391H7C7.55228 3.00391 8 2.55619 8 2.00391C8 1.45162 7.55228 1.00391 7 1.00391Z" />
  </svg>
);

// Quick edit (pen + document + horizontal lines) — from quick.svg
export const QuickIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 800 800" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="50" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="133.3333" style={{ display: "block" }}>
    <path d="M709.3,213.3l-318,318c-31.7,31.7-125.7,46.3-146.7,25.3c-21-21-6.7-115,25-146.7L588,91.7c7.9-8.6,17.4-15.4,27.9-20.2c10.6-4.8,22-7.4,33.6-7.6c11.6-0.2,23.2,1.9,33.9,6.2c10.8,4.3,20.6,10.8,28.8,19c8.2,8.2,14.7,18,19,28.8c4.3,10.8,6.4,22.3,6.1,34c-0.3,11.6-2.9,23.1-7.7,33.6C724.8,196,717.9,205.5,709.3,213.3L709.3,213.3z" />
    <path d="M366.7,133.3H200c-35.4,0-69.3,14-94.3,39.1c-25,25-39.1,58.9-39.1,94.3V600c0,35.4,14,69.3,39.1,94.3c25,25,58.9,39.1,94.3,39.1h366.7c73.7,0,100-60,100-133.3V433.3" />
    <line x1="272.7" y1="214.8" x2="353.8" y2="214.8" />
    <line x1="209.4" y1="300" x2="290.5" y2="300" />
    <line x1="144" y1="385.3" x2="225" y2="385.3" />
  </svg>
);

// Close (X in rounded square)
export const CloseIcon = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "block" }}>
    <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" />
    <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" />
  </svg>
);

// ── Tutorial / Analytics icons ────────────────────────────────────────────────

export const TodayIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.26,21H6.2c-1.12,0-1.68,0-2.11,-0.22c-0.38,-0.19-0.68,-0.5-0.87,-0.87c-0.22,-0.43-0.22,-0.99-0.22,-2.11V8.2c0,-1.12,0,-1.68,0.22,-2.11c0.19,-0.38,0.5,-0.68,0.87,-0.87c0.43,-0.22,0.99,-0.22,2.11,-0.22h11.6c1.12,0,1.68,0,2.11,0.22c0.38,0.19,0.68,0.5,0.87,0.87c0.22,0.43,0.22,0.99,0.22,2.11v7.86 M7,3v2 M17,3v2 M3,9h18" />
    <rect x="6.22" y="11.9" width="4" height="4" />
  </svg>
);

export const WeekIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.26,21H6.2c-1.12,0-1.68,0-2.11,-0.22c-0.38,-0.19-0.68,-0.5-0.87,-0.87c-0.22,-0.43-0.22,-0.99-0.22,-2.11V8.2c0,-1.12,0,-1.68,0.22,-2.11c0.19,-0.38,0.5,-0.68,0.87,-0.87c0.43,-0.22,0.99,-0.22,2.11,-0.22h11.6c1.12,0,1.68,0,2.11,0.22c0.38,0.19,0.68,0.5,0.87,0.87c0.22,0.43,0.22,0.99,0.22,2.11v7.86 M7,3v2 M17,3v2 M3,9h18" />
    <rect x="6.22" y="11.9" width="11.4" height="4" />
  </svg>
);

export const CalendarIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 21H6.2C5.0799 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V8.2C3 7.0799 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H17.8C18.9201 5 19.4802 5 19.908 5.21799C20.2843 5.40973 20.5903 5.71569 20.782 6.09202C21 6.51984 21 7.0799 21 8.2V10M7 3V5M17 3V5M3 9H21M13.5 13L7 13M10 17L7 17M14 21L16.025 20.595C16.2015 20.5597 16.2898 20.542 16.3721 20.5097C16.4452 20.4811 16.5147 20.4439 16.579 20.399C16.6516 20.3484 16.7152 20.2848 16.8426 20.1574L21 16C21.5523 15.4477 21.5523 14.5523 21 14C20.4477 13.4477 19.5523 13.4477 19 14L14.8426 18.1574C14.7152 18.2848 14.6516 18.3484 14.601 18.421C14.5561 18.4853 14.5189 18.5548 14.4903 18.6279C14.458 18.7102 14.4403 18.7985 14.405 18.975L14 21Z" />
  </svg>
);

export const AnalysisIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2.5H2V8.5H22V2.5Z" />
    <path d="M2 20.52L8.09 14.37L11.38 17.52L15.4 13.5L17.64 15.69" />
    <path d="M22 8.5V21" />
    <path d="M2 8.5V15" />
    <path d="M6.5 21.5H22" />
  </svg>
);

export const RobotIcon = ({ size = 36 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21,13.38c0,1.74-0.1,2.11-0.29,3.84l-0.02,0.15c-0.25,2.22-1.99,3.98-4.22,4.26l-0.91,0.11c-0.5,0.06-0.74,0.09-0.99,0.12c-1.72,0.18-3.45,0.18-5.17,0c-0.25,-0.03-0.5,-0.06-0.99,-0.12l-1.01,-0.13c-2.16,-0.27-3.86,-1.98-4.1,-4.14c-0.24,-3.43-0.14,-4.37,0,-7.99l0.02,-0.14c0.24,-2.11,1.83,-3.81,3.92,-4.2l0.22,-0.04c3,-0.56,6.09,-0.56,9.09,0l0.32,0.06c2.03,0.38,3.57,2.03,3.81,4.07c0.06,0.48,0.11,0.97,0.15,1.45" />
    <path d="M15.74,16.46c-0.61,0.72-1.4,1.5-3.89,1.5s-3.25,-0.83-3.89,-1.5" />
    <circle cx="9.06" cy="11.31" r="2.06" />
    <circle cx="15.29" cy="11.31" r="2.06" />
    <line x1="11.75" y1="4.43" x2="11.75" y2="1.82" />
    <circle cx="11.75" cy="2.16" r="1.55" fill="currentColor" stroke="none" />
  </svg>
);

export const ArrowsIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v16M7 8l5-5 5 5M7 16l5 5 5-5" />
  </svg>
);

export const DollarIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6.5" />
  </svg>
);

export const ShieldIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.2 9 11.4C18.25 22.2 21 17.25 21 12V7l-9-5z" />
  </svg>
);

export const MindIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 017 7c0 2.8-1.6 5.1-4 6.3V17H9v-1.7C6.6 14.1 5 11.8 5 9a7 7 0 017-7z" />
  </svg>
);

export const PenIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.28 6.4L11.74 15.94C10.79 16.89 7.97 17.33 7.34 16.7C6.71 16.07 7.14 13.25 8.09 12.3L17.64 2.75C18.55 1.84 20.37 1.84 21.28 2.75C22.19 3.66 22.19 5.49 21.28 6.4Z" />
    <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157C2.42149 5.92172 2 6.93913 2 8V18C2 19.0609 2.42149 20.0783 3.17163 20.8284C3.92178 21.5786 4.93913 22 6 22H17C19.21 22 20 20.2 20 18V13" />
  </svg>
);

export const TargetIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const CheckIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" />
    <path d="M22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" />
  </svg>
);
