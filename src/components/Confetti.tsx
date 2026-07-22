"use client";

import { useEffect, useRef } from "react";

/** Self-contained canvas confetti burst — no dependencies. Fires once. */
export function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);
    const colors = ["#ffd343", "#d4af37", "#12945a", "#7fe0ac", "#ffffff"];
    const N = 120;
    const parts = Array.from({ length: N }, () => ({
      x: w / 2,
      y: h * 0.3,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (Math.random() - 1.1) * 14 * dpr,
      r: (3 + Math.random() * 4) * dpr,
      c: colors[(Math.random() * colors.length) | 0],
      a: 1,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));

    let frame = 0;
    let raf = 0;
    const g = 0.32 * dpr;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;
      for (const p of parts) {
        p.vy += g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.a = Math.max(0, 1 - frame / 110);
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
        ctx.restore();
      }
      if (frame < 115) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}
