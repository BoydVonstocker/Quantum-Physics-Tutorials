import { useEffect, useRef, useState } from "react";

type RGB = { r: number; g: number; b: number };

function parseColor(input: string): RGB {
  const hex = input.trim();
  if (hex.startsWith("#") && hex.length === 7) {
    return {
      r: Number.parseInt(hex.slice(1, 3), 16),
      g: Number.parseInt(hex.slice(3, 5), 16),
      b: Number.parseInt(hex.slice(5, 7), 16),
    };
  }
  return { r: 16, g: 20, b: 15 };
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function DensityMap({
  density,
  nGrid,
  rMax,
  hLabel,
  vLabel,
  ariaLabel,
}: {
  density: Float64Array;
  nGrid: number;
  rMax: number;
  hLabel: string;
  vLabel: string;
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const draw = () => {
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (cssW < 8 || cssH < 8) return;
      const off = document.createElement("canvas");
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      off.width = Math.floor(cssW * dpr);
      off.height = Math.floor(cssH * dpr);
      const ctx = off.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const style = getComputedStyle(document.documentElement);
      const bg = parseColor(style.getPropertyValue("--color-bg"));
      const wave = parseColor(style.getPropertyValue("--color-wave"));
      const primary = parseColor(style.getPropertyValue("--color-primary"));
      const fg = parseColor(style.getPropertyValue("--color-fg"));
      const muted = parseColor(style.getPropertyValue("--color-muted"));

      ctx.clearRect(0, 0, cssW, cssH);
      const side = Math.min(cssW - 36, cssH - 28);
      const left = Math.max(28, (cssW - side) / 2);
      const top = 8;

      let max = 0;
      for (let i = 0; i < density.length; i++) max = Math.max(max, density[i] ?? 0);

      const grid = document.createElement("canvas");
      grid.width = nGrid;
      grid.height = nGrid;
      const gctx = grid.getContext("2d");
      if (!gctx) return;
      const image = gctx.createImageData(nGrid, nGrid);
      const data = image.data;
      for (let i = 0; i < nGrid * nGrid; i++) {
        const raw = max > 0 ? Math.sqrt((density[i] ?? 0) / max) : 0;
        const color = raw < 0.55 ? mix(bg, wave, raw / 0.55) : mix(wave, primary, (raw - 0.55) / 0.45);
        const p = i * 4;
        data[p] = color.r;
        data[p + 1] = color.g;
        data[p + 2] = color.b;
        data[p + 3] = 255;
      }
      gctx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(grid, left, top, side, side);

      const cx = left + side / 2;
      const cy = top + side / 2;
      ctx.strokeStyle = `rgba(${fg.r}, ${fg.g}, ${fg.b}, 0.28)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, cy);
      ctx.lineTo(left + side, cy);
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + side);
      ctx.stroke();
      ctx.fillStyle = `rgb(${primary.r}, ${primary.g}, ${primary.b})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "12px Outfit, sans-serif";
      ctx.fillStyle = `rgb(${muted.r}, ${muted.g}, ${muted.b})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const edge = rMax.toFixed(rMax >= 10 ? 0 : 1);
      ctx.fillText(`−${edge}`, left + 8, top + side + 6);
      ctx.fillText(hLabel, cx, top + side + 6);
      ctx.fillText(edge, left + side - 8, top + side + 6);
      ctx.save();
      ctx.translate(left - 8, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "bottom";
      ctx.fillText(vLabel, 0, 0);
      ctx.restore();

      setSrc(off.toDataURL("image/png"));
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [density, nGrid, rMax, hLabel, vLabel]);

  return (
    <div ref={wrapRef} className="relative h-80 w-full bg-bg md:h-96">
      {src ? (
        <img src={src} alt={ariaLabel} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0" role="img" aria-label={ariaLabel} />
      )}
    </div>
  );
}
