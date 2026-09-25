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
