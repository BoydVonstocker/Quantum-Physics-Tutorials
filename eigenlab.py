#!/usr/bin/env python3
"""Eigenlab — introductory quantum mechanics in one file.

Units: ħ = 1, m = 1. Hydrogen uses Bohr units (a0 = 1), so
E_n = -1/(2 n^2) hartree.

The same closed forms drive the Eigenlab page. This script prints the
numbers and, with matplotlib installed, saves a figure.

Examples:
  python eigenlab.py free --k 2 --sigma 0.8 --t 1
  python eigenlab.py infinite --n 2 --L 1
  python eigenlab.py finite --a 1 --V0 12
  python eigenlab.py barrier --E 3 --V0 8 --L 1
  python eigenlab.py oscillator --n 2 --omega 1
  python eigenlab.py hydrogen --n 2 --l 1 --plot hydrogen.png
"""

from __future__ import annotations

import argparse
import cmath
import math
from typing import Callable, List, Sequence, Tuple


def linspace(a: float, b: float, n: int) -> List[float]:
    if n <= 1:
        return [a]
    step = (b - a) / (n - 1)
    return [a + i * step for i in range(n)]


def trap(ys: Sequence[float], dx: float) -> float:
    if len(ys) < 2:
        return 0.0
    return dx * (0.5 * ys[0] + 0.5 * ys[-1] + sum(ys[1:-1]))


def factorial(n: int) -> int:
    out = 1
    for i in range(2, n + 1):
        out *= i
    return out


# --- free particle ---------------------------------------------------------

def packet_sigma(t: float, sigma: float) -> float:
    tau = t / (2 * sigma * sigma)
    return sigma * math.sqrt(1 + tau * tau)


def gaussian_packet(x: float, t: float, x0: float, k0: float, sigma: float) -> complex:
    s2 = sigma * sigma
    tau = t / (2 * s2)
    norm = (2 * math.pi * s2) ** -0.25
    inv_sqrt = 1 / cmath.sqrt(1 + 1j * tau)
    beta = x - x0 - k0 * t
    quad = -(beta * beta) / (4 * s2 * (1 + 1j * tau))
    phase = 1j * (k0 * (x - x0) - 0.5 * k0 * k0 * t)
    return norm * inv_sqrt * cmath.exp(quad + phase)


def solve_free(k: float, sigma: float, t: float, x0: float) -> None:
    center = x0 + k * t
    width = packet_sigma(t, sigma)
    psi0 = gaussian_packet(x0, 0, x0, k, sigma)
    print(f"E = k²/2 = {0.5 * k * k:.6f}")
    print(f"group velocity = {k:.6f}    phase velocity = {0.5 * k:.6f}")
    print(f"Δx Δk = {sigma * (1 / (2 * sigma)):.6f}  (minimum is 1/2)")
    print(f"center(t) = {center:.6f}    σ(t) = {width:.6f}")
    print(f"ψ(x0, 0) = {psi0.real:.6f} {psi0.imag:+.6f}j")
    xs = linspace(center - 6 * width, center + 6 * width, 400)
    dens = [abs(gaussian_packet(x, t, x0, k, sigma)) ** 2 for x in xs]
    print(f"grid norm ≈ {trap(dens, xs[1] - xs[0]):.6f}")
    maybe_plot(
        xs,
        [("Re ψ", [gaussian_packet(x, t, x0, k, sigma).real for x in xs]),
         ("|ψ|²", dens)],
        "Free-particle Gaussian packet",
        "x",
    )


# --- infinite well ---------------------------------------------------------

def well_energy(n: int, length: float) -> float:
    return (n * n * math.pi * math.pi) / (2 * length * length)


def well_psi(n: int, x: float, length: float) -> float:
    if x <= 0 or x >= length:
        return 0.0
    return math.sqrt(2 / length) * math.sin(n * math.pi * x / length)


def solve_infinite(n: int, length: float) -> None:
    print(f"E_{n} = {well_energy(n, length):.6f}")
    print(f"E_n / E_1 = {n * n}")
    xs = linspace(0, length, 500)
    ys = [well_psi(n, x, length) for x in xs]
    print(f"norm ≈ {trap([y * y for y in ys], xs[1] - xs[0]):.6f}")
    maybe_plot(xs, [(f"ψ_{n}", ys), ("|ψ|²", [y * y for y in ys])], f"Infinite well n={n}", "x")


# --- finite well -----------------------------------------------------------

def _bisect(fn: Callable[[float], float], lo: float, hi: float) -> float | None:
    fa, fb = fn(lo), fn(hi)
    if not (math.isfinite(fa) and math.isfinite(fb)) or fa * fb > 0:
        return None
    a, b = lo, hi
    for _ in range(70):
        mid = 0.5 * (a + b)
        fm = fn(mid)
        if abs(fm) < 1e-12 or b - a < 1e-12:
            return mid
        if fa * fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return 0.5 * (a + b)


def finite_states(a: float, v0: float) -> List[Tuple[str, float, float]]:
    z0 = a * math.sqrt(2 * v0)
    found: List[Tuple[str, float]] = []
    n = 0
    while n < 40:
        left = n * math.pi + 1e-8
        right = min(z0 - 1e-8, n * math.pi + math.pi / 2 - 1e-8)
        if left >= z0:
            break
        if right > left:
            root = _bisect(lambda x: x * math.tan(x) - math.sqrt(max(0.0, z0 * z0 - x * x)), left, right)
            if root is not None:
                found.append(("even", root))
        n += 1
    n = 0
    while n < 40:
        left = n * math.pi + math.pi / 2 + 1e-8
        right = min(z0 - 1e-8, (n + 1) * math.pi - 1e-8)
        if left >= z0:
            break
        if right > left:
            root = _bisect(
                lambda x: -x * math.cos(x) / math.sin(x) - math.sqrt(max(0.0, z0 * z0 - x * x)),
                left,
                right,
            )
            if root is not None:
                found.append(("odd", root))
        n += 1
    found.sort(key=lambda item: item[1])
    return [(parity, xi * xi / (2 * a * a), xi) for parity, xi in found]


def solve_finite(a: float, v0: float) -> None:
    states = finite_states(a, v0)
    if not states:
        print("No bound states.")
        return
    print(f"{len(states)} bound state(s), V0 = {v0}")
    for i, (parity, energy, xi) in enumerate(states, start=1):
        print(f"  n={i:2d}  {parity:4s}  E={energy:.6f}  ξ={xi:.4f}")
    parity, energy, xi = states[0]
    k = xi / a
    eta = math.sqrt(max(0.0, 2 * v0 * a * a - xi * xi))
    kappa = eta / a
    xs = linspace(-3 * a, 3 * a, 500)
    raw = []
    outside = (math.cos(k * a) if parity == "even" else math.sin(k * a)) * math.exp(kappa * a)
    for x in xs:
        if abs(x) <= a:
            raw.append(math.cos(k * x) if parity == "even" else math.sin(k * x))
        else:
            tail = outside * math.exp(-kappa * abs(x))
            raw.append(tail if parity == "even" else math.copysign(tail, x))
    norm = trap([y * y for y in raw], xs[1] - xs[0])
    scale = 1 / math.sqrt(norm) if norm else 1
    psi = [y * scale for y in raw]
    print(f"ground-state norm after scaling ≈ {trap([y * y for y in psi], xs[1] - xs[0]):.6f}")
    maybe_plot(xs, [("ψ ground", psi)], "Finite well ground state", "x")


# --- barrier ---------------------------------------------------------------

def _solve4(rows: List[List[complex]]) -> List[complex]:
    m = [row[:] for row in rows]
    n = 4
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[piv] = m[piv], m[col]
        diag = m[col][col]
        for r in range(col + 1, n):
            factor = m[r][col] / diag
            for k in range(col, n + 1):
                m[r][k] -= factor * m[col][k]
    x = [0j] * n
    for i in range(n - 1, -1, -1):
        acc = m[i][n]
        for j in range(i + 1, n):
            acc -= m[i][j] * x[j]
        x[i] = acc / m[i][i]
    return x


def solve_barrier(energy: float, v0: float, length: float) -> Tuple[complex, complex]:
    k = math.sqrt(2 * energy)
    if energy < v0:
        kappa = math.sqrt(2 * (v0 - energy))
        decay = math.exp(-min(kappa * length, 60))
        eikl = cmath.exp(1j * k * length)
        rows = [
            [1, -decay, -1, 0, -1],
            [-1j * k, -kappa * decay, kappa, 0, -1j * k],
            [0, 1, decay, -eikl, 0],
            [0, kappa, -kappa * decay, -1j * k * eikl, 0],
        ]
    else:
        q = math.sqrt(2 * max(energy - v0, 0)) or 1e-8
        eikl = cmath.exp(1j * k * length)
        eiql = cmath.exp(1j * q * length)
        emql = cmath.exp(-1j * q * length)
        rows = [
            [1, -1, -1, 0, -1],
            [-1j * k, -1j * q, 1j * q, 0, -1j * k],
            [0, eiql, emql, -eikl, 0],
            [0, 1j * q * eiql, -1j * q * emql, -1j * k * eikl, 0],
        ]
    r, _c, _d, t = _solve4(rows)
    return r, t


def analytic_t(energy: float, v0: float, length: float) -> float:
    if abs(energy - v0) < 1e-8:
        return 1 / (1 + (v0 * v0 * length * length) / (2 * energy))
    if energy < v0:
        s = math.sinh(min(math.sqrt(2 * (v0 - energy)) * length, 40))
        return 1 / (1 + (v0 * v0 * s * s) / (4 * energy * (v0 - energy)))
    q = math.sqrt(2 * (energy - v0))
    s = math.sin(q * length)
    return 1 / (1 + (v0 * v0 * s * s) / (4 * energy * (energy - v0)))


def solve_barrier_cli(energy: float, v0: float, length: float) -> None:
    r, t = solve_barrier(energy, v0, length)
    R, T = abs(r) ** 2, abs(t) ** 2
    print(f"R = {R:.6f}")
    print(f"T = {T:.6f}")
    print(f"R + T = {R + T:.6f}")
    print(f"analytic T = {analytic_t(energy, v0, length):.6f}")
    print("classical transmission would be 0" if energy < v0 else "classical transmission would be 1")


# --- oscillator ------------------------------------------------------------

def hermite(n: int, xi: float) -> float:
    if n <= 0:
        return 1.0
    if n == 1:
        return 2 * xi
    h0, h1 = 1.0, 2 * xi
    for k in range(1, n):
        h0, h1 = h1, 2 * xi * h1 - 2 * k * h0
    return h1


def oscillator_psi(n: int, x: float, omega: float) -> float:
    alpha = math.sqrt(omega)
    xi = alpha * x
    norm = (alpha * alpha / math.pi) ** 0.25 / math.sqrt(2**n * factorial(n))
    return norm * math.exp(-0.5 * xi * xi) * hermite(n, xi)


def solve_oscillator(n: int, omega: float) -> None:
    energy = omega * (n + 0.5)
    turning = math.sqrt(2 * energy) / omega
    print(f"E_{n} = {energy:.6f}")
    print(f"turning points ±{turning:.6f}")
    reach = turning + 4 / math.sqrt(omega)
    xs = linspace(-reach, reach, 800)
    ys = [oscillator_psi(n, x, omega) for x in xs]
    print(f"norm ≈ {trap([y * y for y in ys], xs[1] - xs[0]):.6f}")
    maybe_plot(xs, [(f"ψ_{n}", ys), ("|ψ|²", [y * y for y in ys])], f"Oscillator n={n}", "x")


# --- hydrogen --------------------------------------------------------------

def assoc_laguerre(n: int, alpha: int, x: float) -> float:
    if n <= 0:
        return 1.0
    if n == 1:
        return 1 + alpha - x
    lm2, lm1 = 1.0, 1 + alpha - x
    for k in range(1, n):
        lm2, lm1 = lm1, ((2 * k + 1 + alpha - x) * lm1 - (k + alpha) * lm2) / (k + 1)
    return lm1


def radial_r(n: int, ell: int, r: float) -> float:
    rho = 2 * r / n
    pref = math.sqrt((2 / n) ** 3 * factorial(n - ell - 1) / (2 * n * factorial(n + ell)))
    power = 1.0 if ell == 0 else rho**ell
    return pref * math.exp(-rho / 2) * power * assoc_laguerre(n - ell - 1, 2 * ell + 1, rho)


def solve_hydrogen(n: int, ell: int) -> None:
    if ell < 0 or ell >= n:
        raise SystemExit("need 0 ≤ ℓ < n")
    hartree = -0.5 / (n * n)
    ev = hartree * 27.211386245
    analytic = 0.5 * (3 * n * n - ell * (ell + 1))
    print(f"E_{n} = {hartree:.6f} Ha = {ev:.4f} eV")
    print(f"degeneracy n² = {n * n}")
    print(f"radial nodes = {n - ell - 1}")
    print(f"analytic ⟨r⟩ = {analytic:.6f} a0")
    print(f"R(0) = {radial_r(n, ell, 0):.6f}" if ell == 0 else "R(0) = 0")
    r_max = max(40.0, 10 * n * n)
    rs = linspace(0, r_max, 4000)
    prob = [(r * radial_r(n, ell, r)) ** 2 for r in rs]
    dx = rs[1] - rs[0]
    norm = trap(prob, dx)
    r_exp = trap([0.5 * (rs[i] + rs[i + 1]) * 0.5 * (prob[i] + prob[i + 1]) for i in range(len(rs) - 1)], dx)
    # trap() above double-counts dx. Compute ⟨r⟩ directly.
    acc = 0.0
    for i in range(len(rs) - 1):
        acc += 0.5 * (rs[i] + rs[i + 1]) * 0.5 * (prob[i] + prob[i + 1]) * dx
    print(f"numerical norm = {norm:.6f}")
    print(f"numerical ⟨r⟩ = {acc / norm:.6f} a0")
    r_plot = max(8.0, 2.75 * n * n + 3)
    xs = linspace(0, r_plot, 400)
    maybe_plot(
        xs,
        [("r² R²", [(r * radial_r(n, ell, r)) ** 2 for r in xs])],
        f"Hydrogen radial probability n={n} ℓ={ell}",
        "r / a0",
    )


PLOT_PATH: str | None = None


def maybe_plot(xs: Sequence[float], series: Sequence[Tuple[str, Sequence[float]]], title: str, xlabel: str) -> None:
    if not PLOT_PATH:
        return
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception as exc:  # pragma: no cover
        print(f"matplotlib not available ({exc}); numbers only")
        return
    fig, ax = plt.subplots(figsize=(8, 4.2))
    fig.patch.set_facecolor("#10140f")
    ax.set_facecolor("#10140f")
    colors = ["#e2a322", "#3cbfb0", "#efe8d6"]
    for (label, ys), color in zip(series, colors):
        ax.plot(xs, ys, label=label, color=color, linewidth=1.6)
    ax.set_title(title, color="#efe8d6")
    ax.set_xlabel(xlabel, color="#a39a86")
    ax.tick_params(colors="#a39a86")
    for spine in ax.spines.values():
        spine.set_color("#343c30")
    ax.legend(facecolor="#1a2118", edgecolor="#343c30", labelcolor="#efe8d6")
    fig.tight_layout()
    fig.savefig(PLOT_PATH, dpi=140)
    print(f"wrote {PLOT_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Eigenlab introductory quantum solvers")
    parser.add_argument("--plot", help="save a matplotlib figure to this path")
    sub = parser.add_subparsers(dest="system", required=True)

    free = sub.add_parser("free")
    free.add_argument("--k", type=float, default=2.0)
    free.add_argument("--sigma", type=float, default=0.75)
    free.add_argument("--t", type=float, default=0.0)
    free.add_argument("--x0", type=float, default=0.0)

    infinite = sub.add_parser("infinite")
    infinite.add_argument("--n", type=int, default=1)
    infinite.add_argument("--L", type=float, default=1.0)

    finite = sub.add_parser("finite")
    finite.add_argument("--a", type=float, default=1.0)
    finite.add_argument("--V0", type=float, default=12.0)

    barrier = sub.add_parser("barrier")
    barrier.add_argument("--E", type=float, default=3.0)
    barrier.add_argument("--V0", type=float, default=8.0)
    barrier.add_argument("--L", type=float, default=1.0)

    oscillator = sub.add_parser("oscillator")
    oscillator.add_argument("--n", type=int, default=0)
    oscillator.add_argument("--omega", type=float, default=1.0)

    hydrogen = sub.add_parser("hydrogen")
    hydrogen.add_argument("--n", type=int, default=1)
    hydrogen.add_argument("--l", type=int, default=0)

    args = parser.parse_args()
    global PLOT_PATH
    PLOT_PATH = args.plot

    if args.system == "free":
        solve_free(args.k, args.sigma, args.t, args.x0)
    elif args.system == "infinite":
        solve_infinite(args.n, args.L)
    elif args.system == "finite":
        solve_finite(args.a, args.V0)
    elif args.system == "barrier":
        solve_barrier_cli(args.E, args.V0, args.L)
    elif args.system == "oscillator":
        solve_oscillator(args.n, args.omega)
    elif args.system == "hydrogen":
        solve_hydrogen(args.n, args.l)


if __name__ == "__main__":
    main()
