"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  title: string;
  color?: string;
  getSamples: () => Float32Array;
}

export function Waveform({
  title,
  color = "#3b82f6",
  getSamples,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const { width, height } = canvas;
      const samples = getSamples();

      ctx.clearRect(0, 0, width, height);

      // Center line
      ctx.strokeStyle = "#64748b";
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(samples.length / width));

      for (let x = 0; x < width; x++) {
        const index = x * step;
        const sample = samples[index] ?? 0;

        const y = ((1 - sample) * height) / 2;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [color, getSamples]);

  return (
    <div className="w-full space-y-2">
      <div className="text-sm font-medium">{title}</div>

      <canvas
        ref={canvasRef}
        width={900}
        height={180}
        className="w-full rounded-lg bg-slate-950"
      />
    </div>
  );
}
