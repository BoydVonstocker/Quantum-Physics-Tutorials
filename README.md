# Quantum-Physics-Tutorials

Visualisation of the quantum mechanics problems.

Introductory quantum mechanics, from the free particle to the hydrogen atom. The same closed forms are in `eigenlab.py` and `src/lib/qm`.

Units: ħ = 1, m = 1. Hydrogen uses Bohr units (a₀ = 1), so Eₙ = −1/(2n²) hartree.

## Python

Needs only the standard library. Matplotlib is optional, and only for `--plot`.

```bash
python eigenlab.py free --k 2 --sigma 0.8 --t 1
python eigenlab.py infinite --n 2 --L 1
python eigenlab.py finite --a 1 --V0 12
python eigenlab.py barrier --E 3 --V0 8 --L 1
python eigenlab.py oscillator --n 2 --omega 1
python eigenlab.py hydrogen --n 2 --l 1 --plot hydrogen.png
```

## TypeScript

`src/lib/qm` is the physics. `src/components/qm` is the interactive lab: wave plots, time evolution, and hydrogen density maps.

```bash
node --experimental-strip-types --test src/lib/qm/qm.test.ts
```

Node 22 or newer.

## What is covered

| System | What you get |
| --- | --- |
| Free particle | Gaussian packet, spreading, Re ψ, Im ψ, \|ψ\|² |
| Infinite well | Energies, eigenfunctions, superpositions |
| Finite well | Even and odd bound states |
| Barrier | Transmission and reflection, tunneling |
| Harmonic oscillator | Hermite states and classical comparison |
| Hydrogen | Radial functions and real s, p, and d orbitals |
