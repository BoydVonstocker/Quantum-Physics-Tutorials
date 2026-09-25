import { c, cabs2, cadd, cmul, cscale, csub, solveLinear, type C } from "./complex.ts";

/**
 * Rectangular barrier on [0, L], height V0, wave incident from the left
 * with amplitude 1. ℏ = m = 1.
 * ψ(x > L) = t e^{ikx}, so the transmission probability is T = |t|².
 */

export type BarrierSolution = {
  r: C;
  t: C;
  R: number;
  T: number;
  k: number;
  kappa: number;
  above: boolean;
};

export function analyticTransmission(E: number, V0: number, L: number): number {
  if (E <= 0 || L <= 0) return NaN;
  if (Math.abs(E - V0) < 1e-8) {
    // lim_{E→V0} V0² sin²(qL) / (4E(E−V0)) = V0² L² / (2E)
    return 1 / (1 + (V0 * V0 * L * L) / (2 * E));
  }
  if (E < V0) {
    const kappa = Math.sqrt(2 * (V0 - E));
    const s = Math.sinh(Math.min(kappa * L, 40));
    return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (V0 - E)));
  }
  const q = Math.sqrt(2 * (E - V0));
  const s = Math.sin(q * L);
  return 1 / (1 + (V0 * V0 * s * s) / (4 * E * (E - V0)));
}

export function solveBarrier(E: number, V0: number, L: number): BarrierSolution {
  const k = Math.sqrt(2 * Math.max(E, 1e-12));
  const above = E >= V0;
  const kappa = Math.sqrt(2 * Math.abs(E - V0));

  let r: C;
  let tAmp: C;

  if (!above) {
    const decay = Math.exp(-Math.min(kappa * L, 60));
    const eikL = c(Math.cos(k * L), Math.sin(k * L));
    // ψ_II = C exp(−κ(L−x)) + D exp(−κx), so both basis functions stay ≤ 1.
    const A = [
      [c(1), c(-decay), c(-1), c(0)],
      [c(0, -k), c(-kappa * decay), c(kappa), c(0)],
      [c(0), c(1), c(decay), cmul(eikL, c(-1))],
      [c(0), c(kappa), c(-kappa * decay), cmul(eikL, c(0, -k))],
    ];
    const b = [c(-1), c(0, -k), c(0), c(0)];
    const x = solveLinear(A, b);
    r = x[0]!;
    tAmp = x[3]!;
  } else {
    const q = Math.max(kappa, 1e-8);
    const eikL = c(Math.cos(k * L), Math.sin(k * L));
    const eiqL = c(Math.cos(q * L), Math.sin(q * L));
    const emqL = c(Math.cos(q * L), -Math.sin(q * L));
    const A = [
      [c(1), c(-1), c(-1), c(0)],
      [c(0, -k), c(0, -q), c(0, q), c(0)],
      [c(0), eiqL, emqL, cmul(eikL, c(-1))],
      [c(0), cmul(c(0, q), eiqL), cmul(c(0, -q), emqL), cmul(eikL, c(0, -k))],
    ];
    const b = [c(-1), c(0, -k), c(0), c(0)];
    const x = solveLinear(A, b);
    r = x[0]!;
    tAmp = x[3]!;
  }

  return { r, t: tAmp, R: cabs2(r), T: cabs2(tAmp), k, kappa, above };
}

function fieldAt(x: number, sol: BarrierSolution, V0: number, L: number, E: number): C {
  const k = sol.k;
  if (x <= 0) {
    return cadd(
      c(Math.cos(k * x), Math.sin(k * x)),
      cmul(sol.r, c(Math.cos(k * x), -Math.sin(k * x))),
    );
  }
  if (x >= L) return cmul(sol.t, c(Math.cos(k * x), Math.sin(k * x)));

  if (!sol.above) {
    const kappa = Math.max(sol.kappa, 1e-8);
    const decay = Math.exp(-Math.min(kappa * L, 60));
    const onePlusR = cadd(c(1), sol.r);
    const leftSlope = cmul(c(0, k), csub(c(1), sol.r));
    // leftSlope = κ e^{−κL} C − κ D, onePlusR = e^{−κL} C + D
    const Ccoef = cscale(cadd(cscale(leftSlope, 1 / kappa), onePlusR), 0.5 / Math.max(decay, 1e-14));
    const Dcoef = csub(onePlusR, cscale(Ccoef, decay));
    return cadd(
      cscale(Ccoef, Math.exp(-kappa * (L - x))),
      cscale(Dcoef, Math.exp(-kappa * x)),
    );
  }

  const q = Math.max(Math.sqrt(2 * Math.max(E - V0, 0)), 1e-8);
  const onePlusR = cadd(c(1), sol.r);
  const leftSlope = cmul(c(0, k), csub(c(1), sol.r));
  const diff = cmul(leftSlope, c(0, -1 / q));
  const Ccoef = cscale(cadd(onePlusR, diff), 0.5);
  const Dcoef = csub(onePlusR, Ccoef);
  return cadd(
    cmul(Ccoef, c(Math.cos(q * x), Math.sin(q * x))),
    cmul(Dcoef, c(Math.cos(q * x), -Math.sin(q * x))),
  );
}

export function sampleBarrier(E: number, V0: number, L: number, t: number, count = 560) {
  const sol = solveBarrier(E, V0, L);
  const pad = Math.max(2.2, 0.85 * L + 1.2);
  const xMin = -pad;
  const xMax = L + pad;
  const dx = (xMax - xMin) / (count - 1);
  const xs = new Float64Array(count);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const vs = new Float64Array(count);
  const cp = Math.cos(-E * t);
  const sp = Math.sin(-E * t);

  for (let i = 0; i < count; i++) {
    const x = xMin + dx * i;
    const w = fieldAt(x, sol, V0, L, E);
    xs[i] = x;
    re[i] = w.re * cp - w.im * sp;
    im[i] = w.re * sp + w.im * cp;
    abs2[i] = w.re * w.re + w.im * w.im;
    vs[i] = x >= 0 && x <= L ? V0 : 0;
  }

  return { xs, re, im, abs2, vs, xMin, xMax, ...sol };
}
