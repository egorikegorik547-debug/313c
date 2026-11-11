import { useEffect, useRef } from 'react';
import { drawFurn } from '../game/basement';
import { FURN, type CraftFurnId } from '../game/items';

/** Живое превью мебели в верстаке (с анимацией: огонь, барабаны, пар) */
export function FurniturePreview({ id, width = 330, height = 110 }: { id: CraftFurnId; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const def = FURN[id];
    const draw = (tm: number) => {
      const t = tm / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#2a2925');
      bg.addColorStop(1, '#121210');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const k = Math.min(2.6, (width * 0.55) / def.w, (height * 0.7) / def.h);
      // демонстрация «рабочего» состояния
      const spin = id === 'slots' ? (t % 3 < 1.2 ? 1 : 0) : 0;
      const active = ['fireplace', 'coffee', 'shower', 'sink'].includes(id) ? 30 : spin;
      ctx.save();
      ctx.translate(width / 2, height / 2 + 2);
      ctx.scale(k, k);
      drawFurn(ctx, { id: -1, type: id, x: 0, y: 0, rot: 0, used: false, cd: active, store: id === 'slots' ? 2 : 0 }, t, id === 'floorlamp');
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,160,90,0.25)';
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [id, width, height]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}
