export function fmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const x = Math.abs(value);
  if (x !== 0 && (x < 1e-3 || x >= 1e4)) return sign + x.toExponential(3);
  let s = x.toFixed(digits);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return sign + (s.length > 0 ? s : "0");
}
