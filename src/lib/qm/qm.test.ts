import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticTransmission, solveBarrier } from "./barrier.ts";
import { cabs2 } from "./complex.ts";
import { finiteBoundStates, sampleFinite } from "./finite.ts";
import {
  freeObservables,
  gaussianPacket,
  packetDensity,
  samplePacket,
} from "./free.ts";
import { sampleRadial, radialR, ORBITALS, evalOrbital } from "./hydrogen.ts";
import { trap } from "./integrate.ts";
import { sampleWell, wellEnergy } from "./infinite.ts";
import { oscillatorPsi, sampleOscillator } from "./oscillator.ts";

test("gaussian packet stays normalized and matches the closed-form density", () => {
  const x0 = -1.2;
  const k0 = 1.7;
  const sigma = 0.65;
  for (const t of [0, 0.4, -1.1, 3.5]) {
    const sampled = samplePacket(t, x0, k0, sigma, 2400);
    const dx = (sampled.xMax - sampled.xMin) / (sampled.xs.length - 1);
    const norm = trap(sampled.abs2, dx);
    assert.ok(Math.abs(norm - 1) < 2e-3, `norm ${norm} at t=${t}`);
    const x = sampled.center + 0.37 * sampled.sigmaT;
    const psi = gaussianPacket(x, t, x0, k0, sigma);
    const dens = packetDensity(x, t, x0, k0, sigma);
    assert.ok(Math.abs(cabs2(psi) - dens) < 1e-9);
  }
  const at0 = gaussianPacket(x0, 0, x0, k0, sigma);
  assert.ok(Math.abs(at0.im) < 1e-12);
  assert.ok(at0.re > 0);
  const obs = freeObservables(k0, sigma);
  assert.ok(Math.abs(obs.uncertainty - 0.5) < 1e-12);
  assert.ok(Math.abs(obs.groupVelocity - k0) < 1e-12);
  assert.ok(Math.abs(obs.phaseVelocity - k0 / 2) < 1e-12);
});

test("infinite well energies and a normalized superposition", () => {
  const L = 1.4;
  assert.ok(Math.abs(wellEnergy(1, L) - Math.PI ** 2 / (2 * L * L)) < 1e-12);
  assert.ok(Math.abs(wellEnergy(3, L) / wellEnergy(1, L) - 9) < 1e-12);
  const s = sampleWell(
    [
      { n: 1, amplitude: 1 },
      { n: 2, amplitude: 0.5 },
    ],
    L,
    0.2,
    2000,
  );
  assert.ok(Math.abs(s.norm - 1) < 2e-3);
  const pure = sampleWell([{ n: 1, amplitude: 1 }], L, 0, 2000);
  assert.ok(Math.abs(pure.xExp - L / 2) < 2e-3);
  assert.ok(Math.abs(pure.meanE - wellEnergy(1, L)) < 1e-9);
});

test("finite well binds, normalizes, and meets the matching condition", () => {
  const a = 1;
  const V0 = 15;
  const states = finiteBoundStates(a, V0);
  assert.ok(states.length >= 2);
  assert.equal(states[0]?.parity, "even");
  for (const state of states) {
    assert.ok(state.energy > 0 && state.energy < V0);
    const z0 = a * Math.sqrt(2 * V0);
    const eta = Math.sqrt(z0 * z0 - state.xi * state.xi);
    const mismatch =
      state.parity === "even"
        ? state.xi * Math.tan(state.xi) - eta
        : -state.xi / Math.tan(state.xi) - eta;
    assert.ok(Math.abs(mismatch) < 1e-6, `${state.parity} residual ${mismatch}`);
    const sampled = sampleFinite(state, a, V0, 0.3, 2400);
    assert.ok(Math.abs(sampled.norm - 1) < 3e-3, `norm ${sampled.norm}`);
    assert.ok(sampled.inside > 0.5 && sampled.inside < 1);
  }
  const deep = finiteBoundStates(1, 400);
  const ground = deep[0]!;
  const infiniteGround = Math.PI ** 2 / (8 * 1 * 1);
  assert.ok(ground.energy < infiniteGround);
  assert.ok(infiniteGround - ground.energy < 0.35);
});

test("barrier transmission matches the analytic formula and conserves probability", () => {
  const cases = [
    { E: 2.5, V0: 8, L: 0.8 },
    { E: 6, V0: 8, L: 1.2 },
    { E: 8, V0: 8, L: 1 },
    { E: 14, V0: 8, L: 1.1 },
    { E: 1.2, V0: 20, L: 0.45 },
  ];
  for (const item of cases) {
    const sol = solveBarrier(item.E, item.V0, item.L);
    const T = analyticTransmission(item.E, item.V0, item.L);
    assert.ok(Math.abs(sol.T - T) < 1e-6, `T ${sol.T} vs ${T} for ${JSON.stringify(item)}`);
    assert.ok(Math.abs(sol.R + sol.T - 1) < 1e-6, `R+T ${sol.R + sol.T}`);
    assert.ok(sol.T >= 0 && sol.T <= 1 + 1e-8);
  }
  const thick = solveBarrier(2, 12, 2.4);
  const thin = solveBarrier(2, 12, 0.35);
  assert.ok(thick.T < thin.T);
  assert.ok(thick.T < 0.05);
});

test("oscillator ground state and normalization through n = 8", () => {
  const omega = 1.3;
  const psi0 = oscillatorPsi(0, 0, omega);
  const alpha = Math.sqrt(omega);
  const expected = (alpha * alpha / Math.PI) ** 0.25;
  assert.ok(Math.abs(psi0 - expected) < 1e-12);
  for (const n of [0, 1, 4, 8]) {
    const s = sampleOscillator([{ n, amplitude: 1 }], omega, 0.4, 2400);
    assert.ok(Math.abs(s.norm - 1) < 4e-3, `n=${n} norm ${s.norm}`);
    assert.ok(Math.abs(s.meanE - omega * (n + 0.5)) < 1e-9);
  }
  const mix = sampleOscillator(
    [
      { n: 0, amplitude: 1 },
      { n: 1, amplitude: 1 },
    ],
    1,
    0.7,
    2000,
  );
  assert.ok(Math.abs(mix.norm - 1) < 4e-3);
  assert.ok(Math.abs(mix.meanE - 1) < 1e-9);
});

test("hydrogen radial functions and real orbitals", () => {
  assert.ok(Math.abs(radialR(1, 0, 0) - 2) < 1e-12);
  for (const [n, l] of [
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [3, 2],
    [4, 0],
    [4, 2],
  ] as const) {
    const s = sampleRadial(n, l, 3000);
    assert.ok(Math.abs(s.norm - 1) < 2e-3, `R${n}${l} norm ${s.norm}`);
    assert.ok(Math.abs(s.rExp - s.analyticR) / s.analyticR < 0.01, `<r> ${s.rExp} vs ${s.analyticR}`);
  }
  const oneS = sampleRadial(1, 0, 4000);
  assert.ok(Math.abs(oneS.rPeak - 1) < 0.01);

  const samples = 48;
  const dTheta = Math.PI / samples;
  const dPhi = (2 * Math.PI) / samples;
  for (const id of ["1s", "2pz", "2px", "3dz2", "3dxy", "3dx2y2", "4py"]) {
    const orbital = ORBITALS.find((o) => o.id === id)!;
    let ang = 0;
    for (let i = 0; i < samples; i++) {
      const theta = (i + 0.5) * dTheta;
      for (let j = 0; j < samples; j++) {
        const phi = (j + 0.5) * dPhi;
        const st = Math.sin(theta);
        const x = st * Math.cos(phi);
        const y = st * Math.sin(phi);
        const z = Math.cos(theta);
        const ylm = orbital.angular(x, y, z, 1);
        ang += ylm * ylm * st * dTheta * dPhi;
      }
    }
    assert.ok(Math.abs(ang - 1) < 0.02, `${id} angular norm ${ang}`);
  }

  const origin = evalOrbital(ORBITALS[0]!, 0, 0, 0);
  assert.ok(Math.abs(origin - 2 / Math.sqrt(4 * Math.PI)) < 1e-9);
});
