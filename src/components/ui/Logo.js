/** Pockeazy logo mark — a pocket with a tick inside: your day and your money, sorted */
export default function Logo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 3.5h16v9.2c0 4.3-3.6 7.8-8 7.8s-8-3.5-8-7.8V3.5z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 7.3h16" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.6 1.4" strokeLinecap="round" />
      <path d="M8.4 12.6l2.5 2.5 4.9-5.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
