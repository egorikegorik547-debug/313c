import type { Game } from './engine';
import { dev } from './dev';
import { AMMO, ARMOR_MAX, ALL_ORDER, WEAPONS, type AmmoType, type WeaponId } from './weapons';
import { ALL_RES, CRAFT_FURN_ORDER, FRAME_ORDER, FURN, RES, STRUCTS, STRUCT_ORDER, type CraftFurnId, type ResId, type StructId } from './items';
import { CENTER } from './world';
import { HATCH, fallFromTower } from './structures';
import { ENTRY, RW, RH, WALL_TOP } from './basement';
import { openCrate } from './expedition';
import { ENEMIES, type EnemyType } from './enemies';
import { sfx } from './audio';

/* ------------------------------------------------------------------ */
/* Меню разработчика: выдача, мир, телепорты                           */
/* ------------------------------------------------------------------ */

const ok = (g: Game, m: string) => {
  sfx.buy();
  g.toast(m, 'good');
  g.emit();
};
const bad = (g: Game, m: string) => {
  sfx.deny();
  g.toast(m, 'bad');
  g.emit();
};

/** Кадровые читы */
export function devTick(g: Game) {
  if (!dev.on) return;
  const p = g.player;
  if (dev.god) {
    p.hp = p.maxHp;
    p.armor = Math.max(p.armor, ARMOR_MAX);
    p.burnT = 0;
    p.slowT = 0;
  }
  if (dev.infAmmo) {
    for (const id of Object.keys(g.owned) as WeaponId[]) {
      const w = WEAPONS[id];
      if (w && !w.melee) g.owned[id].mag = w.mag;
    }
    for (const t of Object.keys(AMMO) as AmmoType[]) g.reserve[t] = AMMO[t].cap;
    if (g.hasFlareGun) g.flares = 3;
  }
  if (dev.infRes) {
    for (const r of ALL_RES) g.res[r] = Math.max(g.res[r], FRAME_ORDER.includes(r as never) ? 20 : 999);
    g.bandages = 12;
    g.firstAids = 6;
  }
  if (dev.infMoney) g.money = Math.max(g.money, 999999);
}

/* ---------------- выдача ---------------- */
export function giveMoney(g: Game, n: number) {
  g.money += n;
  ok(g, `+${n} ₽`);
}

export function giveWeapon(g: Game, id: WeaponId) {
  const w = WEAPONS[id];
  if (!g.owned[id]) g.owned[id] = { mag: w.mag };
  else g.owned[id].mag = w.mag;
  if (!w.melee) g.reserve[w.ammo] = AMMO[w.ammo].cap;
  g.reserve = { ...g.reserve };
  ok(g, `Выдано: ${w.name}`);
}

export function giveAllWeapons(g: Game) {
  for (const id of ALL_ORDER) {
    const w = WEAPONS[id];
    g.owned[id] = { mag: w.mag };
  }
  for (const t of Object.keys(AMMO) as AmmoType[]) g.reserve[t] = AMMO[t].cap;
  g.hasFlareGun = true;
  g.flares = 3;
  g.reserve = { ...g.reserve };
  ok(g, 'Выдано всё оружие и патроны');
}

export function giveAmmo(g: Game, t: AmmoType) {
  g.reserve[t] = AMMO[t].cap;
  ok(g, `${AMMO[t].name}: полный запас`);
}

export function giveAllAmmo(g: Game) {
  for (const t of Object.keys(AMMO) as AmmoType[]) g.reserve[t] = AMMO[t].cap;
  for (const id of Object.keys(g.owned) as WeaponId[]) if (!WEAPONS[id].melee) g.owned[id].mag = WEAPONS[id].mag;
  ok(g, 'Все патроны пополнены');
}

export function giveRes(g: Game, id: ResId, n: number) {
  g.res[id] += n;
  ok(g, `+${n} ${RES[id].name}`);
}

export function giveAllRes(g: Game, n: number) {
  for (const r of ALL_RES) g.res[r] += FRAME_ORDER.includes(r as never) ? Math.max(1, Math.round(n / 25)) : n;
  ok(g, `Все ресурсы +${n}`);
}

export function giveStruct(g: Game, id: StructId, n: number) {
  g.inv[id] += n;
  ok(g, `${STRUCTS[id].name} ×${n} в инвентарь (B — построить)`);
}

export function giveAllStructs(g: Game) {
  for (const id of STRUCT_ORDER) g.inv[id] += 3;
  ok(g, 'Все постройки ×3 в инвентарь');
}

export function giveFurn(g: Game, id: CraftFurnId, n = 2) {
  g.furnStock[id] = (g.furnStock[id] ?? 0) + n;
  ok(g, `${FURN[id].name} ×${n} (ставьте в подвале — B)`);
}

export function giveAllFurn(g: Game) {
  for (const id of CRAFT_FURN_ORDER) g.furnStock[id] = (g.furnStock[id] ?? 0) + 2;
  ok(g, 'Вся мебель ×2 в запасе');
}

export function giveGenerator(g: Game) {
  g.genStock++;
  ok(g, 'Генератор +1');
}

export function giveFlare(g: Game) {
  g.hasFlareGun = true;
  g.flares = 3;
  ok(g, 'Сигнальный пистолет и патроны');
}

export function giveMedicine(g: Game) {
  g.bandages = 12;
  g.firstAids = 6;
  ok(g, 'Бинты ×12, аптечки ×6');
}

export function healFull(g: Game) {
  const p = g.player;
  p.hp = p.maxHp;
  p.armor = ARMOR_MAX;
  p.burnT = 0;
  p.slowT = 0;
  ok(g, 'Здоровье и броня восстановлены');
}

export function setMaxHp(g: Game, n: number) {
  const p = g.player;
  p.maxHp = Math.max(10, Math.min(99999, n));
  p.hp = p.maxHp;
  ok(g, `Максимальное здоровье: ${p.maxHp}`);
}

export function giveEverything(g: Game) {
  giveAllWeapons(g);
  giveAllRes(g, 200);
  giveAllStructs(g);
  giveAllFurn(g);
  g.genStock += 2;
  giveMedicine(g);
  g.money += 50000;
  healFull(g);
  g.toast('Выдано всё!', 'good');
}

/* ---------------- мир ---------------- */
export function killAll(g: Game) {
  const n = g.enemies.length;
  for (const e of [...g.enemies]) g.killEnemy(e, 0);
  g.toast(n ? `Уничтожено врагов: ${n}` : 'Врагов нет', n ? 'good' : 'info');
  g.emit();
}

export function nuke(g: Game, radius = 520) {
  const p = g.player;
  let n = 0;
  for (const e of [...g.enemies]) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
      g.killEnemy(e, Math.atan2(e.y - p.y, e.x - p.x));
      n++;
    }
  }
  g.rings.push({ x: p.x, y: p.y, max: radius, t: 0, dur: 0.6, color: 'stomp' });
  g.shake = Math.max(g.shake, 10);
  sfx.explosion(200);
  g.toast(`Взрыв: уничтожено ${n}`, 'good');
}

export const SPAWNABLE: EnemyType[] = Object.keys(ENEMIES) as EnemyType[];

export function spawnEnemies(g: Game, type: EnemyType, n: number) {
  if (g.loc !== 'surface') return bad(g, 'В подвале убежища врагов не бывает');
  const p = g.player;
  let made = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 24; k++) {
      const a = p.angle + (Math.random() - 0.5) * 1.6 + (k > 12 ? Math.random() * 6 : 0);
      const d = 130 + Math.random() * 90;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (g.world.grid.circleBlocked(x, y, ENEMIES[type].r + 2)) continue;
      const e = g.spawnOne(type, x, y, true);
      e.aggro = true;
      made++;
      break;
    }
  }
  if (made) ok(g, `${ENEMIES[type].name} ×${made}`);
  else bad(g, 'Здесь нет места');
}

function toSurface(g: Game) {
  g.shopOpen = false;
  g.craftOpen = false;
  g.buildSel = null;
  g.buildOpen = false;
  g.wirePending = null;
  if (g.onTower) fallFromTower(g, 0);
  if (g.inside) g.leaveInterior(false);
  g.loc = 'surface';
}

/** Закончить день: наступает ночь (город открыт, ящики, дома) */
export function toNight(g: Game) {
  if (g.phase === 'night') return bad(g, 'Уже ночь');
  toSurface(g);
  g.enemies.length = 0;
  g.bullets = [];
  g.wave = Math.max(5, Math.ceil(g.wave / 5) * 5);
  g.endDay(0);
  g.player.x = CENTER.x;
  g.player.y = CENTER.y + 100;
  g.emit();
}

/** Наступает новый день (пропускает ночь) */
export function toNextDay(g: Game) {
  if (g.phase === 'day') toNight(g);
  toSurface(g);
  g.player.x = HATCH.x;
  g.player.y = HATCH.y - 44;
  g.newDay();
  g.emit();
}

export function setDay(g: Game, d: number) {
  g.day = Math.max(1, Math.min(999, d));
  ok(g, `День ${g.day}`);
}

export function startWaveNow(g: Game) {
  if (g.phase === 'night') return bad(g, 'Ночью волн не бывает');
  toSurface(g);
  g.startWave(Math.max(1, g.nextWave));
  g.emit();
}

export function setNoWaves(g: Game, v: boolean) {
  dev.noWaves = v;
  if (!v && g.phase === 'day' && g.wave <= 0 && g.toSpawn <= 0) g.intermission = 4;
  g.emit();
}

export function openAllCrates(g: Game) {
  const list = g.crates.filter((c) => !c.opened);
  for (const c of list) openCrate(g, c);
  g.toast(list.length ? `Открыто ящиков: ${list.length}` : 'Ящиков нет', list.length ? 'good' : 'info');
  g.emit();
}

/* ---------------- телепорты ---------------- */
export function tpCamp(g: Game) {
  toSurface(g);
  g.player.x = CENTER.x;
  g.player.y = CENTER.y + 100;
  g.cam.x = g.player.x;
  g.cam.y = g.player.y;
  g.emit();
}

export function tpBasement(g: Game) {
  if (g.inside) g.leaveInterior(false);
  if (g.onTower) fallFromTower(g, 0);
  g.shopOpen = false;
  g.craftOpen = false;
  g.loc = 'basement';
  g.player.x = ENTRY.x;
  g.player.y = ENTRY.y + 12;
  g.buildSel = null;
  g.buildOpen = false;
  g.toast('Подвал убежища (люк в обход ограничений дня)', 'info');
  g.emit();
}

export function tpHatch(g: Game) {
  toSurface(g);
  g.player.x = HATCH.x;
  g.player.y = HATCH.y - 44;
  g.emit();
}

/** Войти в ближайший дом: этаж 'upper' или подвал 'cellar' (при необходимости наступит ночь) */
export function enterNearest(g: Game, kind: 'upper' | 'cellar') {
  toSurface(g);
  if (g.phase !== 'night') toNight(g);
  const p = g.player;
  let best = null as (typeof g.world.accesses)[number] | null;
  let bd = Infinity;
  for (const a of g.world.accesses) {
    if (a.kind !== kind) continue;
    const d = Math.hypot(a.x - CENTER.x, a.y - CENTER.y) + Math.hypot(a.x - p.x, a.y - p.y) * 0.2;
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  if (!best) return bad(g, 'Домов с таким входом не найдено');
  g.enterInterior(best);
  g.emit();
}

export function leaveHouse(g: Game) {
  if (!g.inside) return bad(g, 'Вы не в доме');
  g.leaveInterior(false);
  g.emit();
}

/** Телепорт к курсору (клавиша T) */
export function tpCursor(g: Game) {
  if (g.state !== 'playing') return;
  const m = g.mouseWorld();
  if (g.loc === 'basement') {
    g.player.x = Math.max(30, Math.min(RW - 30, m.x));
    g.player.y = Math.max(WALL_TOP + 20, Math.min(RH - 30, m.y));
    return;
  }
  if (!dev.noclip && g.world.grid.circleBlocked(m.x, m.y, g.player.r)) {
    sfx.deny();
    g.toast('Туда нельзя: место занято', 'bad');
    return;
  }
  g.player.x = m.x;
  g.player.y = m.y;
  g.cam.x = m.x;
  g.cam.y = m.y;
  sfx.pickup();
}
