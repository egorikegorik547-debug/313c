import type { AmmoType, WeaponId } from './weapons';

/* ------------------------------------------------------------------ */
/* Ресурсы                                                             */
/* ------------------------------------------------------------------ */
export type ResId = 'scrap' | 'wood' | 'cloth' | 'powder' | 'parts' | 'gas' | FrameId;

/** Основы оружия: выпадают из армейских ящиков */
export type FrameId = 'f_pistol' | 'f_smg' | 'f_shotgun' | 'f_rifle' | 'f_sniper' | 'f_mg';

export const RES_ORDER: ResId[] = ['scrap', 'wood', 'cloth', 'powder', 'parts', 'gas'];
export const FRAME_ORDER: FrameId[] = ['f_pistol', 'f_smg', 'f_shotgun', 'f_rifle', 'f_sniper', 'f_mg'];
export const ALL_RES: ResId[] = [...RES_ORDER, ...FRAME_ORDER];

export const RES: Record<ResId, { name: string; icon: string; color: string }> = {
  scrap: { name: 'Металлолом', icon: '⚙', color: '#9aa4ad' },
  wood: { name: 'Доски', icon: '▤', color: '#b0814a' },
  cloth: { name: 'Ткань', icon: '≋', color: '#c9b8a0' },
  powder: { name: 'Порох', icon: '✹', color: '#d8a548' },
  parts: { name: 'Детали', icon: '⌁', color: '#6fd0e8' },
  gas: { name: 'Бензин', icon: '⛽', color: '#ffb347' },
  f_pistol: { name: 'Основа пистолета', icon: '▭', color: '#e0b060' },
  f_smg: { name: 'Основа ПП', icon: '▬', color: '#e0b060' },
  f_shotgun: { name: 'Основа дробовика', icon: '═', color: '#e0b060' },
  f_rifle: { name: 'Основа штурмовой винтовки', icon: '╪', color: '#e0b060' },
  f_sniper: { name: 'Основа снайперской винтовки', icon: '┿', color: '#e0b060' },
  f_mg: { name: 'Основа пулемёта', icon: '╋', color: '#e0b060' },
};

export const emptyRes = (): Record<ResId, number> => ({ scrap: 0, wood: 0, cloth: 0, powder: 0, parts: 0, gas: 0, f_pistol: 0, f_smg: 0, f_shotgun: 0, f_rifle: 0, f_sniper: 0, f_mg: 0 });
export type Cost = Partial<Record<ResId, number>>;

/* ------------------------------------------------------------------ */
/* Инвентарь: ячейки и рюкзаки                                         */
/* ------------------------------------------------------------------ */
/** Сколько ячеек даёт игроку без рюкзака */
export const BASE_SLOTS = 4;

/** В одной ячейке лежит один вид ресурса; это — размер стопки */
export const STACK: Record<ResId, number> = {
  scrap: 30, wood: 30, cloth: 30, powder: 30, parts: 20, gas: 10,
  f_pistol: 3, f_smg: 3, f_shotgun: 3, f_rifle: 3, f_sniper: 3, f_mg: 3,
};

export type BackpackId = 'bag' | 'school' | 'hiker' | 'army' | 'tactical' | 'expedition';
export interface BackpackDef {
  id: BackpackId;
  name: string;
  desc: string;
  /** сколько ячеек даёт (вместе с базовыми 4 — итого) */
  slots: number;
  cost: Cost;
  color: string;
  accent: string;
}
export const BACKPACKS: BackpackDef[] = [
  { id: 'bag', name: 'Тканевая сумка', desc: 'Сшитая из тряпок наплечная сумка.', slots: 2, cost: { cloth: 6 }, color: '#8a7a5a', accent: '#c9b8a0' },
  { id: 'school', name: 'Школьный рюкзак', desc: 'Потёртый детский рюкзак с карманами.', slots: 4, cost: { cloth: 10, scrap: 2 }, color: '#4a6a8a', accent: '#e0b84a' },
  { id: 'hiker', name: 'Туристический рюкзак', desc: 'Вместительный, на жёсткой раме.', slots: 6, cost: { cloth: 14, wood: 2, scrap: 6 }, color: '#5a7a4a', accent: '#d8d070' },
  { id: 'army', name: 'Армейский рюкзак', desc: 'Прочный камуфляжный ранец.', slots: 9, cost: { cloth: 16, scrap: 10, parts: 2 }, color: '#59603f', accent: '#a8b070' },
  { id: 'tactical', name: 'Тактический рюкзак', desc: 'Система MOLLE, множество подсумков.', slots: 12, cost: { cloth: 20, scrap: 14, parts: 5 }, color: '#2f3338', accent: '#6fd0e8' },
  { id: 'expedition', name: 'Экспедиционный рюкзак', desc: 'Огромный рюкзак для дальних вылазок.', slots: 16, cost: { cloth: 26, scrap: 20, parts: 8 }, color: '#8a3a2a', accent: '#ffb347' },
];
export const BACKPACK: Record<BackpackId, BackpackDef> = Object.fromEntries(BACKPACKS.map((b) => [b.id, b])) as Record<BackpackId, BackpackDef>;
export const BACKPACK_IDS: BackpackId[] = BACKPACKS.map((b) => b.id);

/** Сколько ячеек занимают ресурсы */
export const slotsUsed = (res: Partial<Record<ResId, number>>): number => ALL_RES.reduce((n, r) => n + Math.ceil(Math.max(0, res[r] ?? 0) / STACK[r]), 0);
/** Сколько штук ресурса r (из n) поместится в хранилище на `slots` ячеек */
export function fitCount(res: Partial<Record<ResId, number>>, slots: number, r: ResId, n: number): number {
  const have = Math.max(0, res[r] ?? 0);
  const st = STACK[r];
  const room = have > 0 ? Math.ceil(have / st) * st - have : 0;
  const free = Math.max(0, slots - slotsUsed(res));
  return Math.max(0, Math.min(n, room + free * st));
}

/* ------------------------------------------------------------------ */
/* Сооружения (покупаются у торговца и ставятся на поверхности)       */
/* ------------------------------------------------------------------ */
export type StructId =
  | 'barricade'
  | 'wire'
  | 'mine'
  | 'fence'
  | 'gate'
  | 'tower'
  | 'turret_mg'
  | 'turret_shotgun'
  | 'turret_flame'
  | 'turret_tesla'
  | 'workbench';

export type StructKind = 'wall' | 'wire' | 'mine' | 'gate' | 'tower' | 'turret' | 'bench';

export interface TurretStats {
  ammo: AmmoType;
  /** выстрелов на 1 единицу запаса */
  perUnit: number;
  cap: number;
  range: number;
  cd: number;
  dmg: number;
  pellets: number;
  spread: number;
  speed: number;
  color: string;
}

export interface StructDef {
  id: StructId;
  name: string;
  desc: string;
  price: number;
  w: number;
  h: number;
  hp: number;
  kind: StructKind;
  rotatable: boolean;
  turret?: TurretStats;
  group: 'defense' | 'turret' | 'utility';
  craft?: Cost;
}

export const STRUCTS: Record<StructId, StructDef> = {
  barricade: {
    id: 'barricade', name: 'Баррикада', desc: 'Прочная баррикада из досок и листов железа. Зомби будут грызть её, пока вы стреляете.',
    price: 60, w: 70, h: 22, hp: 320, kind: 'wall', rotatable: true, group: 'defense', craft: { wood: 4, scrap: 1 },
  },
  wire: {
    id: 'wire', name: 'Колючая проволока', desc: 'Замедляет врагов и рвёт им ноги. Постепенно изнашивается.',
    price: 90, w: 76, h: 30, hp: 140, kind: 'wire', rotatable: true, group: 'defense', craft: { scrap: 3, cloth: 1 },
  },
  mine: {
    id: 'mine', name: 'Противопехотная мина', desc: 'Взрывается под ногами зомби. Вас не задевает. Взводится 1.5 с.',
    price: 120, w: 22, h: 22, hp: 1, kind: 'mine', rotatable: false, group: 'defense', craft: { scrap: 2, powder: 3 },
  },
  fence: {
    id: 'fence', name: 'Забор', desc: 'Секция металлического забора. Пули проходят насквозь, зомби — нет.',
    price: 70, w: 84, h: 12, hp: 200, kind: 'wall', rotatable: true, group: 'defense', craft: { scrap: 3, wood: 2 },
  },
  gate: {
    id: 'gate', name: 'Ворота', desc: 'Створка ворот. Откройте или закройте — клавиша E рядом с воротами.',
    price: 160, w: 92, h: 14, hp: 260, kind: 'gate', rotatable: true, group: 'defense',
  },
  tower: {
    id: 'tower', name: 'Сторожевая вышка', desc: 'Залезьте на неё (E): обзор шире, пули летят над препятствиями, а зомби добираются только до опор.',
    price: 700, w: 72, h: 72, hp: 700, kind: 'tower', rotatable: false, group: 'utility',
  },
  turret_mg: {
    id: 'turret_mg', name: 'Пулемётная турель', desc: 'Скорострельная автоматическая турель. Ест патроны 9×18 мм.',
    price: 900, w: 36, h: 36, hp: 220, kind: 'turret', rotatable: false, group: 'turret',
    turret: { ammo: '9mm', perUnit: 3, cap: 240, range: 420, cd: 0.1, dmg: 15, pellets: 1, spread: 0.07, speed: 1100, color: '#c9a95a' },
  },
  turret_shotgun: {
    id: 'turret_shotgun', name: 'Дробовая турель', desc: 'Сметает всё на ближней дистанции залпом картечи. Заряжается 12 калибром.',
    price: 1100, w: 36, h: 36, hp: 240, kind: 'turret', rotatable: false, group: 'turret',
    turret: { ammo: '12ga', perUnit: 1, cap: 30, range: 270, cd: 0.85, dmg: 13, pellets: 8, spread: 0.24, speed: 900, color: '#d86a4a' },
  },
  turret_flame: {
    id: 'turret_flame', name: 'Огнемётная турель', desc: 'Поливает приближающихся врагов огнём. Топливо — как для «Дракона».',
    price: 1500, w: 36, h: 36, hp: 260, kind: 'turret', rotatable: false, group: 'turret',
    turret: { ammo: 'fuel', perUnit: 4, cap: 320, range: 215, cd: 0.05, dmg: 8, pellets: 1, spread: 0.14, speed: 420, color: '#ff9a3a' },
  },
  turret_tesla: {
    id: 'turret_tesla', name: 'Тесла-турель', desc: 'Цепная молния поражает до 4 врагов подряд, игнорируя броню. Питается энергоячейками.',
    price: 2200, w: 36, h: 36, hp: 240, kind: 'turret', rotatable: false, group: 'turret',
    turret: { ammo: 'energy', perUnit: 2, cap: 160, range: 310, cd: 0.55, dmg: 40, pellets: 1, spread: 0, speed: 0, color: '#8fd0ff' },
  },
  workbench: {
    id: 'workbench', name: 'Верстак', desc: 'Позволяет крафтить патроны, аптечки и ловушки из найденных ресурсов. Ставится на поверхности или в подвале.',
    price: 600, w: 76, h: 38, hp: 300, kind: 'bench', rotatable: true, group: 'utility',
  },
};

export const STRUCT_ORDER: StructId[] = [
  'barricade', 'fence', 'gate', 'wire', 'mine', 'tower',
  'turret_mg', 'turret_shotgun', 'turret_flame', 'turret_tesla', 'workbench',
];

/* ------------------------------------------------------------------ */
/* Мебель подвала                                                      */
/* ------------------------------------------------------------------ */
/** Мебель, которую нужно изготовить на верстаке (ставится из запаса) */
export type CraftFurnId =
  | 'sofa'
  | 'fridge'
  | 'bookcase'
  | 'safe'
  | 'ammolocker'
  | 'sink'
  | 'gym'
  | 'radio'
  | 'fireplace'
  | 'coffee'
  | 'slots'
  | 'shower'
  | 'planter'
  | 'floorlamp'
  | 'crate_s'
  | 'crate_m'
  | 'crate_l';

export type FurnId = 'bed' | 'medcab' | 'armorstand' | 'stove' | 'lamp' | 'rug' | 'shelf' | 'table' | 'workbench' | 'generator' | 'bulb' | CraftFurnId;

export interface FurnDef {
  id: FurnId;
  name: string;
  desc: string;
  w: number;
  h: number;
  cost: Cost;
  solid: boolean;
  /** делается на верстаке; cost — стоимость крафта */
  crafted?: boolean;
  /** короткая подсказка «что делает» */
  use?: string;
}

export const FURN: Record<Exclude<FurnId, 'workbench'>, FurnDef> = {
  generator: { id: 'generator', name: 'Бензиновый генератор', desc: 'Крутит электричество из бензина. Заправка — F, пуск — E. К нему тянутся провода к лампам и лампочкам.', w: 78, h: 54, cost: {}, solid: true },
  bulb: { id: 'bulb', name: 'Лампочка', desc: 'Подвесная лампочка на проводе. Горит только от генератора.', w: 16, h: 16, cost: { parts: 1, cloth: 1 }, solid: false },
  bed: { id: 'bed', name: 'Кровать', desc: 'Сон до утра. Полностью восстанавливает здоровье и даёт броню.', w: 84, h: 46, cost: { cloth: 6, wood: 6 }, solid: true },
  medcab: { id: 'medcab', name: 'Аптечный шкаф', desc: 'Раз в день бесплатно лечит до 100 HP.', w: 44, h: 28, cost: { cloth: 3, parts: 2, scrap: 4 }, solid: true },
  armorstand: { id: 'armorstand', name: 'Стойка с бронёй', desc: 'Раз в день бесплатно чинит бронежилет.', w: 40, h: 40, cost: { scrap: 10, parts: 2 }, solid: true },
  stove: { id: 'stove', name: 'Буржуйка', desc: 'Тепло и уют: рядом медленно лечит.', w: 36, h: 36, cost: { scrap: 6, wood: 2 }, solid: true },
  lamp: { id: 'lamp', name: 'Лампа', desc: 'Тёплый свет. Подключённая к генератору — горит ярко и ровно.', w: 22, h: 22, cost: { parts: 1, scrap: 1 }, solid: false },
  rug: { id: 'rug', name: 'Ковёр', desc: 'Делает подвал уютнее.', w: 110, h: 70, cost: { cloth: 5 }, solid: false },
  shelf: { id: 'shelf', name: 'Стеллаж', desc: 'Полка с припасами и банками.', w: 80, h: 26, cost: { wood: 5 }, solid: true },
  table: { id: 'table', name: 'Стол с картой', desc: 'Карта города с отметками вылазок.', w: 70, h: 44, cost: { wood: 4 }, solid: true },

  /* ---- мебель с верстака ---- */
  sofa: { id: 'sofa', name: 'Диван', desc: 'Мягкий диван из тряпок и досок.', use: 'Раз в день отдых: +40 HP', w: 96, h: 42, cost: { cloth: 10, wood: 6 }, solid: true, crafted: true },
  fridge: { id: 'fridge', name: 'Холодильник', desc: 'Старый, но с припасами. Работает только как шкаф, зато закуски в нём не портятся.', use: 'Раз в день перекус: +25 HP', w: 44, h: 44, cost: { scrap: 12, parts: 3 }, solid: true, crafted: true },
  bookcase: { id: 'bookcase', name: 'Книжный шкаф', desc: 'В книгах попадаются схемы и чертежи.', use: 'Раз в день находка: +2 Детали', w: 86, h: 28, cost: { wood: 10, cloth: 2 }, solid: true, crafted: true },
  safe: { id: 'safe', name: 'Сейф', desc: 'Надёжный стальной сейф: копите деньги на крупные покупки и не таскайте их с собой.', use: 'E — положить деньги · F — забрать', w: 38, h: 38, cost: { scrap: 20, parts: 4 }, solid: true, crafted: true },
  ammolocker: { id: 'ammolocker', name: 'Оружейный шкаф', desc: 'Стальной шкаф с ящиками для патронов.', use: 'Раз в день: пачка патронов для вашего оружия', w: 50, h: 30, cost: { scrap: 14, wood: 4, parts: 2 }, solid: true, crafted: true },
  sink: { id: 'sink', name: 'Умывальник', desc: 'Ржавая раковина с бачком воды. Смывает грязь, кровь и огонь.', use: 'Умыться: +8 HP, тушит огонь (пауза 12 с)', w: 40, h: 30, cost: { scrap: 8, parts: 2 }, solid: true, crafted: true },
  gym: { id: 'gym', name: 'Тренажёр', desc: 'Штанга и скамья. Регулярные тренировки закаляют тело.', use: 'Раз в день тренировка: +5 к макс. здоровью (до 160)', w: 64, h: 40, cost: { scrap: 14, wood: 3 }, solid: true, crafted: true },
  radio: { id: 'radio', name: 'Радиоприёмник', desc: 'Ловит рации торговцев и мародёров.', use: 'Раз в день: торговец присылает припасы', w: 34, h: 26, cost: { parts: 5, scrap: 4, cloth: 1 }, solid: true, crafted: true },
  fireplace: { id: 'fireplace', name: 'Камин', desc: 'Большой очаг: в тепле раны затягиваются быстрее буржуйки.', use: 'E — подбросить доску (горит 2 мин, лечит рядом)', w: 70, h: 36, cost: { scrap: 10, wood: 6 }, solid: true, crafted: true },
  coffee: { id: 'coffee', name: 'Кофемашина', desc: 'Доисторическая турка на горелке. Бодрит лучше любой аптечки.', use: 'E — кофе: скорость +25% на 90 с', w: 30, h: 30, cost: { parts: 4, scrap: 6 }, solid: true, crafted: true },
  slots: { id: 'slots', name: 'Игровой автомат', desc: 'Однорукий бандит из довоенного бара. Рискнёте деньгами?', use: 'E — крутить за 50 ₽ (до ×10)', w: 40, h: 36, cost: { scrap: 16, parts: 8 }, solid: true, crafted: true },
  shower: { id: 'shower', name: 'Душ', desc: 'Бак с водой и лейка. Смывает яд, кислоту и усталость.', use: 'Помыться: +30 HP, снимает яд и огонь (пауза 40 с)', w: 44, h: 44, cost: { scrap: 10, parts: 4, cloth: 2 }, solid: true, crafted: true },
  planter: { id: 'planter', name: 'Грядка', desc: 'Лотки с землёй под лампой: лён и овощи.', use: 'Раз в день урожай: +2 Ткани, +10 HP', w: 60, h: 30, cost: { wood: 6, cloth: 3 }, solid: true, crafted: true },
  crate_s: { id: 'crate_s', name: 'Малый ящик', desc: 'Небольшой деревянный ящик для ресурсов. Содержимое не занимает место в рюкзаке.', use: 'E — открыть · хранит 4 ячейки', w: 38, h: 30, cost: { wood: 6, scrap: 2 }, solid: true, crafted: true },
  crate_m: { id: 'crate_m', name: 'Средний ящик', desc: 'Крепкий ящик, окованный железом. Вмещает вдвое больше малого.', use: 'E — открыть · хранит 8 ячеек', w: 54, h: 34, cost: { wood: 12, scrap: 6, parts: 1 }, solid: true, crafted: true },
  crate_l: { id: 'crate_l', name: 'Большой ящик', desc: 'Огромный армейский ящик с замками. Лучший способ хранить запасы.', use: 'E — открыть · хранит 14 ячеек', w: 76, h: 40, cost: { wood: 20, scrap: 12, parts: 3, cloth: 2 }, solid: true, crafted: true },
  floorlamp: { id: 'floorlamp', name: 'Торшер', desc: 'Напольная лампа с абажуром. Светит мягко и уютно, без генератора.', use: 'Тёплый свет', w: 22, h: 22, cost: { parts: 2, scrap: 3, cloth: 2 }, solid: false, crafted: true },
};
export const FURN_ORDER: Exclude<FurnId, 'workbench' | CraftFurnId>[] = ['bed', 'medcab', 'armorstand', 'stove', 'generator', 'lamp', 'bulb', 'table', 'shelf', 'rug'];
export const CRAFT_FURN_ORDER: CraftFurnId[] = ['sofa', 'fridge', 'bookcase', 'safe', 'ammolocker', 'sink', 'gym', 'radio', 'fireplace', 'coffee', 'slots', 'shower', 'planter', 'floorlamp', 'crate_s', 'crate_m', 'crate_l'];
/** Ящики для хранения: вместимость в ячейках */
export const CRATE_SLOTS: Partial<Record<FurnId, number>> = { crate_s: 4, crate_m: 8, crate_l: 14 };
export const isCrate = (id: string): boolean => id in CRATE_SLOTS;
export const crateFill = (type: FurnId, box?: Partial<Record<ResId, number>>): number => {
  const cap = CRATE_SLOTS[type] ?? 1;
  return Math.min(1, slotsUsed(box ?? {}) / cap);
};
export const isCraftFurn = (id: string): id is CraftFurnId => (CRAFT_FURN_ORDER as string[]).includes(id);
export const emptyFurnStock = (): Record<CraftFurnId, number> => Object.fromEntries(CRAFT_FURN_ORDER.map((k) => [k, 0])) as Record<CraftFurnId, number>;

/** Провод: тянется от генератора (или лампы) к лампе / лампочке */
export const WIRE_COST: Cost = { scrap: 1, cloth: 1 };
export const WIRE_RANGE = 340;
export const GEN_CAP = 100;
export const GEN_CAN = 25;
export const GEN_MAX_LOAD = 8;
export const GEN_PRICE = 1500;
export const GAS_PRICE = 110;

/* ------------------------------------------------------------------ */
/* Рецепты верстака                                                    */
/* ------------------------------------------------------------------ */
export type Recipe =
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'ammo'; id: AmmoType; n: number } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'medkit' } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'bandage' } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'firstaid' } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'weapon'; id: WeaponId } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'armor' } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'item'; id: StructId; n: number } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'furn'; id: CraftFurnId } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'generator' } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'backpack'; id: BackpackId } }
  | { id: string; name: string; desc: string; cost: Cost; out: { kind: 'gas'; n: number } };

export const RECIPES: Recipe[] = [
  { id: 'a9', name: 'Патроны 9×18 мм ×30', desc: 'Для ПМ, ПП, Глока, турели', cost: { scrap: 2, powder: 1 }, out: { kind: 'ammo', id: '9mm', n: 30 } },
  { id: 'a45', name: 'Патроны .45 ×12', desc: 'Для Питона и Пустынного орла', cost: { scrap: 2, powder: 2 }, out: { kind: 'ammo', id: '45', n: 12 } },
  { id: 'a12', name: 'Картечь 12 калибра ×12', desc: 'Для дробовиков и турели', cost: { scrap: 2, powder: 2 }, out: { kind: 'ammo', id: '12ga', n: 12 } },
  { id: 'a545', name: 'Патроны 5.45×39 ×30', desc: 'Для АК-74, M4, РПК', cost: { scrap: 3, powder: 2 }, out: { kind: 'ammo', id: '545', n: 30 } },
  { id: 'a939', name: 'Патроны 9×39 ×20', desc: 'Для винтореза ВСС — дозвуковые, бесшумные', cost: { scrap: 3, powder: 2, parts: 1 }, out: { kind: 'ammo', id: '9x39', n: 20 } },
  { id: 'a762', name: 'Патроны 7.62×54 ×10', desc: 'Для СКС, СВД, Мосина, АКМ, ПКМ', cost: { scrap: 3, powder: 3 }, out: { kind: 'ammo', id: '762', n: 10 } },
  { id: 'aen', name: 'Энергоячейки ×20', desc: 'Для тесла-турели и энергооружия', cost: { parts: 3, scrap: 2 }, out: { kind: 'ammo', id: 'energy', n: 20 } },
  { id: 'afu', name: 'Топливо ×50', desc: 'Для огнемёта и огнемётной турели', cost: { powder: 2, cloth: 2 }, out: { kind: 'ammo', id: 'fuel', n: 50 } },
  { id: 'arc', name: 'Реактивные снаряды ×2', desc: 'Для гранатомёта и «Шершня»', cost: { parts: 2, powder: 4, scrap: 3 }, out: { kind: 'ammo', id: 'rocket', n: 2 } },
  { id: 'abolt', name: 'Арбалетные болты ×8', desc: 'Для арбалета', cost: { wood: 1, scrap: 2 }, out: { kind: 'ammo', id: 'bolt', n: 8 } },
  { id: 'aarrow', name: 'Стрелы ×10', desc: 'Для блочного лука', cost: { wood: 2, scrap: 1, cloth: 1 }, out: { kind: 'ammo', id: 'arrow', n: 10 } },
  { id: 'band', name: 'Бинт ×2', desc: 'Носите с собой. Клавиша G — перевязка, +25 HP', cost: { cloth: 2 }, out: { kind: 'bandage' } },
  { id: 'aid', name: 'Аптечка', desc: 'Носите с собой. Клавиша H — мгновенно +70 HP', cost: { cloth: 3, powder: 1, parts: 1 }, out: { kind: 'firstaid' } },
  { id: 'med', name: 'Лечение на месте', desc: 'Сразу лечит 50 HP', cost: { cloth: 3, powder: 1 }, out: { kind: 'medkit' } },
  { id: 'arm', name: 'Бронепластины', desc: 'Полностью чинит бронежилет', cost: { scrap: 8, cloth: 2 }, out: { kind: 'armor' } },
  { id: 'c_barr', name: 'Баррикада', desc: 'В инвентарь', cost: STRUCTS.barricade.craft ?? {}, out: { kind: 'item', id: 'barricade', n: 1 } },
  { id: 'c_fence', name: 'Забор', desc: 'В инвентарь', cost: STRUCTS.fence.craft ?? {}, out: { kind: 'item', id: 'fence', n: 1 } },
  { id: 'c_wire', name: 'Колючая проволока', desc: 'В инвентарь', cost: STRUCTS.wire.craft ?? {}, out: { kind: 'item', id: 'wire', n: 1 } },
  { id: 'c_mine', name: 'Мина', desc: 'В инвентарь', cost: STRUCTS.mine.craft ?? {}, out: { kind: 'item', id: 'mine', n: 1 } },
  { id: 'c_gen', name: 'Бензиновый генератор', desc: 'Двигатель, динамо и рама. Ставится в подвале (клавиша B), работает на бензине', cost: { scrap: 16, parts: 6, powder: 2, cloth: 2 }, out: { kind: 'generator' } },
];


const G = (id: string, wid: WeaponId, name: string, cost: Cost, desc: string): Recipe => ({ id, name, desc, cost, out: { kind: 'weapon', id: wid } });
export const WEAPON_RECIPES: Recipe[] = [
  G('w_glock', 'glock', 'Глок-17', { f_pistol: 1, scrap: 5 }, 'Основа пистолета + металл'),
  G('w_aps', 'aps', 'АПС «Стечкин»', { f_pistol: 1, scrap: 6, parts: 1 }, 'Основа пистолета + металл'),
  G('w_revolver', 'revolver', 'Револьвер «Питон»', { f_pistol: 1, scrap: 7, parts: 1 }, 'Основа пистолета + металл'),
  G('w_deagle', 'deagle', 'Пустынный орёл', { f_pistol: 1, scrap: 8, parts: 2 }, 'Основа пистолета + металл'),
  G('w_smg', 'smg', 'Пистолет-пулемёт', { f_smg: 1, scrap: 6 }, 'Основа ПП + металл'),
  G('w_uzi', 'uzi', 'Узи', { f_smg: 1, scrap: 6, cloth: 1 }, 'Основа ПП + металл'),
  G('w_silsmg', 'silsmg', 'Бесшумный ПП «Тень»', { f_smg: 1, scrap: 8, parts: 2, cloth: 1 }, 'Основа ПП + металл'),
  G('w_mp5', 'mp5', 'ПП MP5', { f_smg: 1, scrap: 8, parts: 2 }, 'Основа ПП + металл'),
  G('w_p90', 'p90', 'ПП P90', { f_smg: 1, scrap: 10, parts: 3 }, 'Основа ПП + металл'),
  G('w_double', 'doublebarrel', 'Двустволка ИЖ-43', { f_shotgun: 1, scrap: 6, wood: 2 }, 'Основа дробовика + металл'),
  G('w_shotgun', 'shotgun', 'Дробовик', { f_shotgun: 1, scrap: 8, wood: 2 }, 'Основа дробовика + металл'),
  G('w_spas', 'spas', 'Дробовик SPAS-12', { f_shotgun: 1, scrap: 10, parts: 2 }, 'Основа дробовика + металл'),
  G('w_auto', 'autoshotgun', 'Боевой дробовик «Молот»', { f_shotgun: 1, scrap: 12, parts: 3 }, 'Основа дробовика + металл'),
  G('w_carbine', 'carbine', 'Карабин СКС', { f_rifle: 1, scrap: 8, wood: 2 }, 'Основа штурмовой винтовки + металл'),
  G('w_rifle', 'rifle', 'Автомат АК-74', { f_rifle: 1, scrap: 10, parts: 2 }, 'Основа штурмовой винтовки + металл'),
  G('w_akm', 'akm', 'Автомат АКМ', { f_rifle: 1, scrap: 12, parts: 2 }, 'Основа штурмовой винтовки + металл'),
  G('w_m4', 'm4', 'Штурмовая винтовка M4A1', { f_rifle: 1, scrap: 14, parts: 3 }, 'Основа штурмовой винтовки + металл'),
  G('w_mosin', 'mosin', 'Винтовка Мосина', { f_sniper: 1, scrap: 8, wood: 3 }, 'Основа снайперской винтовки + металл'),
  G('w_sniper', 'sniper', 'Снайперская винтовка СВД', { f_sniper: 1, scrap: 10, parts: 3 }, 'Основа снайперской винтовки + металл'),
  G('w_vss', 'vss', 'Винторез ВСС', { f_sniper: 1, scrap: 12, parts: 4 }, 'Основа снайперской винтовки + металл'),
  G('w_amr', 'amr', 'Крупнокалибер «Носорог»', { f_sniper: 1, scrap: 20, parts: 6 }, 'Основа снайперской винтовки + металл'),
  G('w_lmg', 'lmg', 'Пулемёт РПК', { f_mg: 1, scrap: 14, parts: 3 }, 'Основа пулемёта + металл'),
  G('w_pkm', 'pkm', 'Пулемёт ПКМ', { f_mg: 1, scrap: 18, parts: 4 }, 'Основа пулемёта + металл'),
];
export const MELEE_RECIPES: Recipe[] = [
  G('m_knife', 'knife', 'Кухонный нож', { scrap: 2, wood: 1 }, 'Простой нож'),
  G('m_cknife', 'cknife', 'Боевой нож', { scrap: 4, parts: 1, cloth: 1 }, 'Армейский нож'),
  G('m_machete', 'machete', 'Тесак', { scrap: 6, wood: 1, cloth: 1 }, 'Рубит сразу нескольких'),
  G('m_bayonet', 'bayonet', 'Штык-нож', { scrap: 5, parts: 1 }, 'Колющий удар'),
  G('m_spear', 'spear', 'Копьё', { wood: 4, scrap: 2, cloth: 1 }, 'Длинное, пробивает строй'),
  G('m_axe', 'axe', 'Топор', { wood: 3, scrap: 5 }, 'Тяжёлый рубящий удар'),
  G('m_hammer', 'hammer', 'Молот-кувалда', { wood: 2, scrap: 9, parts: 1 }, 'Сокрушает и отбрасывает'),
];
export const FURN_RECIPES: Recipe[] = CRAFT_FURN_ORDER.map((id) => ({
  id: 'f_' + id,
  name: FURN[id].name,
  desc: FURN[id].use ?? FURN[id].desc,
  cost: FURN[id].cost,
  out: { kind: 'furn' as const, id },
}));
export const BACKPACK_RECIPES: Recipe[] = BACKPACKS.map((b) => ({ id: 'bp_' + b.id, name: b.name, desc: `${b.desc} Всего ячеек: ${BASE_SLOTS + b.slots}`, cost: b.cost, out: { kind: 'backpack' as const, id: b.id } }));
RECIPES.push(...MELEE_RECIPES, ...WEAPON_RECIPES, ...BACKPACK_RECIPES, ...FURN_RECIPES);

export const canAfford = (res: Record<ResId, number>, cost: Cost): boolean => ALL_RES.every((r) => (res[r] ?? 0) >= (cost[r] ?? 0));
export const costText = (cost: Cost): string =>
  ALL_RES.filter((r) => (cost[r] ?? 0) > 0)
    .map((r) => `${RES[r].icon}${cost[r]}`)
    .join(' ');
