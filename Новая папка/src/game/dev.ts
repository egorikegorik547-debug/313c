/* ------------------------------------------------------------------ */
/* Режим разработчика: живые флаги, которые читает движок              */
/* ------------------------------------------------------------------ */
export interface DevFlags {
  /** игра запущена в режиме разработчика */
  on: boolean;
  /** меню разработчика открыто */
  open: boolean;
  god: boolean;
  infAmmo: boolean;
  infRes: boolean;
  infMoney: boolean;
  noTarget: boolean;
  freeze: boolean;
  noclip: boolean;
  rapid: boolean;
  instaLoot: boolean;
  fullbright: boolean;
  noWaves: boolean;
  noLimits: boolean;
  pauseOnMenu: boolean;
  /** множитель скорости игрока */
  speed: number;
  /** множитель урона по врагам */
  dmg: number;
  /** скорость течения времени */
  timeScale: number;
}

export const DEV_DEFAULTS: Omit<DevFlags, 'on' | 'open'> = {
  god: true,
  infAmmo: false,
  infRes: false,
  infMoney: false,
  noTarget: false,
  freeze: false,
  noclip: false,
  rapid: false,
  instaLoot: false,
  fullbright: false,
  noWaves: true,
  noLimits: false,
  pauseOnMenu: false,
  speed: 1,
  dmg: 1,
  timeScale: 1,
};

/** Живой объект — движок читает его напрямую */
export const dev: DevFlags = { on: false, open: false, ...DEV_DEFAULTS };

export function resetDev(on: boolean) {
  Object.assign(dev, DEV_DEFAULTS);
  dev.on = on;
  dev.open = on;
  if (!on) {
    dev.god = false;
    dev.noWaves = false;
  }
}

/** Секретный код из настроек */
export const DEV_CODE = 'devel03';
const listeners = new Set<() => void>();
export const onDevCode = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** true — код принят и запускается игра разработчика */
export function submitCode(raw: string): boolean {
  if (raw.trim().toLowerCase() !== DEV_CODE) return false;
  listeners.forEach((l) => l());
  return true;
}
