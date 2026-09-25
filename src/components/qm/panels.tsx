import { useMemo, useState } from "react";
import { CurvePlot, type Curve } from "@/components/qm/curve-plot";
import { DensityMap } from "@/components/qm/density-map";
import { ChoiceRow, Legend, Segment, Slider, Stat, TimeBar, Workbench } from "@/components/qm/ui";
import { sampleBarrier } from "@/lib/qm/barrier";
import { finiteBoundStates, sampleFinite } from "@/lib/qm/finite";
import { fmt } from "@/lib/qm/format";
import { freeObservables, samplePacket, samplePlane } from "@/lib/qm/free";
import {
  energyEV,
  energyHartree,
  mixDensity,
  orbitalById,
  ORBITALS,
  samplePlaneGrid,
  sampleRadial,
  suggestedPlane,
  type Plane,
} from "@/lib/qm/hydrogen";
import { sampleWell } from "@/lib/qm/infinite";
import { sampleOscillator } from "@/lib/qm/oscillator";

export type Bounds = { min: number; max: number; rate: number };

export type PanelProps = {
  active: boolean;
  time: number;
  setTime: (time: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  setBounds: (bounds: Bounds) => void;
};

const WAVE = "--color-wave";
const PRIMARY = "--color-primary";
const FG = "--color-fg";
const MUTED = "--color-muted";

function scrub(setPlaying: (playing: boolean) => void, setTime: (time: number) => void) {
  return (time: number) => {
    setPlaying(false);
    setTime(time);
  };
}

export function FreePanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [mode, setMode] = useState<"packet" | "plane">("packet");
  const [k0, setK0] = useState(2);
  const [sigma, setSigma] = useState(0.75);
  const [x0, setX0] = useState(-2);
  const bounds = { min: -12, max: 30, rate: 2.4 };
  if (active) setBounds(bounds);

  const packet = mode === "packet";
  const width = Math.max(sigma, 0.2);
  const obs = freeObservables(k0, width);
  const packetSample = packet ? samplePacket(time, x0, k0, width) : null;
  const planeSample = packet ? null : samplePlane(time, k0);
  const sampled = (packetSample ?? planeSample)!;
  const curves: Curve[] = [
    { xs: sampled.xs, ys: sampled.abs2, token: PRIMARY, width: 2, fill: true },
    { xs: sampled.xs, ys: sampled.re, token: WAVE, width: 1.5 },
    { xs: sampled.xs, ys: sampled.im, token: FG, width: 1.25 },
  ];

  return (
    <Workbench
      equation="i ∂ψ/∂t = −½ ∂²ψ/∂x²"
      notes="A plane wave e^{ikx} is a momentum eigenstate with E = k²/2, phase velocity k/2 and group velocity k. It cannot be normalized. A Gaussian packet is the minimum-uncertainty superposition of nearby k: the center travels at v_g = k₀ while the packet spreads because the faster components pull ahead."
      plot={
        <>
          <CurvePlot
            xMin={sampled.xMin}
            xMax={sampled.xMax}
            curves={curves}
            ySymmetric
            yLabel={packet ? "ψ, |ψ|²" : "Re ψ, Im ψ"}
            markers={packetSample ? [{ x: packetSample.center, token: PRIMARY }] : undefined}
            ariaLabel={
              packetSample
                ? `Gaussian wave packet centered at ${fmt(packetSample.center)} with width ${fmt(packetSample.sigmaT)}`
                : `Plane wave with wave number ${fmt(k0)}`
            }
          />
          <Legend
            items={[
              { token: PRIMARY, label: packet ? "|ψ|² and packet center" : "|ψ|² = 1" },
              { token: WAVE, label: "Re ψ" },
              { token: FG, label: "Im ψ" },
            ]}
          />
        </>
      }
      controls={
        <>
          <Segment
            value={mode}
            onChange={(id) => setMode(id as "packet" | "plane")}
            options={[
              { id: "packet", label: "Wave packet" },
              { id: "plane", label: "Plane wave" },
            ]}
          />
          <Slider label="Wave number k₀" min={0.3} max={5} step={0.05} value={k0} display={fmt(k0, 2)} onChange={setK0} />
          {packet ? (
            <>
              <Slider label="Width σ" min={0.35} max={2.2} step={0.01} value={sigma} display={fmt(sigma, 2)} onChange={setSigma} hint="Standard deviation of |ψ|² at t = 0." />
              <Slider label="Start x₀" min={-6} max={6} step={0.1} value={x0} display={fmt(x0, 1)} onChange={setX0} />
            </>
          ) : null}
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          <div className="mt-3">
            <Stat label="Energy" value={fmt(obs.energy, 3)} detail="E = k₀² / 2" />
            <Stat label="Group velocity" value={fmt(obs.groupVelocity, 3)} detail="v_g = dE/dk = k₀" />
            <Stat label="Phase velocity" value={fmt(obs.phaseVelocity, 3)} detail="v_p = E/k = k₀/2" />
            {packet ? (
              <Stat
                label="Spreading"
                value={`σ(t) = ${fmt(packetSample?.sigmaT ?? 0, 3)}`}
                detail={`Δx Δk = ${fmt(obs.uncertainty, 2)} (minimum)`}
              />
            ) : (
              <Stat label="Wavelength" value={fmt(planeSample?.wavelength ?? 0, 3)} detail="λ = 2π/|k|" />
            )}
          </div>
        </>
      }
    />
  );
}

export function InfinitePanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [length, setLength] = useState(1);
  const [amps, setAmps] = useState([1, 1, 0, 0]);
  const bounds = { min: 0, max: 2.5, rate: 0.28 };
  if (active) setBounds(bounds);
  const parts = amps.map((amplitude, i) => ({ n: i + 1, amplitude }));
  const sampled = sampleWell(parts, length, time);
  const sum = amps.reduce((s, a) => s + a * a, 0);

  return (
    <Workbench
      equation="ψ(0, t) = ψ(L, t) = 0"
      notes="The walls force nodes at both ends, so only standing waves sin(nπx/L) fit. There is no n = 0 state, and energy grows as n². A single level only changes its overall phase — |ψ|² stays put. Mix n = 1 and n = 2 and the probability sloshes at the Bohr frequency (E₂ − E₁)/ℏ."
      plot={
        <>
          <CurvePlot
            xMin={0}
            xMax={length}
            curves={[
              { xs: sampled.xs, ys: sampled.abs2, token: PRIMARY, width: 2, fill: true },
              { xs: sampled.xs, ys: sampled.re, token: WAVE, width: 1.5 },
              { xs: sampled.xs, ys: sampled.im, token: FG, width: 1.25 },
            ]}
            walls={[0, length]}
            markers={sum > 0 ? [{ x: sampled.xExp, token: PRIMARY }] : undefined}
            ySymmetric
            yLabel="ψ, |ψ|²"
            ariaLabel={`Infinite well of width ${fmt(length)}. Expectation of x is ${fmt(sampled.xExp)}.`}
          />
          <Legend
            items={[
              { token: PRIMARY, label: "|ψ|² and ⟨x⟩" },
              { token: WAVE, label: "Re ψ" },
              { token: FG, label: "Im ψ" },
            ]}
          />
          <div className="relative mt-4 h-8">
            <div className="absolute inset-x-0 top-3 h-px bg-border" />
            <div
              className="absolute top-1 h-4 w-0.5 bg-primary"
              style={{ left: `${Math.min(100, Math.max(0, (sampled.xExp / length) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-muted">Meter: ⟨x⟩ across the well.</p>
        </>
      }
      controls={
        <>
          <Slider label="Width L" min={0.6} max={3} step={0.01} value={length} display={fmt(length, 2)} onChange={setLength} />
          {amps.map((amp, i) => (
            <Slider
              key={i}
              label={`Amplitude n = ${i + 1}`}
              min={0}
              max={1}
              step={0.01}
              value={amp}
              display={fmt(amp, 2)}
              onChange={(value) =>
                setAmps((prev) => prev.map((item, j) => (j === i ? value : item)))
              }
            />
          ))}
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          <div className="mt-3">
            <Stat label="Mean energy" value={sum > 0 ? fmt(sampled.meanE, 3) : "—"} detail="Σ |cₙ|² Eₙ, Eₙ = n² π² / (2L²)" />
            <Stat label="⟨x⟩" value={sum > 0 ? fmt(sampled.xExp, 3) : "—"} detail={`Δx = ${sum > 0 ? fmt(sampled.deltaX, 3) : "—"}`} />
            <Stat label="Norm" value={fmt(sampled.norm, 3)} detail="∫ |ψ|² dx on the grid" />
          </div>
        </>
      }
    />
  );
}

export function FinitePanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [half, setHalf] = useState(1);
  const [depth, setDepth] = useState(12);
  const [which, setWhich] = useState(0);
  const bounds = { min: 0, max: 4, rate: 0.7 };
  if (active) setBounds(bounds);
  const states = useMemo(() => finiteBoundStates(half, depth), [half, depth]);
  const index = Math.min(which, Math.max(0, states.length - 1));
  const state = states[index];
  const sampled = state ? sampleFinite(state, half, depth, time) : null;

  return (
    <Workbench
      equation="V = 0 for |x| < a,  V = V₀ outside"
      notes="Outside a finite well the wavefunction decays instead of vanishing. Matching ψ and ψ′ at the walls quantizes the energy, but only finitely many bound states fit. In one dimension even a very shallow well holds at least one. A deep well approaches the infinite well of width 2a from below."
      plot={
        sampled && state ? (
          <>
            <CurvePlot
              xMin={sampled.xMin}
              xMax={sampled.xMax}
              curves={[
                { xs: sampled.xs, ys: sampled.abs2, token: PRIMARY, width: 2, fill: true },
                { xs: sampled.xs, ys: sampled.re, token: WAVE, width: 1.5 },
                { xs: sampled.xs, ys: sampled.im, token: FG, width: 1.15 },
              ]}
              potential={{ xs: sampled.xs, vs: sampled.vs }}
              ySymmetric
              yLabel="ψ, |ψ|²"
              ariaLabel={`${state.parity} bound state ${state.index}, energy ${fmt(state.energy)}`}
            />
            <Legend
              items={[
                { token: PRIMARY, label: "|ψ|² and the well (shape)" },
                { token: WAVE, label: "Re ψ" },
                { token: FG, label: "Im ψ" },
              ]}
            />
          </>
        ) : (
          <p className="text-sm text-muted">No bound state for these parameters.</p>
        )
      }
      controls={
        <>
          <Slider label="Half-width a" min={0.4} max={2.4} step={0.01} value={half} display={fmt(half, 2)} onChange={setHalf} />
          <Slider label="Depth V₀" min={1} max={40} step={0.1} value={depth} display={fmt(depth, 1)} onChange={setDepth} />
          <p className="mt-2 text-xs tracking-wide text-muted uppercase">Bound states</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {states.map((item, i) => (
              <button
                key={`${item.parity}-${item.index}`}
                type="button"
                aria-pressed={i === index}
                onClick={() => setWhich(i)}
                className={
                  i === index
                    ? "min-h-11 border border-primary bg-primary px-3 text-sm text-primary-fg"
                    : "min-h-11 border border-border bg-surface-2 px-3 text-sm text-fg"
                }
              >
                n={item.index} {item.parity}
              </button>
            ))}
          </div>
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          {state && sampled ? (
            <div className="mt-3">
              <Stat label="Energy" value={fmt(state.energy, 4)} detail={`0 < E < V₀ = ${fmt(depth, 2)}`} />
              <Stat label="Parity" value={state.parity} detail="Even: ξ tan ξ = η. Odd: −ξ cot ξ = η." />
              <Stat label="Inside the well" value={`${fmt(100 * sampled.inside, 1)}%`} detail="Probability for |x| < a" />
              <Stat label="Norm" value={fmt(sampled.norm, 3)} />
            </div>
          ) : null}
        </>
      }
    />
  );
}

export function BarrierPanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [energy, setEnergy] = useState(3);
  const [height, setHeight] = useState(8);
  const [width, setWidth] = useState(1);
  const bounds = { min: 0, max: 3, rate: 0.55 };
  if (active) setBounds(bounds);
  const sampled = sampleBarrier(energy, height, width, time);
  const tunneling = energy < height;

  return (
    <Workbench
      equation="Incident wave + reflected wave, for x < 0"
      notes="A classical particle with E < V₀ bounces back. The stationary scattering state still leaks through: T = |t|² is small and falls exponentially with thickness and with √(V₀ − E). Above the barrier, T oscillates with width and hits 1 at resonances. Probability is conserved: R + T = 1."
      plot={
        <>
          <CurvePlot
            xMin={sampled.xMin}
            xMax={sampled.xMax}
            curves={[
              { xs: sampled.xs, ys: sampled.abs2, token: PRIMARY, width: 2, fill: true },
              { xs: sampled.xs, ys: sampled.re, token: WAVE, width: 1.5 },
              { xs: sampled.xs, ys: sampled.im, token: FG, width: 1.15 },
            ]}
            potential={{ xs: sampled.xs, vs: sampled.vs }}
            ySymmetric
            yLabel="ψ, |ψ|²"
            ariaLabel={`Barrier transmission ${(100 * sampled.T).toFixed(2)} percent, reflection ${(100 * sampled.R).toFixed(2)} percent.`}
          />
          <Legend
            items={[
              { token: PRIMARY, label: "|ψ|² and barrier (shape)" },
              { token: WAVE, label: "Re ψ" },
              { token: FG, label: "Im ψ" },
            ]}
          />
        </>
      }
      controls={
        <>
          <p className="font-display text-4xl leading-none text-primary tabular-nums">{fmt(100 * sampled.T, 2)}%</p>
          <p className="mt-1 text-sm text-muted">{tunneling ? "Tunnels through" : "Passes over the barrier"}</p>
          <Slider label="Energy E" min={0.2} max={24} step={0.05} value={energy} display={fmt(energy, 2)} onChange={setEnergy} />
          <Slider label="Height V₀" min={0.5} max={24} step={0.05} value={height} display={fmt(height, 2)} onChange={setHeight} />
          <Slider label="Width L" min={0.2} max={3} step={0.01} value={width} display={fmt(width, 2)} onChange={setWidth} />
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          <div className="mt-3">
            <Stat label="Reflection R" value={fmt(sampled.R, 4)} />
            <Stat label="Transmission T" value={fmt(sampled.T, 4)} detail="Same k on both sides, so T = |t|²" />
            <Stat label="R + T" value={fmt(sampled.R + sampled.T, 4)} detail="Unitarity check" />
          </div>
        </>
      }
    />
  );
}

export function OscillatorPanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [n, setN] = useState(0);
  const [mix, setMix] = useState(0);
  const [omega, setOmega] = useState(1);
  const [classical, setClassical] = useState(true);
  const bounds = { min: 0, max: 10, rate: 0.7 };
  if (active) setBounds(bounds);
  const parts = [
    { n, amplitude: 1 },
    { n: n + 1, amplitude: mix },
  ];
  const sampled = sampleOscillator(parts, omega, time);
  const curves: Curve[] = [
    { xs: sampled.xs, ys: sampled.abs2, token: PRIMARY, width: 2, fill: true },
    { xs: sampled.xs, ys: sampled.re, token: WAVE, width: 1.5 },
  ];
  if (classical) {
    curves.push({
      xs: sampled.xs,
      ys: sampled.classical,
      token: MUTED,
      width: 1.25,
      dash: true,
      scale: false,
    });
  }

  return (
    <Workbench
      equation="−½ ψ″ + ½ ω² x² ψ = E ψ"
      notes="The potential ½ω²x² gives evenly spaced levels Eₙ = ω(n + ½), starting above zero. Wavefunctions are a Gaussian times a Hermite polynomial, with n nodes. The dashed curve is the classical probability of a particle bouncing between the turning points — it piles up at the edges, and the quantum distribution approaches that shape only at large n."
      plot={
        <>
          <CurvePlot
            xMin={sampled.xMin}
            xMax={sampled.xMax}
            curves={curves}
            potential={{ xs: sampled.xs, vs: sampled.vs }}
            markers={[
              { x: -sampled.turning, token: MUTED },
              { x: sampled.turning, token: MUTED },
            ]}
            ySymmetric
            yLabel="ψ, |ψ|²"
            ariaLabel={`Harmonic oscillator level n = ${n}, energy ${fmt(sampled.meanE)}`}
          />
          <Legend
            items={[
              { token: PRIMARY, label: "|ψ|²" },
              { token: WAVE, label: "Re ψ" },
              { token: MUTED, label: "Classical probability (dashed)" },
            ]}
          />
        </>
      }
      controls={
        <>
          <p className="text-xs tracking-wide text-muted uppercase">Level n</p>
          <div className="mt-2">
            <ChoiceRow
              value={String(n)}
              onChange={(id) => setN(Number(id))}
              options={Array.from({ length: 9 }, (_, i) => ({ id: String(i), label: String(i) }))}
            />
          </div>
          <Slider label="ω" min={0.4} max={2.5} step={0.01} value={omega} display={fmt(omega, 2)} onChange={setOmega} />
          <Slider
            label={`Weight of n = ${n + 1}`}
            min={0}
            max={1}
            step={0.01}
            value={mix}
            display={fmt(mix, 2)}
            onChange={setMix}
            hint="Equal mix breathes at the level spacing ω."
          />
          <button
            type="button"
            aria-pressed={classical}
            onClick={() => setClassical((v) => !v)}
            className={
              classical
                ? "mt-2 min-h-11 w-full bg-primary text-sm text-primary-fg"
                : "mt-2 min-h-11 w-full border border-border bg-surface-2 text-sm text-fg"
            }
          >
            {classical ? "Classical curve on" : "Classical curve off"}
          </button>
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          <div className="mt-3">
            <Stat label="Mean energy" value={fmt(sampled.meanE, 4)} detail="Eₙ = ω (n + ½)" />
            <Stat label="Turning points" value={`±${fmt(sampled.turning, 3)}`} detail="Where ½ω²x² = Eₙ for the dominant level" />
            <Stat label="Norm" value={fmt(sampled.norm, 3)} />
          </div>
        </>
      }
    />
  );
}

const GRID = 108;

function peakScale(values: ArrayLike<number>): Float64Array {
  let max = 0;
  for (let i = 0; i < values.length; i++) max = Math.max(max, Math.abs(values[i] ?? 0));
  const out = new Float64Array(values.length);
  if (max === 0) return out;
  for (let i = 0; i < values.length; i++) out[i] = (values[i] ?? 0) / max;
  return out;
}

export function HydrogenPanel({ active, time, setTime, playing, setPlaying, setBounds }: PanelProps) {
  const [orbitalId, setOrbitalId] = useState("2pz");
  const [plane, setPlane] = useState<Plane>("xz");
  const [zoom, setZoom] = useState(1);
  const [weight, setWeight] = useState(0);
  const bounds = { min: 0, max: 18, rate: 2.6 };
  if (active) setBounds(bounds);

  const orbital = orbitalById(orbitalId);
  const partnerId = orbitalId === "1s" ? "2pz" : "1s";
  const partner = orbitalById(partnerId);
  const rMax = Math.max(5, (2.2 * orbital.n * orbital.n + 2) * zoom);
  const radial = useMemo(() => sampleRadial(orbital.n, orbital.l, 420), [orbital.n, orbital.l]);
  const fieldA = useMemo(
    () => samplePlaneGrid(orbital, plane, rMax, GRID),
    [orbital, plane, rMax],
  );
  const fieldB = useMemo(
    () => samplePlaneGrid(partner, plane, rMax, GRID),
    [partner, plane, rMax],
  );
  const pure = useMemo(() => {
    const out = new Float64Array(fieldA.length);
    for (let i = 0; i < fieldA.length; i++) {
      const value = fieldA[i] ?? 0;
      out[i] = value * value;
    }
    return out;
  }, [fieldA]);
  const beat = energyHartree(partner.n) - energyHartree(orbital.n);
  const density = weight <= 0.001 ? pure : mixDensity(fieldA, fieldB, weight, Math.cos(beat * time));

  let peak = 0;
  for (let i = 0; i < density.length; i++) peak = Math.max(peak, density[i] ?? 0);
  const axis = plane === "xz" ? ["x  / a₀", "z"] : plane === "xy" ? ["x  / a₀", "y"] : ["y  / a₀", "z"];
  const shells = [1, 2, 3, 4];

  return (
    <Workbench
      equation="(−½ ∇² − 1/r) ψ = E ψ"
      notes="Bound energies depend only on n: Eₙ = −1/(2n²) hartree, about −13.6 eV / n². The radial function Rₙℓ has n − ℓ − 1 nodes. The map is |ψ|² for a real orbital in one plane; the amber dot is the nucleus. ⟨r⟩ = ½ [3n² − ℓ(ℓ+1)] a₀. Mixing 1s with another orbital makes the cloud beat at the Bohr frequency."
      plot={
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <DensityMap
                density={density}
                nGrid={GRID}
                rMax={rMax}
                hLabel={axis[0] ?? "x"}
                vLabel={axis[1] ?? "z"}
                ariaLabel={`${orbital.name} probability density in the ${plane} plane`}
              />
              {peak < 1e-8 ? (
                <p className="text-xs text-muted">This orbital is zero in the {plane} plane. Switch plane.</p>
              ) : (
                <p className="text-xs text-muted">Brightness is √|ψ|². Nucleus at the origin.</p>
              )}
            </div>
            <div>
              <CurvePlot
                xMin={0}
                xMax={radial.rMax}
                curves={[
                  { xs: radial.rs, ys: peakScale(radial.P), token: PRIMARY, width: 2, fill: true },
                  { xs: radial.rs, ys: peakScale(radial.R), token: WAVE, width: 1.5 },
                ]}
                markers={[
                  { x: radial.rPeak, token: PRIMARY },
                  { x: radial.analyticR, token: WAVE },
                ]}
                yLabel="scaled"
                ariaLabel={`Radial probability for ${orbital.name}. Most probable radius ${fmt(radial.rPeak)} a0.`}
              />
              <Legend
                items={[
                  { token: PRIMARY, label: "r²R² and most probable r" },
                  { token: WAVE, label: "R(r) and ⟨r⟩" },
                ]}
              />
              <p className="mt-1 text-xs text-muted">Each radial curve is scaled to its own peak.</p>
            </div>
          </div>
        </>
      }
      controls={
        <>
          {shells.map((n) => (
            <div key={n} className="mt-2">
              <p className="text-xs tracking-wide text-muted uppercase">
                n = {n}
                <span className="ml-2 normal-case tracking-normal">{fmt(energyEV(n), 2)} eV</span>
              </p>
              <div className="mt-1">
                <ChoiceRow
                  value={orbitalId}
                  onChange={(id) => {
                    setOrbitalId(id);
                    setPlane(suggestedPlane(id));
                  }}
                  options={ORBITALS.filter((item) => item.n === n).map((item) => ({
                    id: item.id,
                    label: item.name,
                  }))}
                />
              </div>
            </div>
          ))}
          <div className="mt-3">
            <ChoiceRow
              value={plane}
              onChange={(id) => setPlane(id as Plane)}
              options={[
                { id: "xz", label: "xz plane" },
                { id: "xy", label: "xy plane" },
                { id: "yz", label: "yz plane" },
              ]}
            />
          </div>
          <Slider label="Frame zoom" min={0.55} max={1.7} step={0.01} value={zoom} display={fmt(zoom, 2)} onChange={setZoom} />
          <Slider
            label={`Weight of ${partner.name}`}
            min={0}
            max={1}
            step={0.01}
            value={weight}
            display={fmt(weight, 2)}
            onChange={setWeight}
            hint="0 is a pure orbital. The beat uses a real superposition with 1s."
          />
          <TimeBar time={time} min={bounds.min} max={bounds.max} playing={playing} onToggle={() => setPlaying(!playing)} onScrub={scrub(setPlaying, setTime)} />
          <div className="mt-3">
            <Stat label="Energy" value={`${fmt(energyHartree(orbital.n), 4)} Ha`} detail={`${fmt(energyEV(orbital.n), 3)} eV · degeneracy n² = ${orbital.n * orbital.n}`} />
            <Stat label="Quantum numbers" value={`${orbital.name}`} detail={`n = ${orbital.n}, ℓ = ${orbital.l}, radial nodes = ${orbital.n - orbital.l - 1}`} />
            <Stat label="⟨r⟩" value={`${fmt(radial.rExp, 3)} a₀`} detail={`Analytic ½[3n² − ℓ(ℓ+1)] = ${fmt(radial.analyticR, 3)} a₀`} />
            <Stat label="Most probable r" value={`${fmt(radial.rPeak, 3)} a₀`} detail={`Radial norm ∫ r²R² dr = ${fmt(radial.norm, 3)}`} />
          </div>
        </>
      }
    />
  );
}
