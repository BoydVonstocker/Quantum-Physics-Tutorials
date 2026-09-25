import type { ReactNode } from "react";
import { useId } from "react";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block py-1">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-fg">{label}</span>
        <span className="font-display text-base text-primary tabular-nums">{display}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border-t border-border py-2.5 first:border-t-0">
      <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
      <div className="font-display text-xl leading-tight text-fg tabular-nums">{value}</div>
      {detail ? <p className="text-xs text-muted">{detail}</p> : null}
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { token: string; label: string }[];
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs text-muted">
          <span
            className="inline-block h-0.5 w-6"
            style={{ background: `var(${item.token})` }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border border-border">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={
              on
                ? "min-h-11 flex-1 bg-primary px-3 text-sm text-primary-fg"
                : "min-h-11 flex-1 bg-surface px-3 text-sm text-fg"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TimeBar({
  time,
  min,
  max,
  playing,
  onToggle,
  onScrub,
}: {
  time: number;
  min: number;
  max: number;
  playing: boolean;
  onToggle: () => void;
  onScrub: (time: number) => void;
}) {
  return (
    <div className="mt-2">
      <Slider
        label="Time t"
        min={min}
        max={max}
        step={(max - min) / 400}
        value={Math.min(max, Math.max(min, time))}
        display={time.toFixed(2)}
        onChange={onScrub}
        hint="Global phase e^{−iEt/ℏ}, or a real beat if several energies are mixed."
      />
      <button
        type="button"
        onClick={onToggle}
        className="mt-1 min-h-11 w-full border border-border bg-surface-2 text-sm text-fg"
      >
        {playing ? "Pause" : "Play time"}
      </button>
    </div>
  );
}

export function Workbench({
  equation,
  plot,
  controls,
  notes,
}: {
  equation: string;
  plot: ReactNode;
  controls: ReactNode;
  notes: string;
}) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <section className="min-w-0 border border-border bg-surface p-3 md:p-4 lg:col-span-2">
        <p className="font-display text-lg leading-tight text-fg">{equation}</p>
        <div className="mt-3">{plot}</div>
      </section>
      <aside className="min-w-0 border border-border bg-surface p-3 md:p-4">{controls}</aside>
      <p className="text-sm text-muted lg:col-span-3">{notes}</p>
    </div>
  );
}

export function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={
              on
                ? "min-h-11 border border-primary bg-primary px-3 text-sm text-primary-fg"
                : "min-h-11 border border-border bg-surface-2 px-3 text-sm text-fg"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
