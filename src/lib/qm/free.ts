import { c, cabs2, cadd, cdiv, cexp, cscale, csqrt, type C } from "./complex.ts";

/**
 * Minimum-uncertainty Gaussian packet, ℏ = m = 1.
 *
 * ψ(x,0) = (2πσ²)^(−1/4) exp(−(x−x₀)²/(4σ²) + i k₀ (x−x₀))
 *
 * σ is the standard deviation of |ψ|². The packet center moves at the group
 * velocity v_g = k₀; it spreads as σ(t) = σ √(1 + (t / (2σ²))²).
 */
export function gaussianPacket(
  x: number,
  t: number,
  x0: number,
  k0: number,
  sigma: number,
): C {
  const s2 = sigma * sigma;
  const tau = t / (2 * s2);
  const norm = (2 * Math.PI * s2) ** -0.25;
  const invSqrt = cdiv(c(1), csqrt(c(1, tau)));
  const beta = x - x0 - k0 * t;
  const quad = cscale(cdiv(c(1), c(1, tau)), -(beta * beta) / (4 * s2));
  const phase = c(0, k0 * (x - x0) - 0.5 * k0 * k0 * t);
  return cscale(cmulSafe(invSqrt, cexp(cadd(quad, phase))), norm);
}

function cmulSafe(a: C, b: C): C {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function packetSigma(t: number, sigma: number): number {
  const tau = t / (2 * sigma * sigma);
  return sigma * Math.sqrt(1 + tau * tau);
}

export function packetCenter(t: number, x0: number, k0: number): number {
  return x0 + k0 * t;
}

/** |ψ|² of the packet, closed form. */
export function packetDensity(
  x: number,
  t: number,
  x0: number,
  k0: number,
  sigma: number,
): number {
  const st = packetSigma(t, sigma);
  const beta = x - packetCenter(t, x0, k0);
  return Math.exp(-(beta * beta) / (2 * st * st)) / (st * Math.sqrt(2 * Math.PI));
}

export function planeWave(x: number, t: number, k: number): C {
  const phase = k * x - 0.5 * k * k * t;
  return c(Math.cos(phase), Math.sin(phase));
}

export function freeObservables(k0: number, sigma: number) {
  const dk = 1 / (2 * sigma);
  return {
    energy: 0.5 * k0 * k0,
    groupVelocity: k0,
    phaseVelocity: 0.5 * k0,
    deltaX: sigma,
    deltaK: dk,
    uncertainty: sigma * dk,
  };
}

export function samplePacket(
  t: number,
  x0: number,
  k0: number,
  sigma: number,
  count = 480,
) {
  const center = packetCenter(t, x0, k0);
  const st = packetSigma(t, sigma);
  const pad = Math.max(8, 7 * st);
  const xMin = center - pad;
  const xMax = center + pad;
  const xs = new Float64Array(count);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const dx = (xMax - xMin) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = xMin + dx * i;
    const psi = gaussianPacket(x, t, x0, k0, sigma);
    xs[i] = x;
    re[i] = psi.re;
    im[i] = psi.im;
    abs2[i] = cabs2(psi);
  }
  return { xs, re, im, abs2, xMin, xMax, center, sigmaT: st };
}

export function samplePlane(t: number, k: number, count = 480) {
  const wavelength = (2 * Math.PI) / Math.max(Math.abs(k), 0.15);
  const xMin = -2 * wavelength;
  const xMax = 2 * wavelength;
  const xs = new Float64Array(count);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const dx = (xMax - xMin) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = xMin + dx * i;
    const psi = planeWave(x, t, k);
    xs[i] = x;
    re[i] = psi.re;
    im[i] = psi.im;
    abs2[i] = 1;
  }
  return { xs, re, im, abs2, xMin, xMax, wavelength };
}
