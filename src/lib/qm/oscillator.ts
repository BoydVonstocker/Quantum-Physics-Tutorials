import { factorial, trap } from "./integrate.ts";

/** Harmonic oscillator V = ½ ω² x², ℏ = m = 1. E_n = ω(n+½). */

export function oscillatorEnergy(n: number, omega: number): number {
  return omega * (n + 0.5);
}

/** Physicists' Hermite polynomial H_n(ξ). */
export function hermite(n: number, xi: number): number {
  if (n <= 0) return 1;
  if (n === 1) return 2 * xi;
  let h0 = 1;
  let h1 = 2 * xi;
  for (let k = 1; k < n; k++) {
    const h2 = 2 * xi * h1 - 2 * k * h0;
    h0 = h1;
    h1 = h2;
  }
  return h1;
}

export function oscillatorPsi(n: number, x: number, omega: number): number {
  const alpha = Math.sqrt(omega);
  const xi = alpha * x;
  // (mω / πℏ)^{1/4} = (α² / π)^{1/4}, α = √ω.
  const norm = (alpha * alpha / Math.PI) ** 0.25 / Math.sqrt(2 ** n * factorial(n));
  return norm * Math.exp(-0.5 * xi * xi) * hermite(n, xi);
}

export function turningPoints(n: number, omega: number): number {
  const E = oscillatorEnergy(n, omega);
  return Math.sqrt((2 * E) / (omega * omega));
}

/** Classical probability density, singular at the turning points. */
export function classicalDensity(x: number, n: number, omega: number): number {
  const A = turningPoints(n, omega);
  if (Math.abs(x) >= A) return 0;
  return 1 / (Math.PI * Math.sqrt(A * A - x * x));
}

export type OscComponent = { n: number; amplitude: number };

export function sampleOscillator(
  parts: OscComponent[],
  omega: number,
  t: number,
  count = 520,
) {
  const live = parts.filter((p) => p.n >= 0 && p.amplitude > 0);
  const sum = live.reduce((s, p) => s + p.amplitude * p.amplitude, 0);
  const coeffs =
    sum > 0
      ? live.map((p) => ({ n: p.n, amplitude: p.amplitude / Math.sqrt(sum) }))
      : [{ n: 0, amplitude: 1 }];
  const energies = coeffs.map((p) => oscillatorEnergy(p.n, omega));
  const meanE = coeffs.reduce(
    (s, p, i) => s + p.amplitude * p.amplitude * (energies[i] ?? 0),
    0,
  );
  const nMax = Math.max(...coeffs.map((p) => p.n));
  const reach =
    turningPoints(nMax, omega) + 4 / Math.sqrt(omega);
  const xMin = -reach;
  const xMax = reach;
  const dx = (xMax - xMin) / (count - 1);
  const xs = new Float64Array(count);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const vs = new Float64Array(count);
  const classical = new Float64Array(count);

  const primary = coeffs.reduce((a, b) => (a.amplitude >= b.amplitude ? a : b));

  for (let i = 0; i < count; i++) {
    const x = xMin + dx * i;
    let wr = 0;
    let wi = 0;
    for (let k = 0; k < coeffs.length; k++) {
      const part = coeffs[k]!;
      const phase = -(energies[k] ?? 0) * t;
      const u = part.amplitude * oscillatorPsi(part.n, x, omega);
      wr += u * Math.cos(phase);
      wi += u * Math.sin(phase);
    }
    xs[i] = x;
    re[i] = wr;
    im[i] = wi;
    abs2[i] = wr * wr + wi * wi;
    vs[i] = 0.5 * omega * omega * x * x;
    classical[i] = classicalDensity(x, primary.n, omega);
  }

  return {
    xs,
    re,
    im,
    abs2,
    vs,
    classical,
    xMin,
    xMax,
    meanE,
    norm: trap(abs2, dx),
    primaryN: primary.n,
    turning: turningPoints(primary.n, omega),
  };
}
