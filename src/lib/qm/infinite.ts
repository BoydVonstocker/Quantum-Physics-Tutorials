import { trap } from "./integrate.ts";

/** Infinite square well on [0, L], ℏ = m = 1. */

export function wellEnergy(n: number, L: number): number {
  return (n * n * Math.PI * Math.PI) / (2 * L * L);
}

export function wellPsi(n: number, x: number, L: number): number {
  if (x <= 0 || x >= L) return 0;
  return Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L);
}

export type WellComponent = { n: number; amplitude: number };

export function normalizeAmplitudes(parts: WellComponent[]): WellComponent[] {
  const sum = parts.reduce((s, p) => s + p.amplitude * p.amplitude, 0);
  if (sum <= 0) return parts.map((p) => ({ ...p, amplitude: 0 }));
  const inv = 1 / Math.sqrt(sum);
  return parts.map((p) => ({ ...p, amplitude: p.amplitude * inv }));
}

export function sampleWell(
  parts: WellComponent[],
  L: number,
  t: number,
  count = 480,
) {
  const coeffs = normalizeAmplitudes(parts.filter((p) => p.n >= 1 && p.amplitude > 0));
  const xs = new Float64Array(count);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const dx = L / (count - 1);
  let xExp = 0;
  let x2 = 0;
  let norm = 0;
  const energies = coeffs.map((p) => wellEnergy(p.n, L));
  const meanE = coeffs.reduce((s, p, i) => s + p.amplitude * p.amplitude * (energies[i] ?? 0), 0);

  for (let i = 0; i < count; i++) {
    const x = dx * i;
    let wr = 0;
    let wi = 0;
    for (let k = 0; k < coeffs.length; k++) {
      const part = coeffs[k]!;
      const E = energies[k] ?? 0;
      const phase = -E * t;
      const u = part.amplitude * wellPsi(part.n, x, L);
      wr += u * Math.cos(phase);
      wi += u * Math.sin(phase);
    }
    xs[i] = x;
    re[i] = wr;
    im[i] = wi;
    const p = wr * wr + wi * wi;
    abs2[i] = p;
  }

  for (let i = 0; i < count - 1; i++) {
    const x = 0.5 * ((xs[i] ?? 0) + (xs[i + 1] ?? 0));
    const p = 0.5 * ((abs2[i] ?? 0) + (abs2[i + 1] ?? 0));
    const w = p * dx;
    norm += w;
    xExp += x * w;
    x2 += x * x * w;
  }
  if (norm > 0) {
    xExp /= norm;
    x2 /= norm;
  }

  return {
    xs,
    re,
    im,
    abs2,
    xMin: 0,
    xMax: L,
    meanE,
    xExp,
    deltaX: Math.sqrt(Math.max(0, x2 - xExp * xExp)),
    norm: trap(abs2, dx),
    coeffs,
    energies,
  };
}
