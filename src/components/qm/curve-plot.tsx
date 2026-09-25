import { useEffect, useId, useRef, useState } from "react";

export type Curve = {
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
  token: string;
  width: number;
  fill?: boolean;
  dash?: boolean;
  scale?: boolean;
};

function niceStep(span: number, count: number): number {
  const rough = span / Math.max(1, count);
  const pow = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-12)));
  const err = rough / pow;
  const mul = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  return mul * pow;
}

function ticks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const step = niceStep(max - min, count);
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.01 && out.length < 8; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  return out;
}

function px(n: number): number {
  return Math.round(n * 100) / 100;
}

function tickLabel(v: number): string {
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.01 || a >= 1000)) return v.toExponential(0);
  const s = v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2);
  return s.replace(/\.?0+$/, "") || "0";
}

function linePath(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  xTo: (x: number) => number,
  yTo: (y: number) => number,
): string {
  let d = "";
  let drawing = false;
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    const x = xs[i] ?? 0;
    const y = ys[i] ?? 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      drawing = false;
      continue;
    }
    d += `${drawing ? "L" : "M"}${xTo(x).toFixed(1)} ${yTo(y).toFixed(1)}`;
    drawing = true;
  }
  return d;
}

export function CurvePlot({
  xMin,
  xMax,
  curves,
  potential,
  markers,
  walls,
  ySymmetric = false,
  yLabel,
  ariaLabel,
}: {
  xMin: number;
  xMax: number;
  curves: Curve[];
  potential?: { xs: ArrayLike<number>; vs: ArrayLike<number> };
  markers?: { x: number; token: string }[];
  walls?: number[];
  ySymmetric?: boolean;
  yLabel?: string;
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const clipId = useId().replace(/:/g, "");
  const [size, setSize] = useState({ w: 640, h: 360 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8) return;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let yMin = 0;
  let yMax = 0;
  let seen = false;
  for (const curve of curves) {
    if (curve.scale === false) continue;
    const n = Math.min(curve.xs.length, curve.ys.length);
    for (let i = 0; i < n; i++) {
      const y = curve.ys[i] ?? 0;
      if (!Number.isFinite(y)) continue;
      if (!seen) {
        yMin = y;
        yMax = y;
        seen = true;
      } else {
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }
  }
  if (!seen) {
    yMin = -1;
    yMax = 1;
  }
  yMin = Math.min(yMin, 0);
  yMax = Math.max(yMax, 0);
  if (ySymmetric) {
    const span = Math.max(Math.abs(yMin), Math.abs(yMax), 1e-6);
    yMin = -span;
    yMax = span;
  }
  const pad = 0.08 * (yMax - yMin || 1);
  yMin -= pad;
  yMax += pad;

  const { w, h } = size;
  const left = w < 520 ? 42 : 52;
  const right = 12;
  const top = 16;
  const bottom = 28;
  const plotW = Math.max(1, w - left - right);
  const plotH = Math.max(1, h - top - bottom);
  const xTo = (x: number) => px(left + ((x - xMin) / (xMax - xMin || 1)) * plotW);
  const yTo = (y: number) => px(top + ((yMax - y) / (yMax - yMin || 1)) * plotH);
  const xTicks = ticks(xMin, xMax, w < 520 ? 4 : 6);
  const yTicks = ticks(yMin, yMax, 4);

  let potentialPath = "";
  if (potential && potential.xs.length > 1) {
    let vmax = 0;
    const n = Math.min(potential.xs.length, potential.vs.length);
    for (let i = 0; i < n; i++) vmax = Math.max(vmax, potential.vs[i] ?? 0);
    if (vmax > 0) {
      const base = top + plotH;
      const potH = plotH * 0.3;
      const parts: string[] = [`M${xTo(potential.xs[0] ?? xMin).toFixed(1)} ${base.toFixed(1)}`];
      for (let i = 0; i < n; i++) {
        const x = potential.xs[i] ?? 0;
        const v = potential.vs[i] ?? 0;
        parts.push(`L${xTo(x).toFixed(1)} ${(base - (potH * v) / vmax).toFixed(1)}`);
      }
      parts.push(`L${xTo(potential.xs[n - 1] ?? xMax).toFixed(1)} ${base.toFixed(1)} Z`);
      potentialPath = parts.join("");
    }
  }

  return (
    <div ref={wrapRef} className="relative h-80 w-full md:h-96">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <rect x={left} y={top} width={plotW} height={plotH} fill="var(--color-bg)" />
        {potentialPath ? <path d={potentialPath} fill="var(--color-primary)" fillOpacity={0.18} /> : null}
        {yTicks.map((y) => (
          <line
            key={`y-${y}`}
            x1={left}
            x2={left + plotW}
            y1={yTo(y)}
            y2={yTo(y)}
            stroke="var(--color-border)"
          />
        ))}
        {yMin < 0 && yMax > 0 ? (
          <line
            x1={left}
            x2={left + plotW}
            y1={yTo(0)}
            y2={yTo(0)}
            stroke="var(--color-fg)"
            strokeOpacity={0.45}
          />
        ) : null}
        <clipPath id={clipId}>
          <rect x={left} y={top} width={plotW} height={plotH} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {(walls ?? []).map((x) => (
            <line
              key={`wall-${x}`}
              x1={xTo(x)}
              x2={xTo(x)}
              y1={top}
              y2={top + plotH}
              stroke="var(--color-primary)"
              strokeWidth={2}
            />
          ))}
          {(markers ?? []).map((marker) => (
            <line
              key={`m-${marker.x}-${marker.token}`}
              x1={xTo(marker.x)}
              x2={xTo(marker.x)}
              y1={top}
              y2={top + plotH}
              stroke={`var(${marker.token})`}
              strokeDasharray="3 4"
            />
          ))}
          {curves.map((curve, index) => {
            const d = linePath(curve.xs, curve.ys, xTo, yTo);
            const fill = curve.fill
              ? linePath(
                  curve.xs,
                  Array.from({ length: curve.ys.length }, (_, i) => Math.max(0, curve.ys[i] ?? 0)),
                  xTo,
                  yTo,
                )
              : "";
            return (
              <g key={`${curve.token}-${index}`}>
                {fill ? (
                  <path d={`${fill} L${xTo(xMax).toFixed(1)} ${yTo(0).toFixed(1)} L${xTo(xMin).toFixed(1)} ${yTo(0).toFixed(1)} Z`} fill={`var(${curve.token})`} fillOpacity={0.16} />
                ) : null}
                <path
                  d={d}
                  fill="none"
                  stroke={`var(${curve.token})`}
                  strokeWidth={curve.width}
                  strokeDasharray={curve.dash ? "5 4" : undefined}
                />
              </g>
            );
          })}
        </g>
        {yTicks.map((y) => (
          <text
            key={`yl-${y}`}
            x={left - 6}
            y={yTo(y)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--color-muted)"
            fontSize={12}
            fontFamily="Outfit, sans-serif"
          >
            {tickLabel(y)}
          </text>
        ))}
        {xTicks.map((x) => (
          <text
            key={`xl-${x}`}
            x={xTo(x)}
            y={top + plotH + 16}
            textAnchor="middle"
            fill="var(--color-muted)"
            fontSize={12}
            fontFamily="Outfit, sans-serif"
          >
            {tickLabel(x)}
          </text>
        ))}
        {yLabel ? (
          <text x={left + 8} y={top + 16} fill="var(--color-fg)" fontSize={12} fontFamily="Outfit, sans-serif">
            {yLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
