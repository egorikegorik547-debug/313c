import type { Snapshot } from '../game/engine';
import { ALL_RES, BACKPACKS, BASE_SLOTS, STACK, CRATE_SLOTS, FURN, RES, type BackpackId, type ResId } from '../game/items';

/* ------------------------------------------------------------------ */
/* Иконка рюкзака                                                       */
/* ------------------------------------------------------------------ */
export function BackpackIcon({ color, accent, size = 44, dim = false }: { color: string; accent: string; size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ opacity: dim ? 0.35 : 1 }}>
      <path d="M17 9c0-3 2-5 7-5s7 2 7 5" fill="none" stroke="#1c1d20" strokeWidth="3" strokeLinecap="round" />
      <rect x="9" y="9" width="30" height="35" rx="9" fill={color} stroke="#141517" strokeWidth="1.6" />
      <rect x="9" y="9" width="30" height="9" rx="6" fill="rgba(255,255,255,0.18)" />
      <rect x="14" y="26" width="20" height="13" rx="3" fill="rgba(0,0,0,0.28)" stroke="#141517" strokeWidth="1" />
      <rect x="14" y="30" width="20" height="2" fill={accent} />
      <rect x="21" y="22" width="6" height="5" rx="1" fill={accent} stroke="#141517" strokeWidth="0.8" />
      <rect x="6" y="20" width="4" height="14" rx="2" fill="rgba(0,0,0,0.35)" />
      <rect x="38" y="20" width="4" height="14" rx="2" fill="rgba(0,0,0,0.35)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Сетка ячеек                                                          */
/* ------------------------------------------------------------------ */
interface Cell {
  r: ResId;
  n: number;
}

function cellsOf(store: Partial<Record<ResId, number>>): Cell[] {
  const out: Cell[] = [];
  for (const r of ALL_RES) {
    let n = Math.max(0, store[r] ?? 0);
    while (n > 0) {
      const k = Math.min(n, STACK[r]);
      out.push({ r, n: k });
      n -= k;
    }
  }
  return out;
}

export function SlotGrid({ store, slots, onPick, cols = 6 }: { store: Partial<Record<ResId, number>>; slots: number; onPick?: (r: ResId, all: boolean) => void; cols?: number }) {
  const cells = cellsOf(store);
  const total = Math.max(slots, cells.length);
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => {
        const c = cells[i];
        const over = i >= slots;
        if (!c) {
          return <div key={i} className="aspect-square border border-dashed border-stone-700/80 bg-black/30" />;
        }
        const def = RES[c.r];
        return (
          <button
            key={i}
            onClick={(e) => onPick?.(c.r, e.shiftKey)}
            title={`${def.name}: ${c.n}/${STACK[c.r]}${onPick ? ' · клик — 1 шт., Shift — вся ячейка' : ''}`}
            className={`pointer-events-auto relative flex aspect-square cursor-pointer flex-col items-center justify-center border text-center transition hover:brightness-125 ${
              over ? 'border-red-500/80 bg-red-950/50' : 'border-stone-500/70 bg-stone-900/90'
            }`}
          >
            <span className="text-xl leading-none" style={{ color: def.color }}>
              {def.icon}
            </span>
            <span className="mt-0.5 w-full truncate px-0.5 text-[9px] leading-none text-stone-400">{def.name.replace('Основа ', '')}</span>
            <span className="absolute bottom-0.5 right-1 text-[11px] font-bold tabular-nums text-amber-100">{c.n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Meter({ used, slots }: { used: number; slots: number }) {
  const pct = Math.min(100, (used / Math.max(1, slots)) * 100);
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums">
      <div className="h-2.5 w-36 overflow-hidden border border-stone-600 bg-black/60">
        <div className="h-full" style={{ width: `${pct}%`, background: used >= slots ? '#c0392b' : used / slots > 0.7 ? '#d8a548' : '#8fd070' }} />
      </div>
      <span className={used >= slots ? 'text-red-300' : 'text-stone-300'}>
        {used}/{slots} ячеек
      </span>
    </div>
  );
}

const shell = 'absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4 font-mono backdrop-blur-[2px]';
const btn = 'pointer-events-auto cursor-pointer border border-stone-500/60 px-3 py-1.5 text-xs uppercase tracking-widest text-stone-300 hover:bg-stone-700/60';

/* ------------------------------------------------------------------ */
/* Инвентарь (клавиша I)                                                */
/* ------------------------------------------------------------------ */
export function Inventory({ s, onClose, onEquip }: { s: Snapshot; onClose: () => void; onEquip: (id: BackpackId | null) => void }) {
  const { slots, used, equipped, owned } = s.bag;
  const res = Object.fromEntries(ALL_RES.map((r) => [r, s.res[r]])) as Record<ResId, number>;
  return (
    <div className={shell}>
      <div className="flex max-h-full w-full max-w-4xl flex-col border-2 border-stone-600/70 bg-gradient-to-b from-stone-800 to-stone-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-600/60 bg-stone-900/80 px-5 py-3">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-stone-100">🎒 Инвентарь</div>
            <div className="text-xs italic text-stone-400">Ресурсы лежат в рюкзаке, патроны и деньги — отдельно. Лишнее можно сложить в ящики в подвале</div>
          </div>
          <button onClick={onClose} className={btn}>
            Закрыть [I]
          </button>
        </div>
        <div className="grid gap-5 overflow-y-auto p-5 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-200/90">Ячейки</div>
              <Meter used={used} slots={slots} />
            </div>
            <SlotGrid store={res} slots={slots} cols={6} />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-400">
              <span>В ячейке — один вид ресурса</span>
              <span>Стопка: 30 (детали 20, бензин 10, основы 3)</span>
            </div>
            {used >= slots && <div className="mt-2 border-l-2 border-red-700 bg-red-950/30 px-2 py-1 text-xs text-red-200">Рюкзак полон: новые ресурсы остаются лежать на земле. Скрафтите рюкзак побольше на верстаке или сложите запасы в ящик.</div>}
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-200/90">Рюкзаки</div>
            <div className="space-y-1.5">
              <button
                onClick={() => onEquip(null)}
                className={`pointer-events-auto flex w-full cursor-pointer items-center gap-3 border px-3 py-2 text-left transition ${
                  equipped === null ? 'border-amber-400/80 bg-amber-900/30' : 'border-stone-600/60 bg-stone-900/70 hover:border-stone-400'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center text-2xl">🧥</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold uppercase tracking-wider text-stone-100">Карманы</span>
                  <span className="block text-[11px] text-stone-400">{BASE_SLOTS} ячейки · без рюкзака</span>
                </span>
                {equipped === null && <span className="text-[11px] uppercase tracking-widest text-amber-300">надет</span>}
              </button>
              {BACKPACKS.map((b) => {
                const has = owned.includes(b.id);
                const on = equipped === b.id;
                return (
                  <button
                    key={b.id}
                    disabled={!has}
                    onClick={() => onEquip(b.id)}
                    className={`pointer-events-auto flex w-full items-center gap-3 border px-3 py-2 text-left transition ${
                      on ? 'border-amber-400/80 bg-amber-900/30' : has ? 'cursor-pointer border-stone-600/60 bg-stone-900/70 hover:border-stone-400' : 'cursor-default border-stone-800 bg-black/30'
                    }`}
                  >
                    <BackpackIcon color={b.color} accent={b.accent} size={40} dim={!has} />
                    <span className="flex-1">
                      <span className={`block text-sm font-bold uppercase tracking-wider ${has ? 'text-stone-100' : 'text-stone-600'}`}>{b.name}</span>
                      <span className={`block text-[11px] ${has ? 'text-stone-400' : 'text-stone-600'}`}>
                        {BASE_SLOTS + b.slots} ячеек · {has ? b.desc : 'не изготовлен — верстак'}
                      </span>
                    </span>
                    {on && <span className="text-[11px] uppercase tracking-widest text-amber-300">надет</span>}
                    {has && !on && <span className="text-[11px] uppercase tracking-widest text-stone-400">надеть</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {s.toasts.length > 0 && <div className="border-t border-stone-700/60 bg-black/40 px-5 py-2 text-sm text-amber-100/90">{s.toasts[s.toasts.length - 1].text}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ящик в подвале                                                       */
/* ------------------------------------------------------------------ */
export function Storage({
  s,
  onClose,
  onMove,
  onMoveAll,
}: {
  s: Snapshot;
  onClose: () => void;
  onMove: (dir: 'in' | 'out', r: ResId, n: number) => void;
  onMoveAll: (dir: 'in' | 'out') => void;
}) {
  const st = s.storage;
  if (!st) return null;
  const res = Object.fromEntries(ALL_RES.map((r) => [r, s.res[r]])) as Record<ResId, number>;
  const box = st.box as Record<ResId, number>;
  const name = FURN[st.type as 'crate_s']?.name ?? 'Ящик';
  const cap = CRATE_SLOTS[st.type] ?? st.slots;
  return (
    <div className={shell}>
      <div className="flex max-h-full w-full max-w-4xl flex-col border-2 border-stone-600/70 bg-gradient-to-b from-stone-800 to-stone-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-600/60 bg-stone-900/80 px-5 py-3">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-stone-100">📦 {name}</div>
            <div className="text-xs italic text-stone-400">Клик по ячейке — переложить 1 шт. · Shift+клик — всю стопку</div>
          </div>
          <button onClick={onClose} className={btn}>
            Закрыть [E]
          </button>
        </div>
        <div className="grid gap-5 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-200/90">Рюкзак</div>
              <Meter used={s.bag.used} slots={s.bag.slots} />
            </div>
            <SlotGrid store={res} slots={s.bag.slots} cols={5} onPick={(r, all) => onMove('in', r, all ? 9999 : 1)} />
            <button onClick={() => onMoveAll('in')} className={`${btn} mt-3 w-full`}>
              Положить всё в ящик →
            </button>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-lime-200/90">{name}</div>
              <Meter used={st.used} slots={cap} />
            </div>
            <SlotGrid store={box} slots={cap} cols={5} onPick={(r, all) => onMove('out', r, all ? 9999 : 1)} />
            <button onClick={() => onMoveAll('out')} className={`${btn} mt-3 w-full`}>
              ← Забрать всё в рюкзак
            </button>
          </div>
        </div>
        {s.toasts.length > 0 && <div className="border-t border-stone-700/60 bg-black/40 px-5 py-2 text-sm text-amber-100/90">{s.toasts[s.toasts.length - 1].text}</div>}
      </div>
    </div>
  );
}

