import type { Snapshot } from '../game/engine';
import type { Offer } from '../game/wanderers';
import { AMMO, WEAPONS } from '../game/weapons';
import { ALL_RES, RES, canAfford, fitCount, type Cost, type ResId } from '../game/items';
import { AmmoPreview, WeaponPreview } from './Previews';

function CostChips({ cost, money, s }: { cost: Cost; money: number; s: Snapshot }) {
  const items = ALL_RES.filter((r) => (cost[r] ?? 0) > 0);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {items.map((r) => {
        const need = cost[r] ?? 0;
        const ok = s.res[r] >= need;
        return (
          <span key={r} className={`border px-1.5 py-0.5 ${ok ? 'border-stone-600 text-stone-200' : 'border-red-900/70 bg-red-950/30 text-red-300'}`}>
            <span style={{ color: RES[r].color }}>{RES[r].icon}</span> {RES[r].name.replace('Основа ', 'Основа ')} {s.res[r]}/{need}
          </span>
        );
      })}
      {money > 0 && (
        <span className={`border px-1.5 py-0.5 ${s.money >= money ? 'border-amber-700/70 text-amber-200' : 'border-red-900/70 bg-red-950/30 text-red-300'}`}>₽ {money}</span>
      )}
    </div>
  );
}

function reason(o: Offer, s: Snapshot): string {
  if (o.stock <= 0) return 'Распродано';
  if (o.kind === 'weapon' && o.weapon && s.owned.includes(o.weapon)) return 'Уже есть';
  if (o.kind === 'ammo' && o.ammo && s.reserve[o.ammo] >= AMMO[o.ammo].cap) return 'Полный запас';
  if (!canAfford(s.res, o.give) || s.money < o.money) return 'Не хватает';
  if (o.res && o.n) {
    const after = { ...s.res } as Record<ResId, number>;
    for (const k of Object.keys(o.give) as ResId[]) after[k] -= o.give[k] ?? 0;
    if (fitCount(after, s.bag.slots, o.res, o.n) < o.n) return 'Нет места в рюкзаке';
  }
  return '';
}

const SECTIONS: { kind: Offer['kind']; title: string; hint: string }[] = [
  { kind: 'weapon', title: '★ Редкое оружие', hint: 'Обмен на ресурсы — у торговцев только по одному экземпляру' },
  { kind: 'ammo', title: 'Боеприпасы', hint: 'За деньги' },
  { kind: 'buy', title: 'Ресурсы за деньги', hint: 'Покупка ресурсов' },
  { kind: 'barter', title: 'Обмен ресурсов', hint: 'Отдаёте одни ресурсы — получаете другие' },
];

export default function TraderPanel({ s, onTrade, onClose }: { s: Snapshot; onTrade: (id: number) => void; onClose: () => void }) {
  const t = s.trader;
  if (!t) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4 font-mono backdrop-blur-[2px]">
      <div className="flex max-h-full w-full max-w-4xl flex-col border-2 border-emerald-900/70 bg-gradient-to-b from-stone-800 to-stone-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-emerald-900/60 bg-stone-900/80 px-5 py-3">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-emerald-200">🔥 {t.name} · бродячий торговец</div>
            <div className="text-xs italic text-stone-400">«{t.line}»</div>
          </div>
          <button onClick={onClose} className="pointer-events-auto cursor-pointer border border-stone-500/60 px-3 py-1.5 text-xs uppercase tracking-widest text-stone-300 hover:bg-stone-700/60">
            Уйти [E]
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-b border-stone-700/60 bg-black/30 px-5 py-2 text-xs">
          <span className="text-amber-200">₽ {s.money}</span>
          <span className="text-stone-400">
            🎒 {s.bag.used}/{s.bag.slots} ячеек
          </span>
          {ALL_RES.filter((r) => s.res[r] > 0).map((r) => (
            <span key={r} style={{ color: RES[r].color }} className="tabular-nums">
              {RES[r].icon} {s.res[r]}
            </span>
          ))}
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          {SECTIONS.map((sec) => {
            const list = t.offers.filter((o) => o.kind === sec.kind);
            if (list.length === 0) return null;
            return (
              <div key={sec.kind}>
                <div className="mb-2 flex items-baseline gap-3">
                  <div className={`text-sm font-bold uppercase tracking-widest ${sec.kind === 'weapon' ? 'text-amber-300' : 'text-stone-200'}`}>{sec.title}</div>
                  <div className="text-[11px] text-stone-500">{sec.hint}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {list.map((o) => {
                    const why = reason(o, s);
                    const wd = o.weapon ? WEAPONS[o.weapon] : null;
                    return (
                      <div key={o.id} className={`flex flex-col border p-3 ${sec.kind === 'weapon' ? 'border-amber-700/50 bg-stone-900/90' : 'border-stone-600/50 bg-stone-900/80'}`}>
                        {wd && (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-bold uppercase tracking-wider text-amber-100">{wd.name}</div>
                              <div className="shrink-0 text-xs text-stone-400">{AMMO[wd.ammo].name}</div>
                            </div>
                            <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                              <WeaponPreview id={wd.id} width={330} height={96} showcase />
                            </div>
                            <p className="mt-1 text-xs text-stone-400">{wd.desc}</p>
                            <div className="mb-2 mt-1 border-l-2 border-amber-700/70 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-200/90">★ {wd.perk}</div>
                          </>
                        )}
                        {o.ammo && (
                          <>
                            <div className="text-sm font-bold uppercase tracking-wider text-stone-100">
                              {AMMO[o.ammo].name} ×{o.n}
                            </div>
                            <div className="mt-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                              <AmmoPreview type={o.ammo} width={330} height={80} />
                            </div>
                            <div className="mb-2 mt-1 text-xs text-stone-400">
                              В запасе: {s.reserve[o.ammo]} / {AMMO[o.ammo].cap}
                            </div>
                          </>
                        )}
                        {o.res && !o.weapon && !o.ammo && (
                          <div className="mb-2 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center border border-stone-600 bg-black/40 text-2xl" style={{ color: RES[o.res].color }}>
                              {RES[o.res].icon}
                            </span>
                            <div>
                              <div className="text-sm font-bold uppercase tracking-wider text-stone-100">
                                {RES[o.res].name} ×{o.n}
                              </div>
                              <div className="text-[11px] text-stone-500">осталось: {o.stock}</div>
                            </div>
                          </div>
                        )}
                        <div className="mb-1 text-[10px] uppercase tracking-widest text-stone-500">{o.kind === 'buy' || o.kind === 'ammo' ? 'Цена' : 'Отдать'}</div>
                        <CostChips cost={o.give} money={o.money} s={s} />
                        <button
                          onClick={() => onTrade(o.id)}
                          disabled={!!why}
                          className={`pointer-events-auto mt-3 w-full border px-3 py-2 text-sm font-bold uppercase tracking-widest transition ${
                            !why ? 'cursor-pointer border-emerald-600/70 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-700/50' : 'cursor-not-allowed border-stone-700 bg-stone-900/60 text-stone-500'
                          }`}
                        >
                          {why || (o.kind === 'barter' || o.kind === 'weapon' ? 'Обменять' : 'Купить')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {s.toasts.length > 0 && <div className="border-t border-stone-700/60 bg-black/40 px-5 py-2 text-sm text-amber-100/90">{s.toasts[s.toasts.length - 1].text}</div>}
      </div>
    </div>
  );
}
