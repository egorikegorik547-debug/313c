import type { Ctx } from './art';
import type { CraftFurnId } from './items';

/** Минимум полей, нужных для рисования мебели с верстака */
export interface FurnLook {
  id: number;
  used: boolean;
  /** пауза / горение / вращение барабанов */
  cd?: number;
  /** накопления в сейфе / результат автомата */
  store?: number;
  /** ящик: заполненность 0..1 */
  fill?: number;
}

const shadow = (c: Ctx, w: number, h: number) => {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
};

const glow = (c: Ctx, x: number, y: number, r: number, col: string) => {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

const rr = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

/** Рисует мебель с центром в (0,0), размеры из определения */
export function drawCraftFurn(c: Ctx, type: CraftFurnId, w: number, h: number, f: FurnLook, t: number, lit = false) {
  switch (type) {
    case 'sofa': {
      shadow(c, w, h);
      c.fillStyle = '#3d2a24';
      rr(c, -w / 2, -h / 2, w, h, 5);
      c.fill();
      // спинка
      c.fillStyle = f.used ? '#6a4a40' : '#8a3f36';
      rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, 12, 4);
      c.fill();
      // подушки
      c.fillStyle = f.used ? '#7a5a4e' : '#a24b40';
      const n = 3;
      const cw = (w - 22) / n;
      for (let i = 0; i < n; i++) {
        rr(c, -w / 2 + 11 + i * cw + 1, -h / 2 + 12, cw - 2, h - 15, 4);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.3)';
        c.lineWidth = 1;
        c.stroke();
      }
      // подлокотники
      c.fillStyle = '#7a3028';
      rr(c, -w / 2, -h / 2 + 2, 10, h - 4, 4);
      c.fill();
      rr(c, w / 2 - 10, -h / 2 + 2, 10, h - 4, 4);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 2);
      // плед
      c.fillStyle = '#d8b44a';
      c.fillRect(w / 2 - 34, -h / 2 + 12, 20, 4);
      break;
    }
    case 'fridge': {
      shadow(c, w, h);
      c.fillStyle = '#c9ccc8';
      rr(c, -w / 2, -h / 2, w, h, 3);
      c.fill();
      c.strokeStyle = '#7a7e7c';
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = '#dfe2dd';
      c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.34);
      c.fillRect(-w / 2 + 3, -h / 2 + h * 0.4, w - 6, h * 0.56);
      c.fillStyle = '#6a6e6c';
      c.fillRect(w / 2 - 8, -h / 2 + 6, 2.5, 9);
      c.fillRect(w / 2 - 8, -h / 2 + h * 0.46, 2.5, 12);
      c.fillStyle = f.used ? '#8a8a82' : '#4a9a4a';
      c.fillRect(-w / 2 + 6, -h / 2 + 6, 3, 3);
      // магнитики
      c.fillStyle = '#c0392b';
      c.fillRect(-w / 2 + 8, -h / 2 + h * 0.52, 5, 5);
      c.fillStyle = '#3a78c0';
      c.fillRect(-w / 2 + 16, -h / 2 + h * 0.62, 5, 4);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 2);
      break;
    }
    case 'bookcase': {
      shadow(c, w, h);
      c.fillStyle = '#4a3220';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#2a1c10';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      const cols = ['#a0392e', '#3e6a8a', '#c9b052', '#5a7a3e', '#7a4a7a', '#8a8a82', '#b0602e'];
      let x = -w / 2 + 3;
      let i = 0;
      while (x < w / 2 - 6) {
        const bw = 3 + ((i * 7) % 4);
        const bh = h - 8 - ((i * 5) % 5);
        c.fillStyle = cols[i % cols.length];
        c.fillRect(x, -h / 2 + 3 + (h - 8 - bh), bw, bh);
        c.fillStyle = 'rgba(255,255,255,0.22)';
        c.fillRect(x, -h / 2 + 3 + (h - 8 - bh), bw, 1.5);
        x += bw + 0.6;
        i++;
      }
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(-w / 2, -h / 2, w, 2);
      if (!f.used) {
        // торчит бумага
        c.fillStyle = '#e8dcb0';
        c.fillRect(w / 2 - 18, -h / 2 + 2, 7, 5);
      }
      break;
    }
    case 'safe': {
      shadow(c, w, h);
      c.fillStyle = '#2a2d31';
      rr(c, -w / 2, -h / 2, w, h, 3);
      c.fill();
      c.fillStyle = '#4a5058';
      rr(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 2);
      c.fill();
      c.strokeStyle = '#1a1c1f';
      c.lineWidth = 1.2;
      c.stroke();
      // замок
      c.fillStyle = '#8a9096';
      c.beginPath();
      c.arc(2, 0, 8, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#2a2d31';
      c.lineWidth = 1.4;
      c.stroke();
      c.strokeStyle = '#d8c070';
      c.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + 0.3;
        c.beginPath();
        c.moveTo(2 + Math.cos(a) * 2, Math.sin(a) * 2);
        c.lineTo(2 + Math.cos(a) * 7, Math.sin(a) * 7);
        c.stroke();
      }
      // индикатор накоплений
      const full = (f.store ?? 0) > 0;
      c.fillStyle = full ? '#e8c050' : '#4a4e52';
      c.fillRect(-w / 2 + 7, -h / 2 + 7, 5, 3);
      c.fillStyle = '#6a7078';
      c.fillRect(-w / 2 + 6, -3, 3, 6);
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 2);
      break;
    }
    case 'ammolocker': {
      shadow(c, w, h);
      c.fillStyle = '#3c4636';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#566348';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      c.strokeStyle = '#242c20';
      c.lineWidth = 1.2;
      c.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
      c.beginPath();
      c.moveTo(0, -h / 2 + 2);
      c.lineTo(0, h / 2 - 2);
      c.stroke();
      // трафарет
      c.fillStyle = f.used ? '#8a8a70' : '#d8c070';
      for (let i = 0; i < 3; i++) {
        c.fillRect(-w / 2 + 6 + i * 4, -3, 2.4, 8);
        c.fillRect(w / 2 - 18 + i * 4, -3, 2.4, 8);
        c.beginPath();
        c.arc(-w / 2 + 7.2 + i * 4, -4.5, 1.3, 0, Math.PI * 2);
        c.arc(w / 2 - 16.8 + i * 4, -4.5, 1.3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#8a8f80';
      c.fillRect(-3.5, -2, 2, 5);
      c.fillRect(1.5, -2, 2, 5);
      break;
    }
    case 'sink': {
      shadow(c, w, h);
      c.fillStyle = '#8a8e90';
      rr(c, -w / 2, -h / 2, w, h, 4);
      c.fill();
      c.fillStyle = '#d7dcdc';
      rr(c, -w / 2 + 4, -h / 2 + 7, w - 8, h - 11, 6);
      c.fill();
      c.strokeStyle = '#6a6e70';
      c.lineWidth = 1;
      c.stroke();
      const wet = (f.cd ?? 0) > 0;
      c.fillStyle = wet ? '#6aa4d0' : '#9eb8c4';
      c.beginPath();
      c.ellipse(0, 3, w / 2 - 10, h / 2 - 9, 0, 0, Math.PI * 2);
      c.fill();
      // кран
      c.fillStyle = '#6a6e70';
      c.fillRect(-2, -h / 2 + 2, 4, 6);
      c.fillRect(-5, -h / 2 + 2, 10, 2.5);
      c.fillStyle = '#c04a3a';
      c.fillRect(-9, -h / 2 + 3, 3, 3);
      c.fillStyle = '#3a78c0';
      c.fillRect(6, -h / 2 + 3, 3, 3);
      if (wet) {
        c.fillStyle = 'rgba(150,200,240,0.85)';
        for (let i = 0; i < 3; i++) {
          const ph = (t * 2.4 + i / 3) % 1;
          c.fillRect(-0.7, -h / 2 + 8 + ph * 9, 1.4, 3);
        }
      }
      break;
    }
    case 'gym': {
      shadow(c, w, h);
      // скамья
      c.fillStyle = '#2a2d31';
      c.fillRect(-w / 2 + 6, -h / 2 + 12, w - 22, 16);
      c.fillStyle = f.used ? '#5a4a42' : '#8a3a32';
      rr(c, -w / 2 + 8, -h / 2 + 14, w - 26, 12, 3);
      c.fill();
      // стойки
      c.fillStyle = '#4a4e54';
      c.fillRect(-w / 2 + 14, -h / 2 + 4, 4, 32);
      c.fillRect(w / 2 - 28, -h / 2 + 4, 4, 32);
      // штанга
      c.fillStyle = '#9aa0a6';
      c.fillRect(-w / 2, -h / 2 + 8, w, 3);
      c.fillStyle = '#25282b';
      for (const sx of [-w / 2 + 2, -w / 2 + 8, w / 2 - 6, w / 2 - 12]) {
        c.fillRect(sx, -h / 2 + 1, 4, 17);
      }
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(-w / 2, -h / 2 + 8, w, 1);
      break;
    }
    case 'radio': {
      shadow(c, w, h);
      c.fillStyle = '#3a2a1c';
      rr(c, -w / 2, -h / 2, w, h, 3);
      c.fill();
      c.fillStyle = '#6a4a2c';
      rr(c, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 2);
      c.fill();
      // динамик
      c.fillStyle = '#2a2a26';
      c.fillRect(-w / 2 + 4, -h / 2 + 5, 11, h - 10);
      c.strokeStyle = '#6a6a60';
      c.lineWidth = 0.7;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(-w / 2 + 5, -h / 2 + 7 + i * 3);
        c.lineTo(-w / 2 + 14, -h / 2 + 7 + i * 3);
        c.stroke();
      }
      // шкала
      c.fillStyle = f.used ? '#8a8a6a' : '#e8d890';
      c.fillRect(-w / 2 + 18, -h / 2 + 5, w - 24, 6);
      c.fillStyle = '#c0392b';
      c.fillRect(-w / 2 + 20 + ((Math.sin(t * 0.8 + f.id) + 1) / 2) * (w - 30), -h / 2 + 5, 1.4, 6);
      // ручки
      c.fillStyle = '#2a2a26';
      c.beginPath();
      c.arc(-w / 2 + 22, h / 2 - 7, 3, 0, Math.PI * 2);
      c.arc(-w / 2 + 31, h / 2 - 7, 3, 0, Math.PI * 2);
      c.fill();
      // антенна
      c.strokeStyle = '#a8adb2';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(w / 2 - 4, -h / 2 + 1);
      c.lineTo(w / 2 + 6, -h / 2 - 8);
      c.stroke();
      if (!f.used) {
        c.strokeStyle = `rgba(255,220,120,${0.4 + 0.3 * Math.sin(t * 5)})`;
        c.beginPath();
        c.arc(w / 2 + 6, -h / 2 - 8, 3 + (t * 6) % 4, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    }
    case 'fireplace': {
      const burning = (f.cd ?? 0) > 0;
      shadow(c, w, h);
      // кирпичная кладка
      c.fillStyle = '#4a3028';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 1;
      for (let y = -h / 2 + 6; y < h / 2; y += 6) {
        c.beginPath();
        c.moveTo(-w / 2, y);
        c.lineTo(w / 2, y);
        c.stroke();
      }
      for (let y = -h / 2, r = 0; y < h / 2; y += 6, r++) {
        for (let x = -w / 2 + (r % 2 ? 7 : 0); x < w / 2; x += 14) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 6);
          c.stroke();
        }
      }
      c.fillStyle = '#8a6a52';
      c.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, 5);
      // топка
      c.fillStyle = '#120a06';
      c.fillRect(-w / 2 + 12, -h / 2 + 8, w - 24, h - 12);
      c.strokeStyle = '#1a0e08';
      c.lineWidth = 1.5;
      c.strokeRect(-w / 2 + 12, -h / 2 + 8, w - 24, h - 12);
      // дрова
      c.fillStyle = '#5a3a20';
      c.fillRect(-w / 2 + 16, h / 2 - 8, w - 32, 4);
      if (burning) {
        const k = Math.min(1, (f.cd ?? 0) / 20);
        for (let i = 0; i < 7; i++) {
          const fx = -w / 2 + 18 + (i * (w - 36)) / 6;
          const fh = (8 + 6 * Math.sin(t * 11 + i * 1.7)) * (0.5 + 0.5 * k);
          c.fillStyle = i % 2 ? '#ff8a2a' : '#ffb84a';
          c.beginPath();
          c.moveTo(fx - 4, h / 2 - 7);
          c.quadraticCurveTo(fx, h / 2 - 7 - fh * 1.2, fx + 4, h / 2 - 7);
          c.fill();
        }
        c.fillStyle = '#ffe48a';
        c.beginPath();
        c.ellipse(0, h / 2 - 8, 6, 3, 0, 0, Math.PI * 2);
        c.fill();
        glow(c, 0, 4, 70, `rgba(255,140,50,${0.35 + 0.08 * Math.sin(t * 12)})`);
      } else {
        c.fillStyle = '#3a2e28';
        c.fillRect(-w / 2 + 18, h / 2 - 7, w - 36, 3);
      }
      break;
    }
    case 'coffee': {
      shadow(c, w, h);
      c.fillStyle = '#25272a';
      rr(c, -w / 2, -h / 2, w, h, 4);
      c.fill();
      c.fillStyle = '#3a3d41';
      rr(c, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 3);
      c.fill();
      // колба
      c.fillStyle = 'rgba(200,220,230,0.6)';
      c.beginPath();
      c.arc(-2, 3, 8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#4a2a18';
      c.beginPath();
      c.arc(-2, 3, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#c04a3a';
      c.fillRect(w / 2 - 9, -h / 2 + 4, 4, 4);
      const hot = (f.cd ?? 0) > 0;
      if (hot) {
        c.strokeStyle = 'rgba(230,230,230,0.5)';
        c.lineWidth = 1.2;
        for (let i = 0; i < 2; i++) {
          c.beginPath();
          const ph = (t * 1.4 + i * 0.5) % 1;
          c.moveTo(-5 + i * 5, -2 - ph * 6);
          c.quadraticCurveTo(-3 + i * 5 + Math.sin(t * 5) * 2, -6 - ph * 6, -5 + i * 5, -10 - ph * 6);
          c.stroke();
        }
      }
      break;
    }
    case 'slots': {
      shadow(c, w, h);
      c.fillStyle = '#6a1e26';
      rr(c, -w / 2, -h / 2, w, h, 4);
      c.fill();
      c.fillStyle = '#a82e3a';
      rr(c, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 3);
      c.fill();
      // окошко барабанов
      c.fillStyle = '#17120e';
      c.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, 14);
      const symbols = ['🍒', '7', '★', '♦'];
      const spin = (f.cd ?? 0) > 0;
      const res = f.store ?? 0;
      c.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const rx = -w / 2 + 5 + (i * (w - 10)) / 3;
        c.fillStyle = '#efe6cc';
        c.fillRect(rx + 1, -h / 2 + 6, (w - 10) / 3 - 2, 12);
        let sym = symbols[(i + res) % 4];
        if (res === 3) sym = '7';
        if (res === 2) sym = '★';
        if (spin) sym = symbols[Math.floor(t * 14 + i * 2) % 4];
        c.fillStyle = sym === '7' ? '#c0392b' : '#25282b';
        c.fillText(sym, rx + (w - 10) / 6, -h / 2 + 12.5);
      }
      c.textBaseline = 'alphabetic';
      // огоньки
      for (let i = 0; i < 6; i++) {
        c.fillStyle = Math.floor(t * (spin ? 10 : 2) + i) % 2 ? '#ffd860' : '#7a5a20';
        c.beginPath();
        c.arc(-w / 2 + 6 + i * ((w - 12) / 5), -h / 2 + 22, 1.5, 0, Math.PI * 2);
        c.fill();
      }
      // рычаг
      c.fillStyle = '#8a9096';
      c.fillRect(w / 2, -4, 3, 10);
      c.fillStyle = '#e03a2a';
      c.beginPath();
      c.arc(w / 2 + 1.5, spin ? 6 : -6, 3.4, 0, Math.PI * 2);
      c.fill();
      // кнопки
      c.fillStyle = '#e8c050';
      c.fillRect(-w / 2 + 6, h / 2 - 8, 8, 4);
      c.fillRect(-w / 2 + 16, h / 2 - 8, 8, 4);
      if (res === 3 && !spin) glow(c, 0, 0, 30, `rgba(255,220,100,${0.3 + 0.2 * Math.sin(t * 9)})`);
      break;
    }
    case 'shower': {
      shadow(c, w, h);
      c.fillStyle = '#9aa4aa';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#c9d6dc';
      c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      c.strokeStyle = 'rgba(80,100,110,0.5)';
      c.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        c.beginPath();
        c.moveTo(-w / 2 + 3 + (i * (w - 6)) / 5, -h / 2 + 3);
        c.lineTo(-w / 2 + 3 + (i * (w - 6)) / 5, h / 2 - 3);
        c.stroke();
      }
      // слив и лейка
      c.fillStyle = '#4a4e52';
      c.beginPath();
      c.arc(0, 0, 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6a6e72';
      c.beginPath();
      c.arc(0, 0, 9, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#2a2d31';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#25282b';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.fillRect(Math.cos(a) * 5 - 0.6, Math.sin(a) * 5 - 0.6, 1.2, 1.2);
      }
      if ((f.cd ?? 0) > 0) {
        c.fillStyle = 'rgba(160,210,245,0.8)';
        for (let i = 0; i < 14; i++) {
          const a = i * 2.4;
          const ph = (t * 1.8 + i * 0.37) % 1;
          const rad = ph * 15;
          c.fillRect(Math.cos(a) * rad, Math.sin(a) * rad, 1.4, 1.4);
        }
        c.fillStyle = 'rgba(200,230,250,0.2)';
        c.beginPath();
        c.arc(0, 0, 16, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'planter': {
      shadow(c, w, h);
      c.fillStyle = '#4a3220';
      c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = '#2a1c12';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      c.fillStyle = '#3a2a1c';
      c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      const grown = !f.used;
      for (let i = 0; i < 7; i++) {
        const px = -w / 2 + 8 + (i * (w - 16)) / 6;
        for (let j = 0; j < 2; j++) {
          const py = -h / 2 + 8 + j * 12;
          c.fillStyle = grown ? '#4c8a3a' : '#5a6a3a';
          c.beginPath();
          c.arc(px + (j ? 3 : 0), py, grown ? 4.2 : 2.4, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = grown ? '#7ac058' : '#6a7a48';
          c.beginPath();
          c.arc(px + (j ? 3 : 0) - 1, py - 1, grown ? 2.4 : 1.2, 0, Math.PI * 2);
          c.fill();
          if (grown && (i + j) % 3 === 0) {
            c.fillStyle = '#d84a3a';
            c.beginPath();
            c.arc(px + (j ? 3 : 0) + 2, py + 2, 1.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
      // лампа-фитолампа
      c.fillStyle = 'rgba(210,120,220,0.1)';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      break;
    }
    case 'crate_s':
    case 'crate_m':
    case 'crate_l': {
      shadow(c, w, h);
      const big = type === 'crate_l';
      const mid = type === 'crate_m';
      const base = big ? '#59603f' : mid ? '#7a5632' : '#9a7444';
      const dark = big ? '#2f3520' : mid ? '#4a321a' : '#654a28';
      const light = big ? '#7a8258' : mid ? '#a47a44' : '#c29a5a';
      c.fillStyle = dark;
      rr(c, -w / 2, -h / 2, w, h, 2);
      c.fill();
      // доски крышки
      const n = big ? 5 : mid ? 4 : 3;
      const ph = (h - 4) / n;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i % 2 ? base : light;
        c.fillRect(-w / 2 + 2, -h / 2 + 2 + i * ph, w - 4, ph - 1);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        c.fillRect(-w / 2 + 2, -h / 2 + 2 + (i + 1) * ph - 1, w - 4, 1);
      }
      // металлическая окантовка
      c.fillStyle = big ? '#2a2d1f' : '#4a4e53';
      c.fillRect(-w / 2 + 2, -h / 2 + 2, 4, h - 4);
      c.fillRect(w / 2 - 6, -h / 2 + 2, 4, h - 4);
      if (mid || big) {
        c.fillRect(-w / 2 + 2, -2, w - 4, 4);
      }
      c.fillStyle = '#b6bbc0';
      for (const yy of [-h / 2 + 5, h / 2 - 5]) {
        c.fillRect(-w / 2 + 3.5, yy - 0.8, 1.6, 1.6);
        c.fillRect(w / 2 - 5, yy - 0.8, 1.6, 1.6);
      }
      // замок
      c.fillStyle = '#d8b44a';
      rr(c, -3, -3, 6, 6, 1);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.lineWidth = 0.8;
      c.stroke();
      if (big) {
        c.fillStyle = '#d8d070';
        c.fillRect(-w / 2 + 10, -h / 2 + 5, 16, 2);
        c.fillRect(-w / 2 + 10, -h / 2 + 8.5, 10, 1.5);
      }
      // индикатор наполнения
      const fl = f.fill ?? 0;
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(w / 2 - 22, h / 2 - 8, 16, 4);
      c.fillStyle = fl > 0.85 ? '#e0603a' : fl > 0 ? '#8fd070' : '#555';
      c.fillRect(w / 2 - 21.5, h / 2 - 7.5, Math.max(fl > 0 ? 1.5 : 0, 15 * fl), 3);
      c.strokeStyle = 'rgba(0,0,0,0.7)';
      c.lineWidth = 1;
      rr(c, -w / 2, -h / 2, w, h, 2);
      c.stroke();
      break;
    }
    case 'floorlamp': {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath();
      c.ellipse(2, 3, 9, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3a3028';
      c.beginPath();
      c.arc(0, 0, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#e0c690';
      c.beginPath();
      c.arc(0, 0, 8, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(120,80,40,0.55)';
      c.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
        c.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        c.stroke();
      }
      c.fillStyle = '#fff3c8';
      c.beginPath();
      c.arc(0, 0, 3, 0, Math.PI * 2);
      c.fill();
      if (lit) glow(c, 0, 0, 34, 'rgba(255,220,150,0.35)');
      break;
    }
  }
}
