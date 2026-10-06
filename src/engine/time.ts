/** 毫秒 -> "mm:ss.mmm" */
export function fmtMs(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const a = Math.abs(Math.round(ms));
  const m = Math.floor(a / 60000);
  const s = Math.floor((a % 60000) / 1000);
  const milli = a % 1000;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

/** "mm:ss.mmm" / "ss.mmm" / "ss" -> 毫秒，非法返回 null */
export function parseMs(text: string): number | null {
  const t = text.trim();
  const m = /^(?:(\d{1,3}):)?(\d{1,3}(?:\.\d{1,3})?)$/.exec(t);
  if (!m) return null;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const seconds = parseFloat(m[2]);
  if (Number.isNaN(seconds) || (m[1] != null && seconds >= 60)) return null;
  return Math.round(minutes * 60000 + seconds * 1000);
}
