import { factorial } from "./integrate.ts";

/** Hydrogen in Bohr units: a₀ = 1, m = 1, ℏ = 1. E_n = −1/(2n²) hartree. */

export const HARTREE_EV = 27.211386245;

export function energyHartree(n: number): number {
  return -0.5 / (n * n);
}

export function energyEV(n: number): number {
  return energyHartree(n) * HARTREE_EV;
}

/** ⟨r⟩_{nℓ} = ½ [3n² − ℓ(ℓ+1)] a₀. */
export function expectationR(n: number, l: number): number {
  return 0.5 * (3 * n * n - l * (l + 1));
}

/** Associated Laguerre L_n^{(α)}(x). */
export function assocLaguerre(n: number, alpha: number, x: number): number {
  if (n <= 0) return 1;
  if (n === 1) return 1 + alpha - x;
  let lm2 = 1;
  let lm1 = 1 + alpha - x;
  for (let k = 1; k < n; k++) {
    const lm = ((2 * k + 1 + alpha - x) * lm1 - (k + alpha) * lm2) / (k + 1);
    lm2 = lm1;
    lm1 = lm;
  }
  return lm1;
}

/** Radial wavefunction R_{nℓ}(r), ∫ r² R² dr = 1. */
export function radialR(n: number, l: number, r: number): number {
  if (r < 0 || l < 0 || l >= n) return 0;
  const rho = (2 * r) / n;
  const pref = Math.sqrt(
    (2 / n) ** 3 * (factorial(n - l - 1) / (2 * n * factorial(n + l))),
  );
  const lag = assocLaguerre(n - l - 1, 2 * l + 1, rho);
  const radialPow = l === 0 ? 1 : rho ** l;
  return pref * Math.exp(-rho / 2) * radialPow * lag;
}

const INV_SQRT_4PI = 1 / Math.sqrt(4 * Math.PI);
const SQRT_3_4PI = Math.sqrt(3 / (4 * Math.PI));
const SQRT_5_16PI = Math.sqrt(5 / (16 * Math.PI));
const SQRT_15_4PI = Math.sqrt(15 / (4 * Math.PI));
const SQRT_15_16PI = Math.sqrt(15 / (16 * Math.PI));

export type Orbital = {
  id: string;
  name: string;
  n: number;
  l: number;
  angular: (x: number, y: number, z: number, r: number) => number;
};

function cart(
  fn: (x: number, y: number, z: number, r2: number) => number,
): Orbital["angular"] {
  return (x, y, z, r) => {
    if (r < 1e-8) return 0;
    return fn(x, y, z, r * r);
  };
}

function shell(n: number, l: number, id: string, name: string, angular: Orbital["angular"]): Orbital {
  return { id, name, n, l, angular };
}

export const ORBITALS: Orbital[] = [
  shell(1, 0, "1s", "1s", () => INV_SQRT_4PI),
  shell(2, 0, "2s", "2s", () => INV_SQRT_4PI),
  shell(2, 1, "2pz", "2p_z", cart((_x, _y, z, r2) => SQRT_3_4PI * z / Math.sqrt(r2))),
  shell(2, 1, "2px", "2p_x", cart((x, _y, _z, r2) => SQRT_3_4PI * x / Math.sqrt(r2))),
  shell(2, 1, "2py", "2p_y", cart((_x, y, _z, r2) => SQRT_3_4PI * y / Math.sqrt(r2))),
  shell(3, 0, "3s", "3s", () => INV_SQRT_4PI),
  shell(3, 1, "3pz", "3p_z", cart((_x, _y, z, r2) => SQRT_3_4PI * z / Math.sqrt(r2))),
  shell(3, 1, "3px", "3p_x", cart((x, _y, _z, r2) => SQRT_3_4PI * x / Math.sqrt(r2))),
  shell(3, 1, "3py", "3p_y", cart((_x, y, _z, r2) => SQRT_3_4PI * y / Math.sqrt(r2))),
  shell(3, 2, "3dz2", "3d_z²", cart((x, y, z, r2) => SQRT_5_16PI * (2 * z * z - x * x - y * y) / r2)),
  shell(3, 2, "3dxz", "3d_xz", cart((x, _y, z, r2) => SQRT_15_4PI * (x * z) / r2)),
  shell(3, 2, "3dyz", "3d_yz", cart((_x, y, z, r2) => SQRT_15_4PI * (y * z) / r2)),
  shell(3, 2, "3dxy", "3d_xy", cart((x, y, _z, r2) => SQRT_15_4PI * (x * y) / r2)),
  shell(3, 2, "3dx2y2", "3d_x²−y²", cart((x, y, _z, r2) => SQRT_15_16PI * (x * x - y * y) / r2)),
  shell(4, 0, "4s", "4s", () => INV_SQRT_4PI),
  shell(4, 1, "4pz", "4p_z", cart((_x, _y, z, r2) => SQRT_3_4PI * z / Math.sqrt(r2))),
  shell(4, 1, "4px", "4p_x", cart((x, _y, _z, r2) => SQRT_3_4PI * x / Math.sqrt(r2))),
  shell(4, 1, "4py", "4p_y", cart((_x, y, _z, r2) => SQRT_3_4PI * y / Math.sqrt(r2))),
  shell(4, 2, "4dz2", "4d_z²", cart((x, y, z, r2) => SQRT_5_16PI * (2 * z * z - x * x - y * y) / r2)),
  shell(4, 2, "4dxz", "4d_xz", cart((x, _y, z, r2) => SQRT_15_4PI * (x * z) / r2)),
  shell(4, 2, "4dyz", "4d_yz", cart((_x, y, z, r2) => SQRT_15_4PI * (y * z) / r2)),
  shell(4, 2, "4dxy", "4d_xy", cart((x, y, _z, r2) => SQRT_15_4PI * (x * y) / r2)),
  shell(4, 2, "4dx2y2", "4d_x²−y²", cart((x, y, _z, r2) => SQRT_15_16PI * (x * x - y * y) / r2)),
];

export function orbitalById(id: string): Orbital {
  return ORBITALS.find((o) => o.id === id) ?? ORBITALS[0]!;
}

export function evalOrbital(orbital: Orbital, x: number, y: number, z: number): number {
  const r = Math.hypot(x, y, z);
  return radialR(orbital.n, orbital.l, r) * orbital.angular(x, y, z, r);
}

export type Plane = "xz" | "xy" | "yz";

export function suggestedPlane(id: string): Plane {
  if (id.endsWith("dyz")) return "yz";
  if (id.endsWith("py") || id.endsWith("dxy")) return "xy";
  return "xz";
}

export function sampleRadial(n: number, l: number, points = 480) {
  const rInt = Math.max(40, 10 * n * n);
  const fine = 5000;
  const dr = rInt / (fine - 1);
  let norm = 0;
  let rExp = 0;
  let rPeak = 0;
  let pPeak = -1;
  let prevP = 0;
  let prevR = 0;
  for (let i = 0; i < fine; i++) {
    const r = dr * i;
    const Rv = radialR(n, l, r);
    const p = r * r * Rv * Rv;
    if (i > 0) {
      const pmid = 0.5 * (prevP + p);
      const rmid = r - 0.5 * dr;
      const w = pmid * dr;
      norm += w;
      rExp += rmid * w;
    }
    if (p > pPeak) {
      pPeak = p;
      rPeak = r;
    }
    prevP = p;
    prevR = Rv;
  }
  if (norm > 0) rExp /= norm;
  void prevR;

  const rPlot = Math.max(8, 2.75 * n * n + 3);
  const rs = new Float64Array(points);
  const R = new Float64Array(points);
  const P = new Float64Array(points);
  const plotDr = rPlot / (points - 1);
  for (let i = 0; i < points; i++) {
    const r = plotDr * i;
    const Rv = radialR(n, l, r);
    rs[i] = r;
    R[i] = Rv;
    P[i] = r * r * Rv * Rv;
  }

  return {
    rs,
    R,
    P,
    rMax: rPlot,
    norm,
    rExp,
    rPeak,
    analyticR: expectationR(n, l),
  };
}

export function samplePlaneGrid(
  orbital: Orbital,
  plane: Plane,
  rMax: number,
  nGrid: number,
): Float64Array {
  const out = new Float64Array(nGrid * nGrid);
  const denom = Math.max(1, nGrid - 1);
  for (let j = 0; j < nGrid; j++) {
    const v = rMax * (1 - (2 * j) / denom);
    for (let i = 0; i < nGrid; i++) {
      const u = -rMax + (2 * rMax * i) / denom;
      let x = 0;
      let y = 0;
      let z = 0;
      if (plane === "xz") {
        x = u;
        z = v;
      } else if (plane === "xy") {
        x = u;
        y = v;
      } else {
        y = u;
        z = v;
      }
      out[j * nGrid + i] = evalOrbital(orbital, x, y, z);
    }
  }
  return out;
}

/** Real-orbital superposition |√(1−w) ψ_a + √w ψ_b e^{−iΔEt}|². */
export function mixDensity(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  w: number,
  cosPhase: number,
): Float64Array {
  const out = new Float64Array(a.length);
  const ca = Math.sqrt(Math.max(0, 1 - w));
  const cb = Math.sqrt(Math.max(0, w));
  const cross = 2 * ca * cb * cosPhase;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i] ?? 0;
    const pb = b[i] ?? 0;
    out[i] = ca * ca * pa * pa + cb * cb * pb * pb + cross * pa * pb;
  }
  return out;
}
