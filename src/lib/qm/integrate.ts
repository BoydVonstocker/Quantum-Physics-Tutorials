export function linspace(a: number, b: number, n: number): Float64Array {
  const xs = new Float64Array(n);
  if (n <= 1) {
    if (n === 1) xs[0] = a;
    return xs;
  }
  const h = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) xs[i] = a + h * i;
  return xs;
}

export function trap(y: ArrayLike<number>, dx: number): number {
  const n = y.length;
  if (n < 2 || !Number.isFinite(dx)) return 0;
  let s = 0.5 * ((y[0] ?? 0) + (y[n - 1] ?? 0));
  for (let i = 1; i < n - 1; i++) s += y[i] ?? 0;
  return s * dx;
}

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error(`factorial(${n})`);
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}
