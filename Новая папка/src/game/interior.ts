import { ColliderGrid, CENTER, DAY_RADIUS, NIGHT_RADIUS, type Access, type Collider, type Rect } from './world';
import { mulberry32 } from './rng';
import { drawBrick, drawChunk, drawCrack, drawGrass, drawVine } from './art';
import type { Enemy, Game, Pickup } from './engine';
import type { EnemyType } from './enemies';
import type { CrateKind, LootCrate } from './expedition';
import { drawDarkness, type Light } from './lighting';
import { sfx } from './audio';
import type { Ctx } from './art';

/* ------------------------------------------------------------------ */
/* Второй этаж и подвалы домов: отдельные тёмные комнаты              */
/* ------------------------------------------------------------------ */
export const ROOM_CELLAR: Rect = { x: 140, y: 140, w: 900, h: 560 };
/** Второй этаж — развалина из нескольких комнат, соединённых проёмами */
export const ROOM_UPPER: Rect = { x: 140, y: 140, w: 680, h: 440 };
export const roomOf = (kind: 'upper' | 'cellar'): Rect => (kind === 'upper' ? ROOM_UPPER : ROOM_CELLAR);
const WALL = 26;

export type Variant = 'zombies' | 'rats' | 'bandits' | 'quiet';

export interface Prop {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'table' | 'bed' | 'wardrobe' | 'sofa' | 'barrel' | 'stack' | 'shelf' | 'pillar';
  ruined?: boolean;
}

export interface Door extends Rect {
  /** проём в горизонтальной стене */
  horiz: boolean;
}

/** Ширина дверного проёма: свободно проходит игрок и враги */
const DOOR = 112;

export interface WallPiece extends Rect {
  /** обрушенный кусок: груда кирпича вместо стены */
  low?: boolean;
}

export interface Interior {
  id: number;
  kind: 'upper' | 'cellar';
  variant: Variant;
  access: Access;
  grid: ColliderGrid;
  walls: WallPiece[];
  holes: Rect[];
  /** дверные проёмы между комнатами второго этажа */
  doors: Door[];
  shafts: { x: number; y: number; r: number }[];
  props: Prop[];
  lamps: { x: number; y: number }[];
  exit: { x: number; y: number };
  spawn: { x: number; y: number };
  enemies: Enemy[];
  pickups: Pickup[];
  crates: LootCrate[];
  ambushed: boolean;
  populated: boolean;
  seed: number;
  seen: boolean;
}

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const hit = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/** Разбивает стену на куски; часть кусков «обрушена» */
function ruinedPieces(r: ReturnType<typeof mulberry32>, x: number, y: number, len: number, horiz: boolean, thick: number, lowChance: number): WallPiece[] {
  const out: WallPiece[] = [];
  let a = 0;
  while (a < len - 4) {
    const seg = Math.min(len - a, r.range(44, 110));
    const low = r.chance(lowChance);
    out.push(horiz ? { x: x + a, y, w: seg, h: thick, low } : { x, y: y + a, w: thick, h: seg, low });
    a += seg;
  }
  return out;
}

export function buildInterior(g: Game, ac: Access): Interior {
  const r = mulberry32(ac.seed ^ (g.day * 7919) ^ 0x1234567);
  const R = roomOf(ac.kind);
  const upper = ac.kind === 'upper';
  const walls: WallPiece[] = upper
    ? [
        ...ruinedPieces(r, R.x - WALL, R.y - WALL, R.w + WALL * 2, true, WALL, 0.34),
        ...ruinedPieces(r, R.x - WALL, R.y + R.h, R.w + WALL * 2, true, WALL, 0.3),
        ...ruinedPieces(r, R.x - WALL, R.y, R.h, false, WALL, 0.3),
        ...ruinedPieces(r, R.x + R.w, R.y, R.h, false, WALL, 0.34),
      ]
    : [
        rect(R.x - WALL, R.y - WALL, R.w + WALL * 2, WALL),
        rect(R.x - WALL, R.y + R.h, R.w + WALL * 2, WALL),
        rect(R.x - WALL, R.y, WALL, R.h),
        rect(R.x + R.w, R.y, WALL, R.h),
      ];
  const exit = { x: R.x + 58, y: R.y + R.h - 56 };
  const spawn = { x: exit.x + 52, y: exit.y - 18 };
  const keepClear = rect(exit.x - 70, exit.y - 90, 190, 150);

  // перегородки (второй этаж — комнаты с проёмами, подвал — коридоры)
  const doors: Door[] = [];
  /** Стена с дверным проёмом: куски рядом с проёмом всегда целые (косяки) */
  const partition = (x: number, y: number, len: number, horiz: boolean, gapAt: number, lowChance: number) => {
    const thick = 16;
    const a = ruinedPieces(r, x, y, gapAt, horiz, thick, lowChance);
    const bs = gapAt + DOOR;
    const b = ruinedPieces(r, horiz ? x + bs : x, horiz ? y : y + bs, len - bs, horiz, thick, lowChance);
    if (a.length) a[a.length - 1].low = false;
    if (b.length) b[0].low = false;
    walls.push(...a, ...b);
    doors.push({ ...(horiz ? rect(x + gapAt, y, DOOR, thick) : rect(x, y + gapAt, thick, DOOR)), horiz });
  };
  if (upper) {
    // вертикальная перегородка делит этаж на левую и правую половины
    const px = Math.round(R.x + R.w * r.range(0.4, 0.54));
    const hasLeft = r.chance(0.8);
    const pyR = Math.round(R.y + R.h * r.range(0.4, 0.6));
    const pyL = Math.round(R.y + R.h * r.range(0.4, 0.5));
    // проём вертикальной стены — целиком выше или целиком ниже горизонтальных стен,
    // чтобы они не упирались в середину прохода
    const lo = Math.min(pyR, hasLeft ? pyL : pyR) - 8;
    const hi = Math.max(pyR, hasLeft ? pyL : pyR) + 8;
    const above: [number, number] = [R.y + 36, lo - 14 - DOOR];
    const below: [number, number] = [hi + 14, R.y + R.h - 36 - DOOR];
    const okA = above[1] >= above[0];
    const okB = below[1] >= below[0];
    const pickB = okB && (!okA || r.chance(0.5));
    const rng = pickB ? below : above;
    const gy = Math.round(rng[0] + r.next() * Math.max(0, rng[1] - rng[0]));
    partition(px - 8, R.y, R.h, false, gy - R.y, 0.3);
    // правая половина: ещё одна комната с проходом
    {
      const room = R.x + R.w - (px + 8);
      const gx = Math.round(px + 8 + 36 + r.next() * Math.max(0, room - 72 - DOOR));
      partition(px + 8, pyR - 8, room, true, gx - (px + 8), 0.3);
    }
    // левая половина: верхняя комната отделена от прихожей с лестницей
    if (hasLeft) {
      const room = px - 8 - R.x;
      const gx = Math.round(R.x + 30 + r.next() * Math.max(0, room - 60 - DOOR));
      partition(R.x, pyL - 8, room, true, gx - R.x, 0.3);
    }
  } else {
    const n = r.int(2, 3);
    for (let i = 0; i < n; i++) {
      const x = R.x + 190 + (i * (R.w - 300)) / n + r.range(-30, 30);
      const fromTop = r.chance(0.5);
      const len = r.range(170, 270);
      walls.push(rect(x, fromTop ? R.y : R.y + R.h - len, 18, len));
    }
  }
  // зоны перед проёмами: мусор, мебель и провалы сюда не попадают
  const doorClear: Rect[] = doors.map((d) => (d.horiz ? rect(d.x - 8, d.y - 62, d.w + 16, d.h + 124) : rect(d.x - 62, d.y - 8, d.w + 124, d.h + 16)));
  const blockedByDoor = (b: Rect) => doorClear.some((z) => hit(b, z));
  const cols: Collider[] = walls.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h, type: 'wall' as const }));

  // обвалы пола и груды обломков
  const holes: Rect[] = [];
  const holeCols = new Map<Collider, Rect>();
  const rubbleCols = new Set<Collider>();
  const propCols = new Map<Collider, Prop>();
  if (upper) {
    const nh = r.int(1, 2);
    for (let i = 0; i < nh; i++) {
      for (let t = 0; t < 30; t++) {
        const w = r.range(66, 108);
        const h = r.range(48, 78);
        const b = rect(Math.round(R.x + 30 + r.next() * (R.w - w - 60)), Math.round(R.y + 30 + r.next() * (R.h - h - 60)), Math.round(w), Math.round(h));
        if (hit(b, keepClear) || blockedByDoor(b) || walls.some((q) => hit(b, q, 40)) || holes.some((q) => hit(b, q, 40))) continue;
        holes.push(b);
        // провал мешает ходить, но не мешает стрелять
        const hc: Collider = { ...b, type: 'tree' };
        cols.push(hc);
        holeCols.set(hc, b);
        break;
      }
    }
    const nr = r.int(3, 5);
    for (let i = 0; i < nr; i++) {
      for (let t = 0; t < 30; t++) {
        const sz = r.range(36, 54);
        const b = rect(Math.round(R.x + 24 + r.next() * (R.w - sz - 48)), Math.round(R.y + 24 + r.next() * (R.h - sz - 48)), Math.round(sz), Math.round(sz * 0.85));
        if (hit(b, keepClear) || blockedByDoor(b) || walls.some((q) => hit(b, q, 28)) || holes.some((q) => hit(b, q, 24))) continue;
        const rc: Collider = { ...b, type: 'rubble' };
        cols.push(rc);
        rubbleCols.add(rc);
        break;
      }
    }
  }

  // мебель / бочки
  const props: Prop[] = [];
  const defs: [Prop['kind'], number, number][] = upper
    ? [['bed', 84, 46], ['table', 64, 42], ['wardrobe', 46, 78], ['sofa', 92, 40], ['shelf', 80, 24]]
    : [['barrel', 26, 26], ['barrel', 26, 26], ['stack', 40, 40], ['stack', 40, 40], ['shelf', 84, 24], ['pillar', 30, 30], ['pillar', 30, 30], ['pillar', 30, 30], ['barrel', 26, 26], ['stack', 48, 36]];
  const skip = upper ? 2 : 0;
  const order = defs.map((d, i) => ({ d, k: r.next() + i * 0 })).sort((a, b) => a.k - b.k).slice(skip).map((q) => q.d);
  for (const [kind, w, h] of order) {
    for (let t = 0; t < 30; t++) {
      const b = rect(Math.round(R.x + 20 + r.next() * (R.w - w - 40)), Math.round(R.y + 20 + r.next() * (R.h - h - 40)), w, h);
      if (hit(b, keepClear) || (upper && blockedByDoor(b)) || walls.some((q) => hit(b, q, 46)) || props.some((q) => hit(b, q, 34)) || holes.some((q) => hit(b, q, 30)) || cols.some((q) => q.type === 'rubble' && hit(b, q, 16))) continue;
      const pr: Prop = { ...b, kind, ruined: upper };
      props.push(pr);
      const pc: Collider = { ...b, type: 'prop' };
      cols.push(pc);
      propCols.set(pc, pr);
      break;
    }
  }
  const grid = new ColliderGrid(cols);

  const free = (x: number, y: number, rad: number) => x > R.x + 30 && y > R.y + 30 && x < R.x + R.w - 30 && y < R.y + R.h - 30 && !grid.circleBlocked(x, y, rad);
  const spot = (minFromSpawn: number, rad = 30) => {
    for (let t = 0; t < 80; t++) {
      const x = R.x + 40 + r.next() * (R.w - 80);
      const y = R.y + 40 + r.next() * (R.h - 80);
      if (Math.hypot(x - spawn.x, y - spawn.y) < minFromSpawn) continue;
      if (!free(x, y, rad)) continue;
      return { x, y };
    }
    return null;
  };

  // лампы (в руинах почти ничего не горит — свет даёт луна через дыры в крыше)
  const lamps: { x: number; y: number }[] = [];
  const nl = upper ? (r.chance(0.5) ? 1 : 0) : r.int(1, 2);
  for (let i = 0; i < nl; i++) {
    const s = spot(100, 16);
    if (s) lamps.push(s);
  }
  const shafts: { x: number; y: number; r: number }[] = [];
  if (upper) {
    const ns = r.int(2, 3);
    for (let i = 0; i < ns; i++) shafts.push({ x: R.x + 60 + r.next() * (R.w - 120), y: R.y + 50 + r.next() * (R.h - 150), r: r.range(34, 58) });
  }

  // вариант содержимого
  const q = r.next();
  const variant: Variant =
    upper ? (q < 0.55 ? 'zombies' : q < 0.85 ? 'bandits' : 'quiet') : q < 0.4 ? 'rats' : q < 0.7 ? 'zombies' : 'bandits';

  // ящики
  const crates: LootCrate[] = [];
  const mk = (kind: CrateKind) => {
    const s = spot(upper ? 120 : 150, 34);
    if (!s) return;
    crates.push({ id: g.nextId++, x: s.x, y: s.y, kind, opened: false, prog: 0, rot: (r.next() - 0.5) * 0.9 });
  };
  if (upper) {
    mk(r.pick<CrateKind>(['wood', 'wood', 'suitcase', 'cooler']));
    mk(r.pick<CrateKind>(['medical', 'tools', 'electronics', 'suitcase', 'ammo']));
    if (r.chance(0.35)) mk(r.pick<CrateKind>(['metal', 'fuel', 'chemical']));
    if (r.chance(variant === 'bandits' ? 0.7 : 0.3)) mk(r.pick<CrateKind>(['military', 'ammo']));
  } else {
    mk(r.pick<CrateKind>(['metal', 'fuel', 'chemical']));
    mk(r.pick<CrateKind>(['tools', 'metal', 'medical', 'electronics']));
    if (r.chance(variant === 'bandits' ? 0.9 : 0.55)) mk(r.pick<CrateKind>(['military', 'ammo']));
    if (r.chance(0.4)) mk(r.pick<CrateKind>(['wood', 'fuel']));
  }

  // --- проверка проходимости: из лестницы можно дойти до каждого проёма и каждого ящика ---
  if (upper) {
    const STEP = 12;
    const gw = Math.ceil(R.w / STEP);
    const gh = Math.ceil(R.h / STEP);
    const cellOf = (x: number, y: number) => {
      const i = Math.floor((x - R.x) / STEP);
      const j = Math.floor((y - R.y) / STEP);
      return i < 0 || j < 0 || i >= gw || j >= gh ? -1 : j * gw + i;
    };
    const reach = () => {
      const seen = new Uint8Array(gw * gh);
      const free = new Uint8Array(gw * gh);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) free[j * gw + i] = grid.circleBlocked(R.x + i * STEP + STEP / 2, R.y + j * STEP + STEP / 2, 14) ? 0 : 1;
      const flood = (from: number, mark: Uint8Array) => {
        const q: number[] = [from];
        mark[from] = 1;
        for (let h = 0; h < q.length; h++) {
          const c = q[h];
          const ci = c % gw;
          const cj = (c - ci) / gw;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = ci + di;
            const nj = cj + dj;
            if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
            const n = nj * gw + ni;
            if (mark[n] || !free[n]) continue;
            mark[n] = 1;
            q.push(n);
          }
        }
        return q;
      };
      flood(cellOf(spawn.x, spawn.y), seen);
      return { seen, free, flood };
    };
    /** Недоступная точка: крупный свободный карман, куда не дойти от лестницы, или ящик */
    const lost = (rc: ReturnType<typeof reach>): { x: number; y: number } | null => {
      for (const c of crates) {
        const k = cellOf(c.x, c.y);
        if (k >= 0 && rc.free[k] && !rc.seen[k]) return { x: c.x, y: c.y };
      }
      const mark = new Uint8Array(gw * gh);
      for (let k = 0; k < gw * gh; k++) {
        if (!rc.free[k] || rc.seen[k] || mark[k]) continue;
        const pocket = rc.flood(k, mark);
        if (pocket.length > 40) {
          const ci = k % gw;
          const cj = (k - ci) / gw;
          return { x: R.x + ci * STEP, y: R.y + cj * STEP };
        }
      }
      return null;
    };
    for (let guard = 0; guard < 24; guard++) {
      const t = lost(reach());
      if (!t) break;
      // убираем ближайшее к недоступной точке препятствие (мебель, груда, провал)
      let best: Collider | null = null;
      let bd = Infinity;
      for (const c of [...propCols.keys(), ...holeCols.keys(), ...rubbleCols]) {
        const d = Math.hypot(c.x + c.w / 2 - t.x, c.y + c.h / 2 - t.y);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (!best) break;
      grid.remove(best);
      const pr = propCols.get(best);
      if (pr) props.splice(props.indexOf(pr), 1);
      const hl = holeCols.get(best);
      if (hl) holes.splice(holes.indexOf(hl), 1);
      propCols.delete(best);
      holeCols.delete(best);
      rubbleCols.delete(best);
    }
  }

  return {
    id: ac.id,
    kind: ac.kind,
    variant,
    access: ac,
    grid,
    walls,
    holes,
    doors,
    shafts,
    props,
    lamps,
    exit,
    spawn,
    enemies: [],
    pickups: [],
    crates,
    ambushed: false,
    populated: false,
    seed: ac.seed,
    seen: false,
  };
}

/** Расставляет врагов (вызывать, когда g.enemies уже указывает на список комнаты) */
export function populateInterior(g: Game, it: Interior) {
  it.populated = true;
  const r = mulberry32(it.seed ^ (g.day * 104729));
  const R = roomOf(it.kind);
  const spot = (minFromSpawn: number, rad: number) => {
    for (let t = 0; t < 80; t++) {
      const x = R.x + 50 + r.next() * (R.w - 100);
      const y = R.y + 50 + r.next() * (R.h - 100);
      if (Math.hypot(x - it.spawn.x, y - it.spawn.y) < minFromSpawn) continue;
      if (it.grid.circleBlocked(x, y, rad)) continue;
      return { x, y };
    }
    return null;
  };
  const add = (type: EnemyType, x: number, y: number) => {
    const e = g.spawnOne(type, x, y, true);
    e.wander = true;
    e.wa = r.next() * 6.28;
    return e;
  };
  const dayBonus = Math.min(3, Math.floor(g.day / 3));
  if (it.variant === 'zombies') {
    const n = (it.kind === 'cellar' ? 4 : 2) + Math.min(it.kind === 'cellar' ? 3 : 2, dayBonus) + r.int(0, 1);
    for (let i = 0; i < n; i++) {
      const s = spot(it.kind === 'cellar' ? 280 : 220, 24);
      if (!s) continue;
      const t: EnemyType = r.chance(0.2) ? 'runner' : r.chance(0.12) ? 'crawler' : 'walker';
      add(t, s.x, s.y);
    }
  } else if (it.variant === 'rats') {
    const n = r.int(7, 10) + dayBonus;
    const s0 = spot(300, 20);
    for (let i = 0; i < n; i++) {
      const s = i % 3 === 0 || !s0 ? spot(260, 12) : { x: s0.x + r.range(-60, 60), y: s0.y + r.range(-60, 60) };
      if (!s || it.grid.circleBlocked(s.x, s.y, 10)) continue;
      add('rat', s.x, s.y);
    }
    if (r.chance(0.4)) {
      const s = spot(320, 24);
      if (s) add('walker', s.x, s.y);
    }
  } else if (it.variant === 'bandits') {
    const n = 2 + Math.min(it.kind === 'cellar' ? 3 : 1, dayBonus) + r.int(0, 1);
    for (let i = 0; i < n; i++) {
      const s = spot(it.kind === 'cellar' ? 300 : 230, 24);
      if (!s) continue;
      const e = add('bandit', s.x, s.y);
      e.home = { x: s.x, y: s.y };
      e.ambush = true;
    }
  } else if (r.chance(0.5)) {
    const s = spot(it.kind === 'cellar' ? 320 : 240, 24);
    if (s) add('walker', s.x, s.y);
  }
}

/** Логика комнаты: засада */
export function updateInterior(g: Game, it: Interior) {
  if (it.ambushed) return;
  let trig = false;
  for (const e of g.enemies) if (e.ambush && e.aggro) trig = true;
  if (!trig) return;
  it.ambushed = true;
  for (const e of g.enemies) if (e.ambush) e.aggro = true;
  g.toast('ЗАСАДА! Бандиты открыли огонь', 'bad');
  g.shake = Math.max(g.shake, 4);
  sfx.enemyShot();
}

/* ------------------------------------------------------------------ */
/* Отрисовка комнаты                                                   */
/* ------------------------------------------------------------------ */
function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawInterior(g: Game, ctx: Ctx, it: Interior) {
  if (it.kind === 'upper') return drawUpperRuin(g, ctx, it);
  const R = roomOf(it.kind);
  const upper = false;
  // пол
  ctx.fillStyle = upper ? '#4a3b2c' : '#38393a';
  ctx.fillRect(R.x, R.y, R.w, R.h);
  const d = rnd(it.seed);
  if (upper) {
    for (let px = R.x; px < R.x + R.w; px += 16) {
      ctx.fillStyle = `rgba(${d() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + d() * 0.08})`;
      ctx.fillRect(px, R.y, 16, R.h);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(px, R.y, 1, R.h);
    }
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = R.x; px <= R.x + R.w; px += 36) {
      ctx.moveTo(px, R.y);
      ctx.lineTo(px, R.y + R.h);
    }
    for (let py = R.y; py <= R.y + R.h; py += 36) {
      ctx.moveTo(R.x, py);
      ctx.lineTo(R.x + R.w, py);
    }
    ctx.stroke();
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(20,30,28,${0.15 + d() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(R.x + d() * R.w, R.y + d() * R.h, 10 + d() * 30, 6 + d() * 18, d() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + d() * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(R.x + d() * R.w, R.y + d() * R.h, 8 + d() * 24, 6 + d() * 16, d() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,14,12,0.35)';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.ellipse(R.x + d() * R.w, R.y + d() * R.h, 14 + d() * 16, 9 + d() * 9, d() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // тени и стены
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  for (const w of it.walls) ctx.fillRect(w.x + 5, w.y + 7, w.w, w.h);
  for (const w of it.walls) {
    ctx.fillStyle = upper ? '#5a4a40' : '#3f3b38';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    if (w.w >= w.h) {
      for (let y = w.y + 8; y < w.y + w.h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(w.x, y);
        ctx.lineTo(w.x + w.w, y);
        ctx.stroke();
      }
      for (let x = w.x + 14; x < w.x + w.w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, w.y);
        ctx.lineTo(x, w.y + Math.min(8, w.h));
        ctx.stroke();
      }
    } else {
      for (let x = w.x + 8; x < w.x + w.w; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, w.y);
        ctx.lineTo(x, w.y + w.h);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(w.x, w.y, w.w, 2);
  }

  for (const p of it.props) drawProp(ctx, p);

  for (const l of it.lamps) {
    ctx.fillStyle = '#2a2a28';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe3a0';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // лестница / люк — выход
  const e = it.exit;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-36, -34, 76, 72);
  if (upper) {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#7a5a38' : '#8a6a44';
      ctx.fillRect(-34, -32 + i * 9, 68, 8);
    }
    ctx.strokeStyle = '#2a1c10';
    ctx.lineWidth = 2;
    ctx.strokeRect(-34, -32, 68, 63);
  } else {
    ctx.fillStyle = '#6a6e72';
    ctx.fillRect(-30, -28, 60, 56);
    ctx.strokeStyle = '#2a2c2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(-30, -28, 60, 56);
    ctx.strokeStyle = '#b8a15a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(150,230,255,0.9)';
  ctx.fillText(upper ? '▼ ВНИЗ' : '▲ НАВЕРХ', e.x, e.y + 54);
  if (Math.hypot(g.player.x - e.x, g.player.y - e.y) < 70 && g.state === 'playing') {
    ctx.fillStyle = 'rgba(255,230,150,0.95)';
    ctx.fillText('E', e.x, e.y - 44 + Math.sin(g.time * 5) * 2);
  }
}


/* ------------------------------------------------------------------ */
/* Второй этаж: руины в стиле первого этажа (запекается один раз)      */
/* ------------------------------------------------------------------ */
const MARGIN = 300;
const bakeCache = new WeakMap<Interior, HTMLCanvasElement>();

/** Лестница вниз на втором этаже (вид сверху): ступени уходят в темноту */
function drawStairsDown(ctx: Ctx, x: number, y: number, seed: number) {
  const r = mulberry32(seed);
  ctx.save();
  ctx.translate(x, y);
  // шахта
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-42, -38, 86, 80);
  ctx.fillStyle = '#080605';
  ctx.fillRect(-36, -34, 72, 70);
  // ступени: чем дальше — тем темнее
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const yy = -32 + i * 7.6;
    const c1 = Math.round(150 - t * 105);
    ctx.fillStyle = `rgb(${c1},${Math.round(c1 * 0.88)},${Math.round(c1 * 0.72)})`;
    ctx.fillRect(-30, yy, 60, 5.6);
    ctx.fillStyle = `rgba(255,240,210,${0.22 - t * 0.16})`;
    ctx.fillRect(-30, yy, 60, 1.3);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-30, yy + 5.6, 60, 2);
    // выбоины на ступенях
    if (r.chance(0.5)) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-28 + r.range(0, 50), yy + 1, r.range(4, 10), 3);
    }
  }
  // тетива (боковые балки)
  for (const sx of [-37, 30]) {
    const g = ctx.createLinearGradient(sx, 0, sx + 8, 0);
    g.addColorStop(0, '#6e6c66');
    g.addColorStop(1, '#4a4944');
    ctx.fillStyle = g;
    ctx.fillRect(sx, -36, 8, 74);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, -35.5, 7, 73);
  }
  // сломанное ограждение
  ctx.strokeStyle = '#2a1c10';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-38, -30);
  ctx.lineTo(-38, -4);
  ctx.stroke();
  ctx.strokeStyle = '#6e5636';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#5a4630';
  for (const py of [-30, -16, -4]) ctx.fillRect(-40, py, 4, 4);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-38, 10);
  ctx.lineTo(-33, 26);
  ctx.stroke();
  // мусор и сорняки на краях
  const d = mulberry32(seed + 3);
  for (let i = 0; i < 5; i++) drawChunk(ctx, d, d.range(-44, 46), d.range(-42, -32), d.range(3, 6));
  for (let i = 0; i < 5; i++) drawGrass(ctx, d, d.range(-36, 36), -38 + d.range(-2, 3), 1.2);
  ctx.restore();
}

/** Проём между комнатами: вытертый порог, деревянные косяки и сорванная дверь */
function drawDoorway(ctx: Ctx, d: ReturnType<typeof mulberry32>, dr: Door) {
  const hz = dr.horiz;
  // вытертая дорожка на полу
  ctx.fillStyle = 'rgba(230,200,150,0.07)';
  if (hz) ctx.fillRect(dr.x, dr.y - 40, dr.w, dr.h + 80);
  else ctx.fillRect(dr.x - 40, dr.y, dr.w + 80, dr.h);
  // порог: доски
  ctx.fillStyle = '#6a4e30';
  if (hz) ctx.fillRect(dr.x, dr.y + 1, dr.w, dr.h - 2);
  else ctx.fillRect(dr.x + 1, dr.y, dr.w - 2, dr.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  if (hz) {
    for (let x = dr.x + 12; x < dr.x + dr.w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, dr.y + 1);
      ctx.lineTo(x, dr.y + dr.h - 1);
      ctx.stroke();
    }
  } else {
    for (let y = dr.y + 12; y < dr.y + dr.h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(dr.x + 1, y);
      ctx.lineTo(dr.x + dr.w - 1, y);
      ctx.stroke();
    }
  }
  // косяки
  const post = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + 3, w, h);
    ctx.fillStyle = '#4e3a24';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#7a5a38';
    ctx.fillRect(x, y, w, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  if (hz) {
    post(dr.x - 4, dr.y - 3, 9, dr.h + 6);
    post(dr.x + dr.w - 5, dr.y - 3, 9, dr.h + 6);
  } else {
    post(dr.x - 3, dr.y - 4, dr.w + 6, 9);
    post(dr.x - 3, dr.y + dr.h - 5, dr.w + 6, 9);
  }
  // сорванная дверь, прислонённая к стене рядом с проёмом
  ctx.save();
  if (hz) {
    ctx.translate(dr.x - 6, dr.y + dr.h + 10);
    ctx.rotate(Math.PI + d.range(-0.25, 0.25));
  } else {
    ctx.translate(dr.x + dr.w + 10, dr.y - 6);
    ctx.rotate(-Math.PI / 2 + d.range(-0.25, 0.25));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(2, 3, 38, 6);
  ctx.fillStyle = '#5c4228';
  ctx.fillRect(0, 0, 38, 6);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(0, 0, 38, 1.6);
  ctx.fillStyle = '#c8a860';
  ctx.fillRect(30, 2, 2.4, 2.4);
  ctx.fillStyle = '#2e2014';
  ctx.beginPath();
  ctx.moveTo(38, 0);
  ctx.lineTo(44, 2);
  ctx.lineTo(39, 4);
  ctx.lineTo(43, 6);
  ctx.lineTo(38, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function bakeUpper(it: Interior): HTMLCanvasElement {
  const R = ROOM_UPPER;
  const c = document.createElement('canvas');
  c.width = R.w + MARGIN * 2;
  c.height = R.h + MARGIN * 2;
  const ctx = c.getContext('2d')!;
  ctx.translate(-(R.x - MARGIN), -(R.y - MARGIN));
  const d = mulberry32(it.seed ^ 0x5eed);

  // --- «улица» вокруг развалин: ночной бурьян ---
  ctx.fillStyle = '#161d14';
  ctx.fillRect(R.x - MARGIN, R.y - MARGIN, R.w + MARGIN * 2, R.h + MARGIN * 2);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = d.pick(['rgba(52,70,38,0.42)', 'rgba(38,52,30,0.5)', 'rgba(70,64,42,0.38)', 'rgba(30,40,26,0.55)']);
    ctx.beginPath();
    ctx.ellipse(d.range(R.x - MARGIN, R.x + R.w + MARGIN), d.range(R.y - MARGIN, R.y + R.h + MARGIN), d.range(16, 52), d.range(12, 36), d.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 900; i++) drawGrass(ctx, d, d.range(R.x - MARGIN, R.x + R.w + MARGIN), d.range(R.y - MARGIN, R.y + R.h + MARGIN), 1.15);
  for (let i = 0; i < 26; i++) {
    const px = d.range(R.x - MARGIN + 20, R.x + R.w + MARGIN - 20);
    const py = d.range(R.y - MARGIN + 20, R.y + R.h + MARGIN - 20);
    if (px > R.x - 40 && px < R.x + R.w + 40 && py > R.y - 40 && py < R.y + R.h + 40) continue;
    drawChunk(ctx, d, px, py, d.range(4, 11));
  }

  // --- пол: дощатый, изъеденный временем ---
  ctx.fillStyle = '#4a3b2c';
  ctx.fillRect(R.x, R.y, R.w, R.h);
  for (let px = R.x; px < R.x + R.w; px += 16) {
    ctx.fillStyle = `rgba(${d.chance(0.5) ? '0,0,0' : '255,255,255'},${0.02 + d.next() * 0.09})`;
    ctx.fillRect(px, R.y, 16, R.h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px, R.y, 1, R.h);
    // стыки досок вразбежку
    for (let yy = R.y + d.range(0, 60); yy < R.y + R.h; yy += d.range(70, 140)) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px, yy, 16, 1);
    }
  }
  // пятна воды, плесень, грязь
  for (let k = 0; k < 18; k++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + d.next() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(R.x + d.next() * R.w, R.y + d.next() * R.h, 8 + d.next() * 26, 6 + d.next() * 17, d.next() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < 8; k++) {
    ctx.fillStyle = d.pick(['rgba(50,76,40,0.38)', 'rgba(40,62,36,0.42)', 'rgba(70,84,50,0.3)']);
    ctx.beginPath();
    ctx.ellipse(R.x + d.next() * R.w, R.y + d.next() * R.h, 12 + d.next() * 28, 8 + d.next() * 16, d.next() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = 'rgba(46,66,78,0.45)';
    ctx.beginPath();
    ctx.ellipse(R.x + 60 + d.next() * (R.w - 120), R.y + 60 + d.next() * (R.h - 120), 18 + d.next() * 22, 10 + d.next() * 12, d.next() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,14,12,0.34)';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.ellipse(R.x + d.next() * R.w, R.y + d.next() * R.h, 12 + d.next() * 14, 8 + d.next() * 8, d.next() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // трещины и пробившаяся трава
  for (let k = 0; k < 12; k++) drawCrack(ctx, d, R.x + d.next() * R.w, R.y + d.next() * R.h, d.range(30, 80), 0.5);
  for (let k = 0; k < 36; k++) drawGrass(ctx, d, R.x + d.next() * R.w, R.y + d.next() * R.h, 1.1);
  // лунные пятна сквозь дыры в крыше
  for (const sh of it.shafts) {
    const g = ctx.createRadialGradient(sh.x, sh.y, 2, sh.x, sh.y, sh.r * 1.5);
    g.addColorStop(0, 'rgba(150,180,235,0.20)');
    g.addColorStop(0.7, 'rgba(120,150,210,0.08)');
    g.addColorStop(1, 'rgba(120,150,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,200,240,0.07)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, sh.r, sh.r * 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // штукатурка и кирпичи, осыпавшиеся с потолка
  for (let k = 0; k < 22; k++) {
    if (d.chance(0.5)) drawBrick(ctx, d, R.x + d.next() * R.w, R.y + d.next() * R.h);
    else drawChunk(ctx, d, R.x + d.next() * R.w, R.y + d.next() * R.h, d.range(2.5, 5.5));
  }

  // --- обвалы пола ---
  for (const h of it.holes) {
    const cx = h.x + h.w / 2;
    const cy = h.y + h.h / 2;
    // скол досок
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 4, h.w * 0.62, h.h * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    const pts: [number, number][] = [];
    const nP = 14;
    for (let i = 0; i < nP; i++) {
      const a = (i / nP) * Math.PI * 2;
      const k = i % 2 ? 0.88 : 1.08 + d.next() * 0.12;
      pts.push([cx + Math.cos(a) * (h.w / 2) * k, cy + Math.sin(a) * (h.h / 2) * k]);
    }
    ctx.fillStyle = '#6a5238';
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // тёмная пустота
    const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, Math.max(h.w, h.h) * 0.55);
    g.addColorStop(0, '#000');
    g.addColorStop(0.8, '#080604');
    g.addColorStop(1, '#17110b');
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach((q, i) => {
      const px = cx + (q[0] - cx) * 0.84;
      const py = cy + (q[1] - cy) * 0.84;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    // торчащие балки и щепки
    ctx.fillStyle = '#4a3320';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(h.x + 6 + i * (h.w / 4.4), h.y + h.h * 0.3, 5, h.h * 0.4);
    }
    ctx.strokeStyle = '#8a6a42';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + d.next() * 0.4;
      const rx = (h.w / 2) * 0.96;
      const ry = (h.h / 2) * 0.96;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      ctx.lineTo(cx + Math.cos(a) * (rx - 8 - d.next() * 8), cy + Math.sin(a) * (ry - 6 - d.next() * 6));
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) drawChunk(ctx, d, cx + d.range(-h.w / 2, h.w / 2), cy + d.range(-h.h / 2, h.h / 2), d.range(2.5, 4.5));
    drawVine(ctx, d, h.x + d.next() * h.w, h.y, d.range(0, 6.28), 26, 1.1);
  }

  // --- груды обломков ---
  for (const col of it.grid.cells.flat()) {
    if (col.type !== 'rubble' || (col as Collider & { drawn?: boolean }).drawn) continue;
    (col as Collider & { drawn?: boolean }).drawn = true;
    const cx = col.x + col.w / 2;
    const cy = col.y + col.h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 6, col.w * 0.62, col.h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 14; i++) drawChunk(ctx, d, cx + d.range(-col.w * 0.42, col.w * 0.42), cy + d.range(-col.h * 0.4, col.h * 0.4), d.range(5, 11));
    for (let i = 0; i < 6; i++) drawBrick(ctx, d, cx + d.range(-col.w * 0.5, col.w * 0.5), cy + d.range(-col.h * 0.45, col.h * 0.45));
    drawGrass(ctx, d, cx + d.range(-8, 8), cy + d.range(-6, 6), 1.5);
    drawVine(ctx, d, cx, cy, d.range(0, 6.28), 20, 1.1);
  }
  it.grid.stamp++;

  // --- упавшие балки перекрытия (декор) ---
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.translate(R.x + R.w * d.range(0.25, 0.8), R.y + R.h * d.range(0.2, 0.7));
    ctx.rotate(d.range(-0.6, 0.6));
    const L = d.range(110, 170);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-L / 2 + 3, 4, L, 10);
    ctx.fillStyle = '#4e3a24';
    ctx.fillRect(-L / 2, -4, L, 9);
    ctx.fillStyle = '#6a4e30';
    ctx.fillRect(-L / 2, -4, L, 2.4);
    ctx.fillStyle = '#2e2014';
    ctx.beginPath();
    ctx.moveTo(L / 2, -4);
    ctx.lineTo(L / 2 + 8, -1);
    ctx.lineTo(L / 2 + 3, 2);
    ctx.lineTo(L / 2 + 9, 5);
    ctx.lineTo(L / 2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- стены ---
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  for (const w of it.walls) ctx.fillRect(w.x + 5, w.y + 7, w.w, w.h);
  for (const w of it.walls) {
    if (w.low) {
      // обрушенный участок: груда кирпича с арматурой
      ctx.fillStyle = '#35302c';
      ctx.fillRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      const nn = Math.ceil((w.w * w.h) / 150);
      for (let i = 0; i < nn; i++) drawChunk(ctx, d, w.x + d.range(2, w.w - 2), w.y + d.range(2, w.h - 2), d.range(4, 8));
      for (let i = 0; i < Math.ceil(nn / 2); i++) drawBrick(ctx, d, w.x + d.range(2, w.w - 2), w.y + d.range(2, w.h - 2));
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const bx = w.x + d.range(4, w.w - 4);
        const by = w.y + d.range(4, w.h - 4);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + d.range(-7, 7), by + d.range(-9, 4));
        ctx.stroke();
      }
      drawGrass(ctx, d, w.x + w.w / 2, w.y + w.h / 2, 1.5);
      continue;
    }
    // целый кусок: кирпич, обои, штукатурка
    ctx.fillStyle = '#5a4a40';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    if (w.w >= w.h) {
      for (let y = w.y + 8; y < w.y + w.h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(w.x, y);
        ctx.lineTo(w.x + w.w, y);
        ctx.stroke();
      }
      for (let x = w.x + 14; x < w.x + w.w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, w.y);
        ctx.lineTo(x, w.y + Math.min(8, w.h));
        ctx.stroke();
      }
    } else {
      for (let x = w.x + 8; x < w.x + w.w; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, w.y);
        ctx.lineTo(x, w.y + w.h);
        ctx.stroke();
      }
      for (let y = w.y + 14; y < w.y + w.h; y += 26) {
        ctx.beginPath();
        ctx.moveTo(w.x, y);
        ctx.lineTo(w.x + Math.min(8, w.w), y);
        ctx.stroke();
      }
    }
    // остатки обоев
    if (d.chance(0.6)) {
      ctx.fillStyle = d.pick(['rgba(140,110,80,0.5)', 'rgba(120,130,100,0.45)', 'rgba(150,100,100,0.4)']);
      if (w.w >= w.h) ctx.fillRect(w.x + d.range(0, w.w * 0.5), w.y + 1, d.range(10, w.w * 0.5), w.h - 2);
      else ctx.fillRect(w.x + 1, w.y + d.range(0, w.h * 0.5), w.w - 2, d.range(10, w.h * 0.5));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(w.x, w.y, w.w, 2);
    // выщербины на краях
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(20,16,12,0.8)';
      if (w.w >= w.h) ctx.fillRect(w.x + d.range(2, w.w - 8), d.chance(0.5) ? w.y : w.y + w.h - 3, d.range(3, 8), 3);
      else ctx.fillRect(d.chance(0.5) ? w.x : w.x + w.w - 3, w.y + d.range(2, w.h - 8), 3, d.range(3, 8));
    }
    if (d.chance(0.7)) drawCrack(ctx, d, w.x + d.range(2, Math.max(3, w.w - 2)), w.y + d.range(2, Math.max(3, w.h - 2)), d.range(14, 30), 0.6);
    if (d.chance(0.6)) drawVine(ctx, d, w.x + d.range(0, w.w), w.y + d.range(0, w.h), d.range(0, 6.28), d.range(24, 54), 1.1);
  }

  // --- дверные проёмы: косяки, порог, сорванная дверь ---
  for (const dr of it.doors) drawDoorway(ctx, d, dr);

  // --- мебель, тронутая разрухой ---
  for (const p of it.props) drawProp(ctx, p);

  // --- лестница вниз ---
  drawStairsDown(ctx, it.exit.x, it.exit.y, it.seed);
  // пыль у лестницы
  return c;
}

function drawUpperRuin(g: Game, ctx: Ctx, it: Interior) {
  const R = ROOM_UPPER;
  let cv = bakeCache.get(it);
  if (!cv) {
    cv = bakeUpper(it);
    bakeCache.set(it, cv);
  }
  ctx.drawImage(cv, R.x - MARGIN, R.y - MARGIN);
  // лампы
  for (const l of it.lamps) {
    ctx.fillStyle = '#2a2a28';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe3a0';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // лунные лучи сверху: мерцающая пыль
  for (const sh of it.shafts) {
    for (let k = 0; k < 6; k++) {
      const ph = (g.time * 0.12 + k / 6 + sh.x * 0.01) % 1;
      const px = sh.x + Math.sin(ph * 6.28 * 2 + k) * sh.r * 0.7;
      const py = sh.y - sh.r * 0.8 + ph * sh.r * 1.8;
      ctx.fillStyle = `rgba(190,210,250,${0.5 * Math.sin(ph * Math.PI)})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const e = it.exit;
  ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(150,230,255,0.9)';
  ctx.fillText('▼ ЛЕСТНИЦА ВНИЗ', e.x, e.y + 54);
  if (Math.hypot(g.player.x - e.x, g.player.y - e.y) < 70 && g.state === 'playing') {
    ctx.fillStyle = 'rgba(255,230,150,0.95)';
    ctx.fillText('E', e.x, e.y - 46 + Math.sin(g.time * 5) * 2);
  }
}

/** Лестница наверх на поверхности: бетонные ступени с провалами, перила, плющ */
function drawStairsUp(ctx: Ctx, night: boolean, seed: number, time: number) {
  const d = mulberry32(seed);
  // тень
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-19, -24, 44, 54);
  // ступени, чем выше — тем светлее
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = 22 - i * 6.6;
    const base = 96 + t * 60;
    ctx.fillStyle = `rgb(${Math.round(base)},${Math.round(base - 4)},${Math.round(base - 12)})`;
    ctx.fillRect(-18, y, 36, 5.2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-18, y, 36, 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-18, y + 5.2, 36, 1.4);
    if (d.chance(0.35)) {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(-16 + d.range(0, 28), y + 1, d.range(3, 8), 3);
    }
  }
  // тёмный проём наверху и свет
  const gl = ctx.createLinearGradient(0, -26, 0, -14);
  gl.addColorStop(0, night ? 'rgba(120,160,230,0.55)' : 'rgba(255,236,170,0.5)');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(-18, -26, 36, 6);
  ctx.fillStyle = gl;
  ctx.fillRect(-18, -26, 36, 14);
  // боковые стенки лестницы
  for (const sx of [-23, 18]) {
    const gr = ctx.createLinearGradient(sx, 0, sx + 5, 0);
    gr.addColorStop(0, '#6c6a64');
    gr.addColorStop(1, '#46443f');
    ctx.fillStyle = gr;
    ctx.fillRect(sx, -26, 5, 54);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, -25.5, 4, 53);
  }
  // сломанные перила
  ctx.strokeStyle = '#2e2218';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, 24);
  ctx.lineTo(-26, -6);
  ctx.stroke();
  ctx.strokeStyle = '#7a8086';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#7a8086';
  for (const py of [22, 12, 2]) ctx.fillRect(-27.4, py, 2.8, 2.8);
  // плющ и трава
  drawVine(ctx, d, -22, 24, -1.7, 34, 1);
  drawVine(ctx, d, 21, 22, -1.5, 26, 1);
  for (let i = 0; i < 5; i++) drawGrass(ctx, d, d.range(-18, 18), 26 + d.range(-2, 3), 1.2);
  drawChunk(ctx, d, 20, 30, 3.4);
  drawChunk(ctx, d, -21, 31, 2.8);
  if (night) {
    // слабое голубое свечение сверху
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(0, -22, 2, 0, -22, 38);
    rg.addColorStop(0, `rgba(110,150,230,${0.22 + 0.05 * Math.sin(time * 2)})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -22, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawProp(ctx: Ctx, p: Prop) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(4, 5, p.w, p.h);
  switch (p.kind) {
    case 'bed':
      ctx.fillStyle = '#5a3c26';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#7a8088';
      ctx.fillRect(3, 3, p.w - 6, p.h - 6);
      ctx.fillStyle = '#c8c4b4';
      ctx.fillRect(4, 5, 20, p.h - 10);
      ctx.fillStyle = 'rgba(90,40,30,0.4)';
      ctx.fillRect(34, 8, 26, 20);
      break;
    case 'table':
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#8a643a';
      ctx.fillRect(2, 2, p.w - 4, p.h - 4);
      ctx.fillStyle = 'rgba(200,190,160,0.5)';
      ctx.fillRect(10, 8, 12, 9);
      break;
    case 'wardrobe':
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#6a4a2e';
      ctx.fillRect(3, 3, p.w - 6, p.h - 6);
      ctx.fillStyle = '#2a1c10';
      ctx.fillRect(p.w / 2 - 1, 3, 2, p.h - 6);
      break;
    case 'sofa':
      ctx.fillStyle = '#4a4036';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#6a5a48';
      ctx.fillRect(3, 8, p.w - 6, p.h - 11);
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(0, 0, p.w, 8);
      break;
    case 'barrel':
      ctx.fillStyle = '#4a4e3a';
      ctx.beginPath();
      ctx.arc(p.w / 2, p.h / 2, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#25281c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#6a6e52';
      ctx.beginPath();
      ctx.arc(p.w / 2, p.h / 2, p.w / 3.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'stack':
      ctx.fillStyle = '#6a4a28';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.strokeStyle = '#3a2814';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(1, 1, p.w - 2, p.h - 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p.w, p.h);
      ctx.moveTo(p.w, 0);
      ctx.lineTo(0, p.h);
      ctx.stroke();
      break;
    case 'shelf':
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(0, 0, p.w, p.h);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = ['#8a4a3a', '#5a7a4a', '#9a8a4a', '#4a6a8a'][i % 4];
        ctx.fillRect(4 + i * (p.w / 5), 4, p.w / 5 - 6, p.h - 8);
      }
      break;
    case 'pillar':
      ctx.fillStyle = '#5a5d60';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#7a7e82';
      ctx.fillRect(2, 2, p.w - 4, 4);
      ctx.strokeStyle = '#25272a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 1);
      break;
  }
  if (p.ruined) {
    // разруха: грязь, трещина, плесень и пыль
    ctx.fillStyle = 'rgba(20,14,8,0.28)';
    ctx.fillRect(0, 0, p.w, p.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.w * 0.2, 0);
    ctx.lineTo(p.w * 0.4, p.h * 0.45);
    ctx.lineTo(p.w * 0.32, p.h * 0.7);
    ctx.lineTo(p.w * 0.55, p.h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,96,50,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.w * 0.75, p.h * 0.7, p.w * 0.16, p.h * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,190,170,0.1)';
    ctx.fillRect(0, 0, p.w, 2);
  }
  ctx.restore();
}

/** Темнота комнаты: свет вокруг игрока, ламп, ящиков */
export function drawInteriorDark(g: Game, ctx: CanvasRenderingContext2D, it: Interior) {
  const { W, H } = g;
  const p = g.player;
  const cx = g.camTop.x;
  const cy = g.camTop.y;
  const lights: Light[] = [];
  const add = (x: number, y: number, r: number, k = 1, warm?: string) => {
    const sx = x - cx;
    const sy = y - cy;
    if (sx < -r || sy < -r || sx > W + r || sy > H + r) return;
    lights.push({ x: sx, y: sy, r, k, warm });
  };
  const fl = 0.85 + Math.sin(g.time * 13) * 0.08 + Math.sin(g.time * 31) * 0.07;
  for (const l of it.lamps) add(l.x, l.y, 190, 0.7 * fl, 'rgba(255,200,120,0.10)');
  for (const sh of it.shafts) add(sh.x, sh.y, sh.r * 3.4, 0.5 + 0.06 * Math.sin(g.time * 0.8 + sh.x), 'rgba(110,150,220,0.12)');
  add(it.exit.x, it.exit.y, 90, 0.6, 'rgba(120,200,240,0.1)');
  add(p.x, p.y, 240, 0.9);
  if (p.flash > 0) add(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40, 240, 0.9, 'rgba(255,220,150,0.18)');
  for (const c of g.crates) if (!c.opened) add(c.x, c.y, 44, 0.5);
  for (const b of g.bullets) if (b.from === 'p' && (b.kind === 'flame' || b.kind === 'plasma' || b.kind === 'rocket')) add(b.x, b.y, 120, 0.8);
  const cone = g.state === 'playing' && !g.paused ? { x: p.x - cx, y: p.y - cy, ang: p.angle, len: 480, spread: 0.45 } : undefined;
  drawDarkness(ctx, W, H, it.kind === 'cellar' ? 0.86 : 0.8, [2, 3, 8], lights, cone);
}

/* ------------------------------------------------------------------ */
/* Маркеры на поверхности: лестницы, люки, лагеря бандитов            */
/* ------------------------------------------------------------------ */
export function drawAccessMarkers(g: Game, ctx: Ctx, inView: (x: number, y: number) => boolean) {
  const night = g.phase === 'night';
  for (const a of g.world.accesses) {
    if (!inView(a.x, a.y)) continue;
    const near = Math.hypot(g.player.x - a.x, g.player.y - a.y) < 56;
    const it = g.interiors.get(a.id);
    const done = night && !!it && it.seen && it.enemies.length === 0 && it.crates.every((c) => c.opened);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.globalAlpha = night ? 1 : 0.6;
    ctx.font = 'bold 9px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    if (a.kind === 'upper') {
      drawStairsUp(ctx, night, a.seed, g.time);
      ctx.fillStyle = '#d8c090';
      ctx.fillText(night ? '▲ ЛЕСТНИЦА' : '✕ ЛЕСТНИЦА', 0, 42);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-19, -17, 42, 38);
      ctx.fillStyle = '#5a5e62';
      ctx.fillRect(-20, -18, 40, 36);
      ctx.strokeStyle = '#26282a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-20, -18, 40, 36);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      for (let i = -12; i <= 12; i += 8) {
        ctx.beginPath();
        ctx.moveTo(-19, i);
        ctx.lineTo(19, i);
        ctx.stroke();
      }
      ctx.strokeStyle = night ? '#b8a15a' : '#7a7050';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d8c090';
      ctx.fillText(night ? '▼ ПОДВАЛ' : '✕ ПОДВАЛ', 0, 32);
    }
    if (done) {
      ctx.fillStyle = 'rgba(120,230,120,0.9)';
      ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('✓', 0, -28);
    }
    ctx.restore();
    if (near && night && g.state === 'playing') {
      ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,230,150,0.95)';
      ctx.fillText('E', a.x, a.y - 34 + Math.sin(g.time * 5) * 2);
    }
  }
}

export function drawCamps(g: Game, ctx: Ctx, inView: (x: number, y: number) => boolean) {
  const night = g.phase === 'night';
  const t = g.time;
  for (const c of g.world.camps) {
    if (!inView(c.x, c.y)) continue;
    const d = rnd(c.seed);
    ctx.save();
    ctx.translate(c.x, c.y);
    for (let i = 0; i < 3; i++) {
      const a = d() * 6.283;
      const rr = 46 + d() * 20;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.rotate(a + 1.57);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-9, -15, 22, 34);
      ctx.fillStyle = ['#5a4a3a', '#44503a', '#4a4a56'][i % 3];
      ctx.fillRect(-10, -16, 20, 32);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-10, -16, 20, 5);
      ctx.restore();
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283;
      ctx.fillStyle = '#4a4744';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 17, Math.sin(a) * 17, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
      ctx.stroke();
    }
    if (night) {
      const fl = 0.8 + Math.sin(t * 17 + c.id) * 0.1 + Math.sin(t * 29) * 0.1;
      const gr = ctx.createRadialGradient(0, 0, 3, 0, 0, 130);
      gr.addColorStop(0, `rgba(255,150,60,${0.34 * fl})`);
      gr.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = t * 6 + i * 1.3;
        ctx.fillStyle = i % 2 ? '#d9822b' : '#eaa93a';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 4, Math.sin(a) * 4 - 2, 3.5 + 2.5 * Math.sin(t * 12 + i), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f6dc7a';
      ctx.beginPath();
      ctx.arc(0, -1, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e1a16';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,60,30,0.5)';
      ctx.beginPath();
      ctx.arc(2, 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Свет костров лагерей (ночь) */
export function campLights(g: Game, add: (x: number, y: number, r: number, k: number, warm?: string) => void) {
  const fl = 0.85 + Math.sin(g.time * 17) * 0.08 + Math.sin(g.time * 29) * 0.07;
  for (const c of g.world.camps) add(c.x, c.y, 290, 0.95, `rgba(255,140,50,${0.22 * fl})`);
}

/* ------------------------------------------------------------------ */
/* Границы города                                                      */
/* ------------------------------------------------------------------ */
export function drawCityBorder(g: Game, ctx: Ctx, camX: number, camY: number) {
  const R = g.cityR;
  const { W, H } = g;
  const maxD = Math.max(
    Math.hypot(camX - CENTER.x, camY - CENTER.y),
    Math.hypot(camX + W - CENTER.x, camY - CENTER.y),
    Math.hypot(camX - CENTER.x, camY + H - CENTER.y),
    Math.hypot(camX + W - CENTER.x, camY + H - CENTER.y),
  );
  if (maxD < R - 10) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(camX - 20, camY - 20, W + 40, H + 40);
  ctx.arc(CENTER.x, CENTER.y, R, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(7,5,5,0.975)';
  ctx.fill('evenodd');
  ctx.lineWidth = 7;
  ctx.setLineDash([22, 22]);
  ctx.strokeStyle = '#e0b020';
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineDashOffset = 22;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
  ctx.setLineDash([]);
  const step = 150;
  const n = Math.floor((Math.PI * 2 * R) / step);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = CENTER.x + Math.cos(a) * R;
    const y = CENTER.y + Math.sin(a) * R;
    if (x < camX - 50 || x > camX + W + 50 || y < camY - 50 || y > camY + H + 50) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a7e82';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i % 2 ? '#c8382a' : '#e0b020';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#b02a20';
      ctx.fillRect(-40, -26, 80, 16);
      ctx.fillStyle = '#f0e8d0';
      ctx.font = 'bold 9px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ЗОНА ЗАРАЖЕНИЯ', 0, -18);
      ctx.restore();
    }
  }
  ctx.restore();
}

export { DAY_RADIUS, NIGHT_RADIUS };
