/** Reduced-motion gate (constitution VII: animation must honor user preference). */
export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
