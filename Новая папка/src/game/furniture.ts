import type { Game } from './engine';
import type { Furn } from './basement';
import { AMMO, ALL_ORDER, WEAPONS, type AmmoType } from './weapons';
import { CRATE_SLOTS, RES, RES_ORDER, slotsUsed, type FurnId, type ResId } from './items';
import { sfx } from './audio';
import { dev } from './dev';

/* ------------------------------------------------------------------ */
/* Использование мебели в подвале                                      */
/* ------------------------------------------------------------------ */
export const SLOT_BET = 50;
export const MAX_HP_CAP = 160;
export const FIREPLACE_BURN = 120;

const USABLE: FurnId[] = ['sofa', 'fridge', 'bookcase', 'safe', 'ammolocker', 'sink', 'gym', 'radio', 'fireplace', 'coffee', 'slots', 'shower', 'planter', 'crate_s', 'crate_m', 'crate_l'];
export const hasUse = (t: FurnId) => USABLE.includes(t);

const free = () => dev.on && dev.noLimits;
const cdLeft = (f: Furn) => Math.ceil(f.cd ?? 0);

const RADIO_LINES = [
  'Торговец в эфире: «Держите, это вам за хорошие вести».',
  'Сквозь шум: «…отряд мародёров ушёл на север. Вот вам припасы».',
  'Позывной «Лис»: «Нашёл склад, делюсь. Не благодарите».',
  'Чей-то голос: «Если слышите — держитесь. Посылаю груз».',
];

export function furnPrompt(g: Game, f: Furn): string {
  switch (f.type) {
    case 'sofa':
      return f.used && !free() ? 'Вы уже отдыхали сегодня' : 'Отдохнуть на диване (+40 HP, раз в день)';
    case 'fridge':
      return f.used && !free() ? 'Холодильник пуст до завтра' : 'Достать перекус (+25 HP, раз в день)';
    case 'bookcase':
      return f.used && !free() ? 'Всё уже прочитано сегодня' : 'Порыться в книгах (+2 Детали, раз в день)';
    case 'safe':
      return `Сейф: ${f.store ?? 0} ₽ · E — положить всё (${g.money} ₽) · F — забрать`;
    case 'ammolocker':
      return f.used && !free() ? 'Шкаф уже пополнен сегодня' : 'Взять патроны из шкафа (раз в день)';
    case 'sink':
      return (f.cd ?? 0) > 0 && !free() ? `Вода набирается… ${cdLeft(f)} с` : 'Умыться (+8 HP, тушит огонь)';
    case 'gym':
      return g.player.maxHp >= MAX_HP_CAP ? 'Вы в отличной форме (макс. здоровье достигнуто)' : f.used && !free() ? 'Вы уже тренировались сегодня' : `Потренироваться (+5 к макс. здоровью, сейчас ${g.player.maxHp})`;
    case 'radio':
      return f.used && !free() ? 'Эфир пуст до завтра' : 'Выйти на связь с торговцем (раз в день)';
    case 'fireplace':
      return (f.cd ?? 0) > 0 ? `Камин горит (${cdLeft(f)} с) · E — подбросить доску` : 'Растопить камин (1 доска)';
    case 'coffee':
      return (f.cd ?? 0) > 0 && !free() ? `Кофе варится… ${cdLeft(f)} с` : 'Выпить кофе (скорость +25%, 90 с)';
    case 'slots':
      return (f.cd ?? 0) > 0 ? 'Барабаны крутятся…' : `Крутить автомат за ${SLOT_BET} ₽ (у вас ${g.money} ₽)`;
    case 'shower':
      return (f.cd ?? 0) > 0 && !free() ? `Вода греется… ${cdLeft(f)} с` : 'Помыться (+30 HP, снимает яд и огонь)';
    case 'planter':
      return f.used && !free() ? 'Урожай соберут завтра' : 'Собрать урожай (+2 Ткани, +10 HP)';
    case 'crate_s':
    case 'crate_m':
    case 'crate_l':
      return `Ящик (${slotsUsed(f.box ?? {})}/${CRATE_SLOTS[f.type]} ячеек) · E — открыть`;
    default:
      return '';
  }
}

const heal = (g: Game, n: number) => {
  const p = g.player;
  p.hp = Math.min(p.maxHp, p.hp + n);
};

export function useFurn(g: Game, f: Furn) {
  const p = g.player;
  const deny = (m: string) => {
    sfx.deny();
    g.toast(m, 'info');
  };
  const daily = (msgDone: string) => {
    if (f.used && !free()) {
      deny(msgDone);
      return false;
    }
    f.used = true;
    return true;
  };
  switch (f.type) {
    case 'crate_s':
    case 'crate_m':
    case 'crate_l':
      g.openStorage(f);
      return;
    case 'sofa': {
      if (p.hp >= p.maxHp && !free()) return deny('Вы и так бодры');
      if (!daily('Вы уже отдыхали сегодня')) return;
      heal(g, 40);
      sfx.bandage();
      g.toast('Вы немного отдохнули на диване: +40 HP', 'good');
      return;
    }
    case 'fridge': {
      if (!daily('Холодильник пуст до завтра')) return;
      heal(g, 25);
      sfx.buy();
      g.toast('Нашли консервы и сухари: +25 HP', 'good');
      return;
    }
    case 'bookcase': {
      if (!daily('Всё интересное уже прочитано')) return;
      g.addRes('parts', 2);
      sfx.pickup();
      g.toast('В книгах нашли схемы: +2 Детали', 'good');
      return;
    }
    case 'safe': {
      if (g.money <= 0) return deny(f.store ? 'Деньги в сейфе. F — забрать' : 'Нечего класть в сейф');
      f.store = (f.store ?? 0) + g.money;
      g.toast(`В сейф положено ${g.money} ₽ · всего ${f.store} ₽`, 'good');
      g.money = 0;
      sfx.buy();
      return;
    }
    case 'ammolocker': {
      if (!daily('Шкаф уже пополнен сегодня')) return;
      const types = new Set<AmmoType>();
      for (const id of ALL_ORDER) if (g.owned[id] && !WEAPONS[id].melee) types.add(WEAPONS[id].ammo);
      let n = 0;
      for (const t of types) {
        const a = AMMO[t];
        if (g.reserve[t] >= a.cap) continue;
        g.reserve[t] = Math.min(a.cap, g.reserve[t] + a.pack);
        n++;
      }
      sfx.reloadDone();
      g.toast(n > 0 ? `Из шкафа взято патронов: ${n} видов` : 'Патронов у вас и так полно', n > 0 ? 'good' : 'info');
      return;
    }
    case 'sink': {
      if ((f.cd ?? 0) > 0 && !free()) return deny('Вода ещё набирается');
      f.cd = 12;
      heal(g, 8);
      p.burnT = 0;
      p.slowT = 0;
      sfx.genRefuel();
      g.toast('Вы умылись: +8 HP, огонь потушен', 'good');
      return;
    }
    case 'gym': {
      if (p.maxHp >= MAX_HP_CAP) return deny('Вы в отличной форме — больше расти некуда');
      if (!daily('Вы уже тренировались сегодня')) return;
      p.maxHp = Math.min(MAX_HP_CAP, p.maxHp + 5);
      heal(g, 5);
      sfx.thud();
      g.toast(`Тренировка! Максимальное здоровье: ${p.maxHp}`, 'good');
      return;
    }
    case 'radio': {
      if (!daily('Эфир пуст до завтра')) return;
      const picks: ResId[] = [];
      for (let i = 0; i < 2; i++) picks.push(RES_ORDER[Math.floor(Math.random() * RES_ORDER.length)]);
      const out: string[] = [];
      for (const r of picks) {
        const n = 2 + Math.floor(Math.random() * 3);
        g.addRes(r, n);
        out.push(`+${n} ${RES[r].name}`);
      }
      sfx.pickup();
      g.toast(RADIO_LINES[Math.floor(Math.random() * RADIO_LINES.length)], 'info');
      g.toast('Припасы: ' + out.join(', '), 'good');
      return;
    }
    case 'fireplace': {
      if (g.res.wood <= 0 && !(dev.on && dev.infRes)) return deny('Нужна доска (▤) для растопки');
      if (!(dev.on && dev.infRes)) g.res.wood--;
      f.cd = Math.min(FIREPLACE_BURN * 2, (f.cd ?? 0) + FIREPLACE_BURN);
      sfx.genStart();
      g.toast('Дрова занялись. Рядом с камином раны затягиваются', 'good');
      return;
    }
    case 'coffee': {
      if ((f.cd ?? 0) > 0 && !free()) return deny('Кофе ещё варится');
      f.cd = 45;
      p.speedT = 90;
      sfx.bandage();
      g.toast('Кофе! Скорость +25% на 90 секунд', 'good');
      return;
    }
    case 'slots': {
      if ((f.cd ?? 0) > 0) return;
      if (g.money < SLOT_BET && !(dev.on && dev.infMoney)) return deny('Не хватает денег на ставку');
      g.money -= SLOT_BET;
      f.cd = 0.9;
      const r = Math.random();
      let win = 0;
      let code = 0;
      if (r < 0.04) {
        win = SLOT_BET * 10;
        code = 3;
      } else if (r < 0.16) {
        win = SLOT_BET * 3;
        code = 2;
      } else if (r < 0.38) {
        win = SLOT_BET;
        code = 1;
      }
      f.store = code;
      sfx.tick();
      // выплата — после остановки барабанов
      window.setTimeout(() => {
        if (g.state !== 'playing') return;
        g.money += win;
        if (win >= SLOT_BET * 10) {
          g.toast(`ДЖЕКПОТ! +${win} ₽`, 'good');
          sfx.buy();
        } else if (win > SLOT_BET) {
          g.toast(`Выигрыш! +${win} ₽`, 'good');
          sfx.buy();
        } else if (win === SLOT_BET) {
          g.toast('Ставка вернулась', 'info');
          sfx.pickup();
        } else {
          g.toast(`Не повезло: −${SLOT_BET} ₽`, 'bad');
          sfx.deny();
        }
      }, 900);
      return;
    }
    case 'shower': {
      if ((f.cd ?? 0) > 0 && !free()) return deny('Вода греется');
      f.cd = 40;
      heal(g, 30);
      p.burnT = 0;
      p.slowT = 0;
      sfx.genRefuel();
      g.toast('Тёплый душ: +30 HP, яд и огонь смыты', 'good');
      return;
    }
    case 'planter': {
      if (!daily('Урожай соберут завтра')) return;
      g.addRes('cloth', 2);
      heal(g, 10);
      sfx.pickup();
      g.toast('Урожай: +2 Ткани, +10 HP', 'good');
      return;
    }
  }
}

/** Клавиша F рядом с мебелью (забрать деньги из сейфа) */
export function altFurn(g: Game, f: Furn) {
  if (f.type !== 'safe') return;
  if (!f.store) {
    sfx.deny();
    g.toast('Сейф пуст', 'info');
    return;
  }
  g.money += f.store;
  g.toast(`Из сейфа взято ${f.store} ₽`, 'good');
  f.store = 0;
  sfx.buy();
}

/** Таймеры, эффекты: вызывается каждый кадр */
export function tickFurniture(g: Game, dt: number) {
  const p = g.player;
  if (p.speedT > 0) p.speedT = Math.max(0, p.speedT - dt);
  for (const f of g.furn) {
    if ((f.cd ?? 0) > 0) f.cd = Math.max(0, (f.cd ?? 0) - dt);
    if (g.loc !== 'basement') continue;
    if (f.type === 'fireplace' && (f.cd ?? 0) > 0 && Math.hypot(p.x - f.x, p.y - f.y) < 135 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + dt * 2.6);
    }
  }
}
