/** Tickrupee logo mark — a core with a circling ring and satellite */
export default function Logo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4.6" stroke="currentColor" strokeWidth="1.8" transform="rotate(-28 12 12)" />
      <circle cx="20.2" cy="7.4" r="1.9" fill="currentColor" />
    </svg>
  );
}
