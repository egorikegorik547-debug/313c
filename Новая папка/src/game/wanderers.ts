import type { Ctx } from './art';
import type { Game } from './engine';
import type { Camp } from './world';
import { drawPerson } from './draw';
import { sfx } from './audio';
import { AMMO, WEAPONS, type AmmoType, type WeaponId } from './weapons';
import { RES, RES_ORDER, FRAME_ORDER, canAfford, fitCount, type Cost, type ResId } from './items';

/* ------------------------------------------------------------------ */
/* Бродячие торговцы: сидят у костров в некоторых домах (только ночью) */
/* ------------------------------------------------------------------ */
export type OfferKind = 'buy' | 'barter' | 'weapon' | 'ammo';

export interface Offer {
  id: number;
  kind: OfferKind;
  /** что отдаёт игрок: ресурсы и деньги */
  give: Cost;
  money: number;
  /** что получает игрок */
  res?: ResId;
  n?: number;
  weapon?: WeaponId;
  ammo?: AmmoType;
  stock: number;
}

export interface Wanderer {
  id: number;
  campId: number;
  x: number;
  y: number;
  seed: number;
  name: string;
  line: string;
  offers: Offer[];
  angle: number;
}

/** Редкое оружие: цена в ресурсах */
export const RARE_PRICE: Record<string, Cost> = {
  tozvert: { scrap: 30, parts: 8, f_shotgun: 1 },
  dualmak: { scrap: 24, parts: 6, f_pistol: 2 },
  pbsil: { scrap: 18, parts: 5, cloth: 2, f_pistol: 1 },
  crossbow: { wood: 16, scrap: 16, parts: 5 },
  compound: { wood: 12, scrap: 22, parts: 10, cloth: 6 },
};
const RARE_IDS = Object.keys(RARE_PRICE) as WeaponId[];

/** Условная ценность ресурса: для обмена */
const VALUE: Partial<Record<ResId, number>> = { scrap: 1, wood: 0.9, cloth: 1.1, powder: 1.7, parts: 2.8, gas: 3.5 };
/** Цена одной единицы за деньги */
const UNIT_PRICE: Partial<Record<ResId, number>> = { scrap: 14, wood: 12, cloth: 14, powder: 22, parts: 36, gas: 55 };

const NAMES = ['Старый Петрович', 'Лиса', 'Седой Фёдор', 'Баба Нюра', 'Кузьмич', 'Сапожник', 'Штопаный', 'Молчун Гена'];
const LINES = [
  'Садись к огню. Есть что обменять — меняю. Нет — проходи.',
  'Я не бандит и не зомби. Я торговец. Смотри товар.',
  'Редкий товар — только у костра, только ночью.',
  'Деньги — бумага. А вот детали да порох — это валюта.',
  'Тише. На огонёк придут — не обрадуются. Выбирай быстрей.',
];

const ri = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

function makeOffers(g: Game): Offer[] {
  const offers: Offer[] = [];
  let id = 1;
  const push = (o: Omit<Offer, 'id'>) => offers.push({ ...o, id: id++ });
  const dayK = 1 + Math.min(0.6, g.day * 0.05);

  // 1. продажа ресурсов за деньги
  for (const r of shuffle(RES_ORDER).slice(0, 3)) {
    const n = r === 'parts' ? 3 : r === 'gas' ? 2 : 5;
    const price = Math.round(((UNIT_PRICE[r] ?? 20) * n * (0.9 + Math.random() * 0.3) * dayK) / 5) * 5;
    push({ kind: 'buy', give: {}, money: price, res: r, n, stock: ri(2, 4) });
  }

  // 2. обмен ресурсов на другие ресурсы
  const pool = shuffle(RES_ORDER);
  for (let i = 0; i < 3; i++) {
    const get = pool[i];
    let give = pool[(i + 1 + ri(0, 3)) % pool.length];
    if (give === get) give = pool[(i + 1) % pool.length];
    const getN = ri(2, 4);
    let giveN = Math.ceil(((getN * (VALUE[get] ?? 1)) / (VALUE[give] ?? 1)) * 1.2);
    giveN = Math.max(1, Math.min(26, giveN));
    push({ kind: 'barter', give: { [give]: giveN }, money: 0, res: get, n: getN, stock: ri(2, 3) });
  }

  // 3. основа оружия за металл и детали
  if (Math.random() < 0.5) {
    const f = pick(FRAME_ORDER);
    push({ kind: 'barter', give: { scrap: ri(14, 22), parts: ri(3, 5) }, money: 0, res: f, n: 1, stock: 1 });
  }

  // 4. редкое оружие
  const weapons = shuffle(RARE_IDS).slice(0, Math.random() < 0.5 ? 2 : 1);
  for (const w of weapons) push({ kind: 'weapon', give: { ...RARE_PRICE[w] }, money: 0, weapon: w, stock: 1 });
  // боеприпасы для лука / арбалета
  if (weapons.includes('crossbow')) push({ kind: 'ammo', give: {}, money: AMMO.bolt.price * 2, ammo: 'bolt', n: AMMO.bolt.pack, stock: 3 });
  if (weapons.includes('compound')) push({ kind: 'ammo', give: {}, money: AMMO.arrow.price * 2, ammo: 'arrow', n: AMMO.arrow.pack, stock: 3 });
  return offers;
}

/** Выбор костров, у которых ночью сидит торговец */
export function pickTraderCamps(g: Game, camps: Camp[], maxR: number): Set<number> {
  const ok = camps.filter((c) => Math.hypot(c.x - g.world.trader.x, c.y - g.world.trader.y) < maxR - 120);
  const set = new Set<number>();
  for (const c of ok) if (Math.random() < 0.3) set.add(c.id);
  if (set.size === 0 && ok.length >= 2) set.add(pick(ok).id);
  if (set.size > 3) return new Set(shuffle([...set]).slice(0, 3));
  return set;
}

export function spawnWanderer(g: Game, c: Camp) {
  let x = c.x - 38;
  let y = c.y + 22;
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * 6.283;
    const d = 40 + Math.random() * 12;
    const tx = c.x + Math.cos(a) * d;
    const ty = c.y + Math.sin(a) * d;
    if (g.world.grid.circleBlocked(tx, ty, 20)) continue;
    x = tx;
    y = ty;
    break;
  }
  g.wanderers.push({
    id: g.nextId++,
    campId: c.id,
    x,
    y,
    seed: c.seed,
    name: pick(NAMES),
    line: pick(LINES),
    offers: makeOffers(g),
    angle: Math.atan2(c.y - y, c.x - x),
  });
}

export function nearestWanderer(g: Game): Wanderer | null {
  if (g.inside || g.loc !== 'surface') return null;
  const p = g.player;
  let best: Wanderer | null = null;
  let bd = 78;
  for (const w of g.wanderers) {
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d < bd) {
      bd = d;
      best = w;
    }
  }
  return best;
}

/** Совершить сделку. Возвращает текст ошибки или null */
export function trade(g: Game, w: Wanderer, offerId: number): string | null {
  const o = w.offers.find((q) => q.id === offerId);
  if (!o || o.stock <= 0) return 'Товар закончился';
  if (!canAfford(g.res, o.give)) return 'Не хватает ресурсов для обмена';
  if (g.money < o.money) return 'Не хватает денег';
  if (o.kind === 'weapon' && o.weapon && g.owned[o.weapon]) return 'У вас уже есть ' + WEAPONS[o.weapon].name;
  if (o.kind === 'ammo' && o.ammo && g.reserve[o.ammo] >= AMMO[o.ammo].cap) return 'Больше таких боеприпасов не унести';
  if (o.res && o.n) {
    const after = { ...g.res };
    for (const k of Object.keys(o.give) as ResId[]) after[k] -= o.give[k] ?? 0;
    if (fitCount(after, g.bagSlots(), o.res, o.n) < o.n) return 'В рюкзаке нет места — освободите ячейки';
  }
  for (const k of Object.keys(o.give) as ResId[]) g.res[k] -= o.give[k] ?? 0;
  g.money -= o.money;
  o.stock--;
  if (o.res && o.n) g.res[o.res] += o.n;
  if (o.weapon) {
    const wd = WEAPONS[o.weapon];
    g.owned[wd.id] = { mag: wd.mag };
    g.switchWeapon(wd.id);
    g.toast(`Получено редкое оружие: ${wd.name}`, 'good');
  } else if (o.ammo && o.n) {
    const a = AMMO[o.ammo];
    g.reserve[o.ammo] = Math.min(a.cap, g.reserve[o.ammo] + o.n);
    g.toast(`+${o.n} · ${a.name}`, 'good');
  } else if (o.res && o.n) {
    g.toast(`+${o.n} ${RES[o.res].name}`, 'good');
  }
  sfx.buy();
  return null;
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                            */
/* ------------------------------------------------------------------ */
export function drawWanderers(g: Game, ctx: Ctx, inView: (x: number, y: number) => boolean) {
  const near = nearestWanderer(g);
  for (const w of g.wanderers) {
    if (!inView(w.x, w.y)) continue;
    const p = g.player;
    const close = Math.hypot(p.x - w.x, p.y - w.y) < 260;
    const ang = close ? Math.atan2(p.y - w.y, p.x - w.x) : w.angle + Math.sin(g.time * 0.6 + w.id) * 0.15;
    ctx.save();
    ctx.translate(w.x, w.y);
    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // мешок с товаром рядом
    ctx.save();
    ctx.translate(-26, 12);
    ctx.rotate(0.4);
    ctx.fillStyle = '#4a3a26';
    ctx.beginPath();
    ctx.roundRect(-11, -9, 22, 18, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();
    ctx.fillStyle = '#6a5436';
    ctx.fillRect(-11, -2, 22, 2);
    ctx.restore();
    ctx.rotate(ang);
    // рюкзак за спиной
    ctx.fillStyle = '#3a4a2e';
    ctx.beginPath();
    ctx.roundRect(-24, -12, 15, 24, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#5a6a44';
    ctx.fillRect(-23, -4, 13, 3);
    ctx.fillStyle = '#8a7a58';
    ctx.fillRect(-26, -8, 4, 16);
    drawPerson(ctx, {
      r: 15,
      cloth: '#46503a',
      clothDark: '#262c20',
      skin: '#c09878',
      hat: 'hood',
      hatColor: '#3a4230',
      phase: 0,
      moving: false,
      arms: 'relaxed',
      beard: true,
    });
    ctx.restore();
    // метка над торговцем
    const bob = Math.sin(g.time * 3 + w.id) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(w.x, w.y - 40 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5fe08a';
    ctx.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', w.x, w.y - 40 + bob);
    if (near === w && g.state === 'playing') {
      ctx.fillStyle = 'rgba(255,230,150,0.95)';
      ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('E', w.x, w.y - 58 + bob);
    }
  }
}
