// Classic teardrop map-pin marker rendered as inline SVG so it stays crisp at
// every size. A soft drop shadow makes it read as piercing the map. The tip
// (bottom point) is the anchor — callers position the wrapper so the tip sits
// on the target. No label text inside; the map labels the pitch itself.
export default function MapPin({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.35))" }}
    >
      <path
        d="M12 0.5C5.7 0.5 0.5 5.7 0.5 12c0 8.6 11.5 19.5 11.5 19.5S23.5 20.6 23.5 12C23.5 5.7 18.3 0.5 12 0.5z"
        fill="var(--accent)"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="4.2" fill="#ffffff" />
    </svg>
  );
}