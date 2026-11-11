
import { useState } from 'react';
import type { Snapshot } from '../game/engine';
import { ALL_RES, BACKPACK, BASE_SLOTS, FRAME_ORDER, FURN, RECIPES, RES, RES_ORDER, STRUCTS, canAfford, type Cost, type Recipe } from '../game/items';
import { AMMO, WEAPONS } from '../game/weapons';
import { AmmoPreview, WeaponPreview } from './Previews';
import { GeneratorPreview } from './ElectroPreview';
import { FurniturePreview } from './FurniturePreview';
import { BackpackIcon } from './Bag';

type Cat = 'ammo' | 'misc' | 'melee' | 'guns' | 'traps' | 'furn' | 'bags';

const catOf = (r: Recipe): Cat =>
  r.out.kind === 'ammo'
    ? 'ammo'
    : r.out.kind === 'furn'
      ? 'furn'
      : r.out.kind === 'backpack'
      ? 'bags'
      : r.out.kind === 'item' || r.out.kind === 'generator'
      ? 'traps'
      : r.out.kind === 'weapon'
        ? WEAPONS[r.out.id].melee
          ? 'melee'
          : 'guns'
        : 'misc';

function CostRow({ cost, res }: { cost: Cost; res: Snapshot['res'] }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {ALL_RES.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
        const need = cost[r] ?? 0;
        const ok = res[r] >= need;
        return (
          <span key={r} className={`border px-1.5 py-0.5 ${ok ? 'border-stone-600 text-stone-200' : 'border-red-900/70 bg-red-950/30 text-red-300'}`}>
            <span style={{ color: RES[r].color }}>{RES[r].icon}</span> {RES[r].name} {res[r]}/{need}
          </span>
        );
      })}
    </div>
  );
}

export default function Workbench({ s, onCraft, onClose }: { s: Snapshot; onCraft: (id: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState<Cat>('ammo');
  const tabs: [Cat, string][] = [
    ['ammo', 'Патроны'],
    ['misc', 'Медицина и броня'],
    ['melee', 'Холодное'],
    ['guns', 'Огнестрел'],
    ['traps', 'Постройки'],
    ['bags', 'Рюкзаки'],
    ['furn', 'Мебель и ящики'],
  ];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4 font-mono backdrop-blur-[2px]">
      <div className="flex max-h-full w-full max-w-4xl flex-col border-2 border-stone-600/70 bg-gradient-to-b from-stone-800 to-stone-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-600/60 bg-stone-900/80 px-5 py-3">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-stone-100">⚒ Верстак</div>
            <div className="text-xs italic text-stone-400">Патроны, бинты, аптечки, ножи, ловушки и мебель для подвала; фабричное оружие — из основы (армейские ящики) и металла</div>
          </div>
          <button onClick={onClose} className="pointer-events-auto cursor-pointer border border-stone-500/60 px-3 py-1.5 text-xs uppercase tracking-widest text-stone-300 hover:bg-stone-700/60">
            Закрыть [E]
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-700/60 bg-black/30 px-5 py-2 text-sm">
          <span className={s.bag.used >= s.bag.slots ? 'text-red-300' : 'text-stone-400'}>🎒 {s.bag.used}/{s.bag.slots}</span>
          {[...RES_ORDER, ...FRAME_ORDER.filter((f) => s.res[f] > 0)].map((r) => (
            <span key={r} style={{ color: RES[r].color }} className="tabular-nums">
              {RES[r].icon} {RES[r].name}: <b className="text-stone-100">{s.res[r]}</b>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 border-b border-stone-700/60 bg-stone-900/50 px-5 pt-3">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setCat(id)}
              className={`pointer-events-auto cursor-pointer border border-b-0 px-5 py-2 text-xs font-bold uppercase tracking-widest ${
                cat === id ? 'border-stone-500 bg-stone-800 text-amber-100' : 'border-stone-700/50 bg-stone-900/60 text-stone-500 hover:text-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {RECIPES.filter((r) => catOf(r) === cat).map((r) => {
            const ok = canAfford(s.res, r.cost);
            const have =
              r.out.kind === 'backpack'
                ? s.bag.equipped === r.out.id
                  ? 'надет'
                  : s.bag.owned.includes(r.out.id)
                    ? 'уже есть'
                    : ''
                : r.out.kind === 'weapon'
                ? s.owned.includes(r.out.id)
                  ? 'уже есть'
                  : ''
                : r.out.kind === 'bandage'
                  ? `с собой: ${s.bandages}`
                  : r.out.kind === 'firstaid'
                    ? `с собой: ${s.firstAids}`
                    : r.out.kind === 'ammo' ? `${s.reserve[r.out.id]} / ${AMMO[r.out.id].cap}` : r.out.kind === 'item' ? `в запасе: ${s.inv[r.out.id]}` : r.out.kind === 'generator' ? `в запасе: ${s.genStock}` : r.out.kind === 'furn' ? `в запасе: ${s.furnStock[r.out.id] ?? 0} · стоит: ${s.furnBuilt[r.out.id] ?? 0}` : '';
            return (
              <div key={r.id} className="flex flex-col border border-stone-600/50 bg-stone-900/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold uppercase tracking-wider text-stone-100">{r.name}</div>
                  <div className="shrink-0 text-xs text-stone-400">{have}</div>
                </div>
                {r.out.kind === 'weapon' && (
                  <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                    <WeaponPreview id={r.out.id} width={330} height={84} showcase />
                  </div>
                )}
                {r.out.kind === 'ammo' && (
                  <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                    <AmmoPreview type={r.out.id} width={330} height={96} />
                  </div>
                )}
                {r.out.kind === 'furn' && (
                  <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                    <FurniturePreview id={r.out.id} width={330} height={104} />
                  </div>
                )}
                {r.out.kind === 'backpack' && (
                  <div className="mt-2 flex items-center justify-center gap-4 overflow-hidden border border-stone-700/60 bg-black/40 py-3">
                    <BackpackIcon color={BACKPACK[r.out.id].color} accent={BACKPACK[r.out.id].accent} size={64} />
                    <div className="text-xs text-stone-300">
                      <div className="text-2xl font-black text-amber-200">{BASE_SLOTS + BACKPACK[r.out.id].slots}</div>
                      <div className="uppercase tracking-widest text-stone-500">ячеек всего</div>
                    </div>
                  </div>
                )}
                {r.out.kind === 'generator' && (
                  <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                    <GeneratorPreview width={330} height={110} />
                  </div>
                )}
                <p className="mb-2 mt-1 text-xs text-stone-400">
                  {r.out.kind === 'furn' ? FURN[r.out.id].desc : r.out.kind === 'item' ? STRUCTS[r.out.id].desc.split('.')[0] + '.' : r.out.kind === 'weapon' ? `${r.desc}. ${WEAPONS[r.out.id].desc}` : r.desc}
                </p>
                <CostRow cost={r.cost} res={s.res} />
                {r.out.kind === 'backpack' && <div className="mt-1 text-[11px] text-stone-500">Надевается автоматически, если лучше текущего. Смена — в инвентаре (I)</div>}
                {r.out.kind === 'furn' && (
                  <div className="mb-2 mt-1 border-l-2 border-lime-700/70 bg-lime-950/20 px-2 py-1 text-[11px] text-lime-200/90">⚙ {FURN[r.out.id].use}</div>
                )}
                {cat === 'guns' && r.out.kind === 'weapon' && (
                  <div className="mt-2 text-[11px] text-stone-500">
                    Патроны: {AMMO[WEAPONS[r.out.id].ammo].name} · урон {WEAPONS[r.out.id].damage * WEAPONS[r.out.id].pellets}
                  </div>
                )}
                <button
                  onClick={() => onCraft(r.id)}
                  className={`pointer-events-auto mt-3 w-full cursor-pointer border px-3 py-2 text-sm font-bold uppercase tracking-widest transition ${
                    ok ? 'border-amber-600/70 bg-amber-900/40 text-amber-100 hover:bg-amber-700/50' : 'border-red-900/70 bg-red-950/40 text-red-300/80 hover:bg-red-950/60'
                  }`}
                >
                  Изготовить
                </button>
              </div>
            );
          })}
        </div>
        {s.toasts.length > 0 && <div className="border-t border-stone-700/60 bg-black/40 px-5 py-2 text-sm text-amber-100/90">{s.toasts[s.toasts.length - 1].text}</div>}
      </div>
    </div>
  );
}
