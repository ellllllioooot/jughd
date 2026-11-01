/** Jughd (owl) mascot — custom SVG identity (constitution VII: not stock art). */
export function Owl({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="جغد"
      className={className}
    >
      {/* body */}
      <ellipse cx="32" cy="36" rx="22" ry="24" fill="var(--color-surface-2)" />
      {/* face disc */}
      <ellipse cx="32" cy="28" rx="17" ry="15" fill="var(--color-surface)" />
      {/* eyes */}
      <circle cx="24" cy="26" r="7" fill="var(--color-accent)" />
      <circle cx="40" cy="26" r="7" fill="var(--color-accent)" />
      <circle cx="24" cy="26" r="3" fill="var(--color-accent-ink)" />
      <circle cx="40" cy="26" r="3" fill="var(--color-accent-ink)" />
      {/* beak */}
      <path d="M32 30 L28.5 36 L35.5 36 Z" fill="var(--color-accent-strong)" />
      {/* ear tufts */}
      <path d="M16 14 L22 20 L14 21 Z" fill="var(--color-surface-2)" />
      <path d="M48 14 L42 20 L50 21 Z" fill="var(--color-surface-2)" />
      {/* feet */}
      <path d="M26 58 L26 62 M24 62 L28 62" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 58 L38 62 M36 62 L40 62" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
