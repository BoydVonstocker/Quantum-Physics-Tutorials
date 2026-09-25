import { trap } from "./integrate.ts";

/**
 * Symmetric finite well: V = 0 for |x| < a, V = V0 outside. ℏ = m = 1.
 * Even roots of ξ tan ξ = η, odd roots of −ξ cot ξ = η,
 * with ξ² + η² = 2 V0 a².
 */

export type FiniteState = {
  index: number;
  parity: "even" | "odd";
  energy: number;
  xi: number;
  eta: number;
};

function bisect(
  f: (x: number) => number,
  lo: number,
  hi: number,
): number | null {
  let a = lo;
  let b = hi;
  let fa = f(a);
  let fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return null;
  for (let i = 0; i < 70; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-12 || b - a < 1e-12 * Math.max(1, Math.abs(m))) return m;
    if (fa * fm <= 0) {
      b = m;
      fb = fm;
    } else {
      a = m;
      fa = fm;
    }
  }
  return 0.5 * (a + b);
}

export function finiteBoundStates(a: number, V0: number): FiniteState[] {
  if (a <= 0 || V0 <= 0) return [];
  const z0 = a * Math.sqrt(2 * V0);
  const found: { parity: "even" | "odd"; xi: number }[] = [];

  for (let n = 0; n < 40; n++) {
    const left = n * Math.PI + 1e-8;
    const right = Math.min(z0 - 1e-8, n * Math.PI + Math.PI / 2 - 1e-8);
    if (left >= z0) break;
    if (right <= left) continue;
    const xi = bisect((x) => {
      const eta = Math.sqrt(Math.max(0, z0 * z0 - x * x));
      return x * Math.tan(x) - eta;
    }, left, right);
    if (xi != null) found.push({ parity: "even", xi });
  }

  for (let n = 0; n < 40; n++) {
    const left = n * Math.PI + Math.PI / 2 + 1e-8;
    const right = Math.min(z0 - 1e-8, (n + 1) * Math.PI - 1e-8);
    if (left >= z0) break;
    if (right <= left) continue;
    const xi = bisect((x) => {
      const eta = Math.sqrt(Math.max(0, z0 * z0 - x * x));
      return -x * Math.cos(x) / Math.sin(x) - eta;
    }, left, right);
    if (xi != null) found.push({ parity: "odd", xi });
  }

  found.sort((p, q) => p.xi - q.xi);
  return found.map((s, index) => {
    const eta = Math.sqrt(Math.max(0, z0 * z0 - s.xi * s.xi));
    return {
      index: index + 1,
      parity: s.parity,
      energy: (s.xi * s.xi) / (2 * a * a),
      xi: s.xi,
      eta,
    };
  });
}

export function sampleFinite(
  state: FiniteState,
  a: number,
  V0: number,
  t: number,
  count = 520,
) {
  const k = state.xi / a;
  const kappa = Math.max(state.eta / a, 1e-8);
  const reach = Math.max(3.2 * a, a + 8 / kappa);
  const xMin = -reach;
  const xMax = reach;
  const dx = (xMax - xMin) / (count - 1);

  const raw = new Float64Array(count);
  const xs = new Float64Array(count);
  const vs = new Float64Array(count);

  const ampOut = (A: number) => {
    if (state.parity === "even") return A * Math.cos(k * a) * Math.exp(kappa * a);
    return A * Math.sin(k * a) * Math.exp(kappa * a);
  };
  const B = ampOut(1);

  for (let i = 0; i < count; i++) {
    const x = xMin + dx * i;
    const ax = Math.abs(x);
    xs[i] = x;
    vs[i] = ax < a ? 0 : V0;
    if (ax <= a) {
      raw[i] = state.parity === "even" ? Math.cos(k * x) : Math.sin(k * x);
    } else {
      const tail = B * Math.exp(-kappa * ax);
      raw[i] = state.parity === "even" ? tail : Math.sign(x) * tail;
    }
  }

  let norm2 = 0;
  for (let i = 0; i < count - 1; i++) {
    norm2 += 0.5 * ((raw[i] ?? 0) ** 2 + (raw[i + 1] ?? 0) ** 2) * dx;
  }
  const scale = norm2 > 0 ? 1 / Math.sqrt(norm2) : 1;
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  const abs2 = new Float64Array(count);
  const phase = -state.energy * t;
  const cp = Math.cos(phase);
  const sp = Math.sin(phase);
  let inside = 0;
  for (let i = 0; i < count; i++) {
    const u = (raw[i] ?? 0) * scale;
    re[i] = u * cp;
    im[i] = u * sp;
    abs2[i] = u * u;
  }
  for (let i = 0; i < count - 1; i++) {
    const x = xs[i] ?? 0;
    if (Math.abs(x) < a) {
      inside += 0.5 * ((abs2[i] ?? 0) + (abs2[i + 1] ?? 0)) * dx;
    }
  }

  return {
    xs,
    re,
    im,
    abs2,
    vs,
    xMin,
    xMax,
    inside,
    norm: trap(abs2, dx),
  };
}
