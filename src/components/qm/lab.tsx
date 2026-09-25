import { useEffect, useRef, useState, type ReactElement } from "react";
import { Activity, Atom, Box, Columns2, Download, UnfoldHorizontal, Waves } from "lucide-react";
import {
  BarrierPanel,
  FinitePanel,
  FreePanel,
  HydrogenPanel,
  InfinitePanel,
  OscillatorPanel,
  type Bounds,
  type PanelProps,
} from "@/components/qm/panels";

const SYSTEMS = [
  { id: "free", label: "Free particle", icon: Waves },
  { id: "infinite", label: "Infinite well", icon: Box },
  { id: "finite", label: "Finite well", icon: Columns2 },
  { id: "barrier", label: "Barrier", icon: UnfoldHorizontal },
  { id: "oscillator", label: "Oscillator", icon: Activity },
  { id: "hydrogen", label: "Hydrogen", icon: Atom },
] as const;

type SystemId = (typeof SYSTEMS)[number]["id"];

const PANELS: Record<SystemId, (props: PanelProps) => ReactElement> = {
  free: FreePanel,
  infinite: InfinitePanel,
  finite: FinitePanel,
  barrier: BarrierPanel,
  oscillator: OscillatorPanel,
  hydrogen: HydrogenPanel,
};

export function Lab() {
  const [system, setSystem] = useState<SystemId>("free");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const boundsRef = useRef<Bounds>({ min: -12, max: 30, rate: 2.4 });

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { min, max, rate } = boundsRef.current;
      const span = max - min;
      setTime((current) => {
        if (span <= 0) return current;
        let next = current + dt * rate;
        while (next > max) next -= span;
        while (next < min) next += span;
        return next;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const shared = {
    time,
    setTime,
    playing,
    setPlaying,
    setBounds: (bounds: Bounds) => {
      boundsRef.current = bounds;
    },
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs tracking-widest text-primary uppercase">
            <span className="font-display text-2xl leading-none normal-case tracking-normal" aria-hidden="true">
              ψ
            </span>
            Introductory quantum mechanics
          </p>
          <h1 className="mt-1 font-display text-4xl leading-tight text-fg md:text-5xl">Eigenlab</h1>
          <p className="mt-2 text-sm text-muted">
            Closed-form wavefunctions from the free particle to hydrogen, plus the finite well’s
            bound-state condition and the barrier’s scattering amplitudes. Units ℏ = 1, m = 1.
            Hydrogen is in Bohr units.
          </p>
        </div>
        <a
          href="/eigenlab.py"
          download
          className="inline-flex min-h-11 items-center gap-2 border border-border bg-surface px-4 text-sm text-fg"
        >
          <Download className="size-4" aria-hidden="true" />
          Python solver
        </a>
      </header>

      <div role="tablist" aria-label="Quantum systems" className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {SYSTEMS.map((item) => {
          const on = item.id === system;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setSystem(item.id);
                setTime(0);
                setPlaying(false);
              }}
              className={
                on
                  ? "inline-flex min-h-11 shrink-0 items-center gap-2 bg-primary px-4 text-sm text-primary-fg"
                  : "inline-flex min-h-11 shrink-0 items-center gap-2 border border-border bg-surface px-4 text-sm text-fg"
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {SYSTEMS.map((item) => {
        const Panel = PANELS[item.id];
        const on = item.id === system;
        return (
          <div key={item.id} className={on ? undefined : "hidden"} hidden={!on}>
            <Panel active={on} {...shared} />
          </div>
        );
      })}
    </main>
  );
}
