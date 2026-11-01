const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Latin digits to Persian numerals for user-facing copy (constitution VII). */
export function fa(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Human duration in Persian, e.g. "۱ ساعت و ۵ دقیقه". */
export function faDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${fa(hours)} ساعت`);
  if (minutes > 0) parts.push(`${fa(minutes)} دقیقه`);
  if (seconds > 0 && hours === 0) parts.push(`${fa(seconds)} ثانیه`);
  return parts.length > 0 ? parts.join(" و ") : "۰ ثانیه";
}
