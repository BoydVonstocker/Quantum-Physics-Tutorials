export type C = { re: number; im: number };

export function c(re: number, im = 0): C {
  return { re, im };
}

export function cadd(a: C, b: C): C {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function csub(a: C, b: C): C {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cmul(a: C, b: C): C {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function cscale(a: C, s: number): C {
  return { re: a.re * s, im: a.im * s };
}

export function cdiv(a: C, b: C): C {
  const d = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
}

export function cexp(a: C): C {
  const m = Math.exp(a.re);
  return { re: m * Math.cos(a.im), im: m * Math.sin(a.im) };
}

export function cabs(a: C): number {
  return Math.hypot(a.re, a.im);
}

export function cabs2(a: C): number {
  return a.re * a.re + a.im * a.im;
}

/** Principal square root, branch cut on the negative real axis. */
export function csqrt(a: C): C {
  const m = Math.sqrt(cabs(a));
  const arg = Math.atan2(a.im, a.re) / 2;
  return { re: m * Math.cos(arg), im: m * Math.sin(arg) };
}

/** Solve A x = b for a small square complex system. Partial pivot. */
export function solveLinear(A: C[][], b: C[]): C[] {
  const n = b.length;
  const M: C[][] = A.map((row, i) => [...row.map((v) => ({ ...v })), { ...b[i] }]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = cabs(M[col]![col]!);
    for (let r = col + 1; r < n; r++) {
      const v = cabs(M[r]![col]!);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-14) throw new Error("Singular linear system");
    if (piv !== col) {
      const tmp = M[col]!;
      M[col] = M[piv]!;
      M[piv] = tmp;
    }
    const diag = M[col]![col]!;
    for (let r = col + 1; r < n; r++) {
      const f = cdiv(M[r]![col]!, diag);
      for (let k = col; k <= n; k++) {
        M[r]![k] = csub(M[r]![k]!, cmul(f, M[col]![k]!));
      }
    }
  }
  const x: C[] = Array.from({ length: n }, () => c(0));
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i]![n]!;
    for (let j = i + 1; j < n; j++) s = csub(s, cmul(M[i]![j]!, x[j]!));
    x[i] = cdiv(s, M[i]![i]!);
  }
  return x;
}
