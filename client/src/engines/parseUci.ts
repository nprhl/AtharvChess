export function parseCp(line: string): number | null {
  // Example: "info depth 10 score cp -120 ...", or "mate X"
  const m = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!m) return null;
  if (m[1] === 'mate') return (parseInt(m[2], 10) > 0 ? 30000 : -30000);
  return parseInt(m[2], 10);
}