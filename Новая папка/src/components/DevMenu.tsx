import { useState, type ReactNode } from 'react';
import type { DevSnap, Game } from '../game/engine';
import { dev, type DevFlags } from '../game/dev';
import * as T from '../game/devtools';
import { AMMO, ALL_ORDER, WEAPONS, type AmmoType } from '../game/weapons';
import { CRAFT_FURN_ORDER, FRAME_ORDER, FURN, RES, RES_ORDER, STRUCTS, STRUCT_ORDER } from '../game/items';
import { ENEMIES } from '../game/enemies';
import { sfx } from '../game/audio';

type Tab = 'cheats' | 'give' | 'world' | 'tp';

type BoolKey = {
  [K in keyof DevFlags]: DevFlags[K] extends boolean ? K : never;
}[keyof DevFlags];

const TOGGLES: { key: BoolKey; label: string; desc: string }[] = [
  { key: 'god', label: 'Бессмертие', desc: 'Здоровье и броня всегда полные, урон не проходит' },
  { key: 'noTarget', label: 'Невидимка', desc: 'Враги не замечают и не атакуют вас' },
  { key: 'freeze', label: 'Заморозка врагов', desc: 'Все враги стоят на месте' },
  { key: 'noclip', label: 'Сквозь стены', desc: 'Проходите через стены, мебель и границы города' },
  { key: 'infAmmo', label: 'Бесконечные патроны', desc: 'Магазины и запас всегда полные' },
  { key: 'rapid', label: 'Скорострельность ×4', desc: 'Перезарядка между выстрелами и ударами в 4 раза короче' },
  { key: 'infRes', label: 'Бесконечные ресурсы', desc: 'Ресурсы 999, бинты и аптечки — полные' },
  { key: 'infMoney', label: 'Бесконечные деньги', desc: 'Баланс не опускается ниже 999 999 ₽' },
  { key: 'instaLoot', label: 'Мгновенный обыск', desc: 'Ящики открываются сразу' },
  { key: 'fullbright', label: 'Ночное зрение', desc: 'Убирает темноту ночью и в домах' },
  { key: 'noLimits', label: 'Мебель без лимитов', desc: 'Диван, душ, кофе и остальное — без дневных лимитов и пауз' },
  { key: 'noWaves', label: 'Без волн зомби', desc: 'Дневные волны не запускаются' },
  { key: 'pauseOnMenu', label: 'Пауза при открытом меню', desc: 'Мир замирает, пока это окно открыто' },
];

function Btn({ children, onClick, tone = 'stone', title, className = '' }: { children: ReactNode; onClick: () => void; tone?: 'stone' | 'amber' | 'red' | 'lime' | 'cyan'; title?: string; className?: string }) {
  const cls = {
    stone: 'border-stone-600 bg-stone-900/80 text-stone-200 hover:border-amber-500/80 hover:bg-stone-800',
    amber: 'border-amber-600/80 bg-amber-900/40 text-amber-100 hover:bg-amber-700/50',
    red: 'border-red-800/80 bg-red-950/40 text-red-200 hover:bg-red-900/50',
    lime: 'border-lime-700/80 bg-lime-950/40 text-lime-200 hover:bg-lime-900/50',
    cyan: 'border-cyan-700/80 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50',
  }[tone];
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className={`cursor-pointer border px-2 py-1 text-left text-[11px] leading-tight transition ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
        <span className="h-1.5 w-1.5 rotate-45 bg-amber-500" />
        {title}
        <span className="h-px flex-1 bg-gradient-to-r from-stone-700 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function Switch({ on, label, desc, onToggle }: { on: boolean; label: string; desc: string; onToggle: () => void }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        sfx.click();
        onToggle();
      }}
      className={`flex w-full cursor-pointer items-center gap-2.5 border px-2 py-1.5 text-left transition ${on ? 'border-lime-700/70 bg-lime-950/30' : 'border-stone-700/70 bg-stone-900/50 hover:border-stone-500'}`}
    >
      <span className={`relative h-4 w-8 shrink-0 border ${on ? 'border-lime-400 bg-lime-700/60' : 'border-stone-600 bg-stone-800'}`}>
        <span className={`absolute top-0 h-3 w-3 transition-all ${on ? 'left-4 bg-lime-300' : 'left-0 bg-stone-500'}`} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[12px] font-bold uppercase tracking-wider ${on ? 'text-lime-200' : 'text-stone-300'}`}>{label}</span>
        <span className="block text-[10px] normal-case leading-tight text-stone-500">{desc}</span>
      </span>
    </button>
  );
}

function Range({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="border border-stone-700/70 bg-stone-900/50 px-2 py-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
        <span className="text-stone-300">{label}</span>
        <span className="font-bold text-amber-300">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={(e) => e.currentTarget.blur()}
        className="mt-1 h-1.5 w-full cursor-pointer accent-amber-500"
      />
    </div>
  );
}

export default function DevMenu({ s, game }: { s: DevSnap; game: Game }) {
  const [tab, setTab] = useState<Tab>('cheats');
  const [filter, setFilter] = useState('');
  const [resN, setResN] = useState(50);
  const [enemy, setEnemy] = useState<keyof typeof ENEMIES>('walker');
  const [count, setCount] = useState(5);

  const flip = (k: BoolKey) => {
    if (k === 'noWaves') T.setNoWaves(game, !dev.noWaves);
    else dev[k] = !dev[k];
    game.emit();
  };
  const setNum = (k: 'speed' | 'dmg' | 'timeScale', v: number) => {
    dev[k] = v;
    game.emit();
  };
  const close = () => {
    dev.open = false;
    game.emit();
  };

  if (!s.open) {
    return (
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          sfx.click();
          dev.open = true;
          game.emit();
        }}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-40 -translate-x-1/2 cursor-pointer border border-fuchsia-500/70 bg-black/70 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,0.35)] hover:bg-fuchsia-950/60"
      >
        ⚙ DEV <span className="ml-1 text-fuchsia-400/70">[Ё]</span>
      </button>
    );
  }

  const tabs: [Tab, string][] = [
    ['cheats', 'Читы'],
    ['give', 'Выдача'],
    ['world', 'Мир'],
    ['tp', 'Телепорт'],
  ];
  const q = filter.trim().toLowerCase();
  const weapons = ALL_ORDER.filter((id) => !q || WEAPONS[id].name.toLowerCase().includes(q) || id.includes(q));

  return (
    <div
      className="pointer-events-auto absolute bottom-2 right-2 top-2 z-40 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col border border-fuchsia-700/60 bg-gradient-to-b from-stone-950/95 to-black/95 font-mono text-stone-200 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-[2px]"
      style={{ cursor: 'default' }}
    >
      <div className="flex items-center justify-between border-b border-fuchsia-800/50 bg-fuchsia-950/30 px-3 py-2">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.3em] text-fuchsia-200">⚙ Разработчик</div>
          <div className="text-[10px] text-stone-400">
            x {s.x} · y {s.y} · враги {s.enemies} · {s.fps} fps · {game.loc === 'basement' ? 'подвал' : game.inside ? (game.inside.kind === 'upper' ? '2 этаж' : 'подвал дома') : 'улица'}
          </div>
        </div>
        <button onClick={close} className="cursor-pointer border border-stone-600 px-2 py-1 text-[11px] uppercase tracking-widest text-stone-300 hover:border-amber-400 hover:text-amber-200">
          Закрыть [Ё]
        </button>
      </div>

      <div className="flex border-b border-stone-700/60 bg-black/40 px-2 pt-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              sfx.click();
              setTab(id);
            }}
            className={`flex-1 cursor-pointer border border-b-0 px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest ${tab === id ? 'border-fuchsia-600/70 bg-stone-900 text-fuchsia-100' : 'border-stone-700/50 bg-stone-950 text-stone-500 hover:text-stone-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'cheats' && (
          <>
            <Group title="Режимы">
              <div className="space-y-1.5">
                {TOGGLES.map((t) => (
                  <Switch key={t.key} on={s[t.key]} label={t.label} desc={t.desc} onToggle={() => flip(t.key)} />
                ))}
              </div>
            </Group>
            <Group title="Числа">
              <div className="space-y-1.5">
                <Range label="Скорость игрока" value={s.speed} min={0.5} max={5} step={0.25} fmt={(v) => `×${v}`} onChange={(v) => setNum('speed', v)} />
                <Range label="Скорость времени" value={s.timeScale} min={0.1} max={3} step={0.1} fmt={(v) => `×${v.toFixed(1)}`} onChange={(v) => setNum('timeScale', v)} />
                <div className="border border-stone-700/70 bg-stone-900/50 px-2 py-1.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
                    <span className="text-stone-300">Множитель урона</span>
                    <span className="font-bold text-amber-300">×{s.dmg}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 5, 10, 50, 1000].map((v) => (
                      <Btn key={v} tone={s.dmg === v ? 'amber' : 'stone'} onClick={() => setNum('dmg', v)}>
                        {v === 1000 ? '☠ one-hit' : `×${v}`}
                      </Btn>
                    ))}
                  </div>
                </div>
                <div className="border border-stone-700/70 bg-stone-900/50 px-2 py-1.5">
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-stone-300">Макс. здоровье</div>
                  <div className="flex flex-wrap gap-1">
                    {[100, 200, 500, 1000, 9999].map((v) => (
                      <Btn key={v} onClick={() => T.setMaxHp(game, v)}>
                        {v}
                      </Btn>
                    ))}
                    <Btn tone="lime" onClick={() => T.healFull(game)}>
                      ✚ Лечить
                    </Btn>
                  </div>
                </div>
              </div>
            </Group>
          </>
        )}

        {tab === 'give' && (
          <>
            <Group title="Быстро">
              <div className="flex flex-wrap gap-1">
                <Btn tone="amber" onClick={() => T.giveEverything(game)}>
                  ★ Выдать всё
                </Btn>
                <Btn onClick={() => T.giveMoney(game, 1000)}>+1 000 ₽</Btn>
                <Btn onClick={() => T.giveMoney(game, 10000)}>+10 000 ₽</Btn>
                <Btn onClick={() => T.giveMoney(game, 100000)}>+100 000 ₽</Btn>
                <Btn onClick={() => T.giveMedicine(game)}>Бинты и аптечки</Btn>
                <Btn onClick={() => T.giveGenerator(game)}>Генератор</Btn>
                <Btn onClick={() => T.giveFlare(game)}>Сигнальный пистолет</Btn>
              </div>
            </Group>

            <Group title="Оружие">
              <div className="mb-1.5 flex gap-1">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  placeholder="Поиск оружия…"
                  className="min-w-0 flex-1 border border-stone-600 bg-black/60 px-2 py-1 text-[11px] text-amber-100 outline-none placeholder:text-stone-600 focus:border-amber-400"
                />
                <Btn tone="amber" onClick={() => T.giveAllWeapons(game)}>
                  Всё оружие
                </Btn>
              </div>
              <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1">
                {weapons.map((id) => {
                  const w = WEAPONS[id];
                  const has = !!game.owned[id];
                  return (
                    <Btn key={id} tone={w.special ? 'cyan' : has ? 'lime' : 'stone'} onClick={() => T.giveWeapon(game, id)} title={w.desc}>
                      {w.melee ? '⚔ ' : w.special ? '✦ ' : ''}
                      {w.name}
                    </Btn>
                  );
                })}
                {weapons.length === 0 && <div className="col-span-2 py-2 text-center text-[11px] text-stone-500">Ничего не найдено</div>}
              </div>
            </Group>

            <Group title="Патроны">
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(AMMO) as AmmoType[]).map((t) => (
                  <Btn key={t} onClick={() => T.giveAmmo(game, t)}>
                    {AMMO[t].name}
                  </Btn>
                ))}
                <Btn tone="amber" onClick={() => T.giveAllAmmo(game)} className="col-span-2">
                  Пополнить все патроны
                </Btn>
              </div>
            </Group>

            <Group title="Ресурсы">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
                Количество:
                {[10, 50, 200, 1000].map((n) => (
                  <Btn key={n} tone={resN === n ? 'amber' : 'stone'} onClick={() => setResN(n)}>
                    {n}
                  </Btn>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {RES_ORDER.map((r) => (
                  <Btn key={r} onClick={() => T.giveRes(game, r, resN)}>
                    <span style={{ color: RES[r].color }}>{RES[r].icon}</span> {RES[r].name}
                  </Btn>
                ))}
                {FRAME_ORDER.map((r) => (
                  <Btn key={r} onClick={() => T.giveRes(game, r, Math.max(1, Math.round(resN / 25)))}>
                    <span style={{ color: RES[r].color }}>{RES[r].icon}</span> {RES[r].name}
                  </Btn>
                ))}
                <Btn tone="amber" onClick={() => T.giveAllRes(game, resN)} className="col-span-2">
                  Все ресурсы
                </Btn>
              </div>
            </Group>

            <Group title="Постройки (в инвентарь)">
              <div className="grid grid-cols-2 gap-1">
                {STRUCT_ORDER.map((id) => (
                  <Btn key={id} onClick={() => T.giveStruct(game, id, 1)}>
                    {STRUCTS[id].name}
                  </Btn>
                ))}
                <Btn tone="amber" onClick={() => T.giveAllStructs(game)} className="col-span-2">
                  Все постройки ×3
                </Btn>
              </div>
            </Group>

            <Group title="Мебель (в запас)">
              <div className="grid grid-cols-2 gap-1">
                {CRAFT_FURN_ORDER.map((id) => (
                  <Btn key={id} onClick={() => T.giveFurn(game, id, 2)}>
                    {FURN[id].name}
                  </Btn>
                ))}
                <Btn tone="amber" onClick={() => T.giveAllFurn(game)} className="col-span-2">
                  Вся мебель ×2
                </Btn>
              </div>
            </Group>
          </>
        )}

        {tab === 'world' && (
          <>
            <Group title="Время">
              <div className="grid grid-cols-2 gap-1">
                <Btn tone="cyan" onClick={() => T.toNight(game)}>
                  ☾ Закончить день
                </Btn>
                <Btn tone="amber" onClick={() => T.toNextDay(game)}>
                  ☀ Новый день
                </Btn>
                <Btn onClick={() => T.setDay(game, game.day - 1)}>День −1</Btn>
                <Btn onClick={() => T.setDay(game, game.day + 1)}>День +1</Btn>
                <Btn onClick={() => T.setDay(game, game.day + 10)}>День +10</Btn>
                <Btn onClick={() => T.startWaveNow(game)}>Запустить волну</Btn>
              </div>
              <div className="mt-1 text-[10px] text-stone-500">
                Сейчас: день {game.day}, {game.phase === 'night' ? 'ночь' : 'день'}, волна {game.wave}
              </div>
            </Group>

            <Group title="Враги">
              <div className="mb-1.5 grid grid-cols-2 gap-1">
                <Btn tone="red" onClick={() => T.killAll(game)}>
                  ☠ Убить всех
                </Btn>
                <Btn tone="red" onClick={() => T.nuke(game)}>
                  ✹ Взрыв вокруг
                </Btn>
                <Btn tone="lime" onClick={() => T.openAllCrates(game)} className="col-span-2">
                  ▣ Открыть все ящики
                </Btn>
              </div>
              <select
                value={enemy}
                onChange={(e) => {
                  setEnemy(e.target.value as keyof typeof ENEMIES);
                  e.currentTarget.blur();
                }}
                className="mb-1.5 w-full cursor-pointer border border-stone-600 bg-black/70 px-2 py-1 text-[12px] text-stone-200 outline-none"
              >
                {T.SPAWNABLE.map((t) => (
                  <option key={t} value={t}>
                    {ENEMIES[t].name} — {ENEMIES[t].ability}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-1">
                {[1, 5, 20].map((n) => (
                  <Btn key={n} tone={count === n ? 'amber' : 'stone'} onClick={() => setCount(n)}>
                    ×{n}
                  </Btn>
                ))}
                <Btn tone="red" onClick={() => T.spawnEnemies(game, enemy, count)} className="flex-1">
                  Призвать
                </Btn>
              </div>
            </Group>
          </>
        )}

        {tab === 'tp' && (
          <>
            <Group title="Места">
              <div className="grid grid-cols-2 gap-1">
                <Btn onClick={() => T.tpCamp(game)}>⌂ Лагерь / торговец</Btn>
                <Btn onClick={() => T.tpHatch(game)}>◍ Люк убежища</Btn>
                <Btn tone="amber" onClick={() => T.tpBasement(game)} className="col-span-2">
                  ▼ Подвал убежища (мебель, верстак) — в любое время
                </Btn>
              </div>
            </Group>
            <Group title="Дома (ночью)">
              <div className="grid grid-cols-2 gap-1">
                <Btn tone="cyan" onClick={() => T.enterNearest(game, 'upper')}>
                  ▲ Второй этаж
                </Btn>
                <Btn tone="cyan" onClick={() => T.enterNearest(game, 'cellar')}>
                  ▼ Подвал дома
                </Btn>
                <Btn onClick={() => T.leaveHouse(game)} className="col-span-2">
                  ⇧ Выйти из дома
                </Btn>
              </div>
              <div className="mt-1 text-[10px] text-stone-500">Если сейчас день — сначала автоматически наступит ночь.</div>
            </Group>
            <Group title="Горячие клавиши">
              <div className="space-y-1 text-[11px] text-stone-400">
                <div>
                  <b className="mr-1 border border-stone-600 px-1 text-amber-300">Ё</b> открыть / закрыть это меню
                </div>
                <div>
                  <b className="mr-1 border border-stone-600 px-1 text-amber-300">T</b> телепорт к курсору
                </div>
              </div>
            </Group>
          </>
        )}
      </div>
    </div>
  );
}
