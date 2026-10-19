import { motion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '../brand/icons';
import { Otis, type Companion, type HatStyle, type OtisLook } from '../brand/otis/Otis';
import { TOOL_NAMES, type ToolKey } from '../brand/otis/parts';
import { C, COLOR_KEYS, COLOR_NAMES, type ColorKey } from '../brand/palette';
import { COMPANION_UNLOCKS, HAT_UNLOCKS, type Stats } from '../lib/game';
import { checkerBg } from '../ui/ProfileCard';

type Tab = 'hat' | 'overalls' | 'tool' | 'extras' | 'card';
const TABS: { key: Tab; label: string }[] = [
  { key: 'hat', label: 'Hat' },
  { key: 'overalls', label: 'Overalls' },
  { key: 'tool', label: 'Holding' },
  { key: 'extras', label: 'Extras' },
  { key: 'card', label: 'Card' },
];

const PATTERN_SWATCH: Record<string, string> = {
  checker: checkerBg,
  plaid: `repeating-linear-gradient(90deg, transparent 0 8px, ${C.tomato} 8px 13px, transparent 13px 22px), repeating-linear-gradient(0deg, ${C.cream} 0 6px, ${C.sky} 6px 10px, ${C.cream} 10px 16px, ${C.sun} 16px 20px)`,
  xtreme: `repeating-linear-gradient(90deg, ${C.tomato} 0 4px, transparent 4px 7px, ${C.lawn} 7px 9px, transparent 9px 14px), repeating-linear-gradient(0deg, ${C.sky} 0 3px, ${C.cream} 3px 7px)`,
};

export function StudioPanel({ look, onChange, stats, level, compact = false, split = false }: {
  look: OtisLook;
  onChange: (l: OtisLook) => void;
  stats: Stats | null; // null = brand-new user, nothing unlocked yet
  level: number;
  compact?: boolean;
  split?: boolean; // preview beside the controls on wide screens
}) {
  const [tab, setTab] = useState<Tab>('hat');
  const [bump, setBump] = useState(0);
  const set = (patch: Partial<OtisLook>) => {
    onChange({ ...look, ...patch });
    setBump((b) => b + 1);
  };
  const s = stats ?? { lawns: 0, attended: 0, hosted: 0, planted: 0, watered: 0, blooms: 0, invitesAccepted: 0, supported: 0, donated: 0, connections: 0 };

  return (
    <div className={`studio-grid ${split ? 'split' : ''}`}>
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, #8fc3fb, #d7ecfd)', border: '3px solid var(--pine)', borderRadius: 26, padding: split ? '36px 0 18px' : compact ? '14px 0 8px' : '22px 0 12px', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 'auto 0 0 0', height: '22%', background: C.lawn, borderTop: '3px solid var(--pine)' }} />
        <motion.div
          key={bump}
          initial={{ scale: 0.94, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          style={{ width: split ? 'min(250px, 62%)' : compact ? 150 : 180, position: 'relative' }}
        >
          <Otis look={look} />
        </motion.div>
      </div>

      <div className="stack-lg">
      <div className="row-wrap" role="tablist" aria-label="Customize Otis">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} aria-pressed={tab === t.key} className="chip" onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hat' && (
        <div className="grid-4" role="tabpanel">
          {[...COLOR_KEYS, 'checker', 'plaid', 'xtreme'].map((h) => {
            const unlock = HAT_UNLOCKS[h as HatStyle];
            const locked = !!unlock && !unlock.check(s, level);
            const bg = COLOR_KEYS.includes(h as ColorKey) ? C[h as ColorKey] : PATTERN_SWATCH[h];
            const name = COLOR_KEYS.includes(h as ColorKey) ? COLOR_NAMES[h as ColorKey] : h === 'xtreme' ? 'Plaid xtreme' : h[0].toUpperCase() + h.slice(1);
            return (
              <button
                key={h}
                className="swatch"
                style={{ background: bg }}
                aria-pressed={look.hat === h}
                aria-label={locked ? `${name} hat, locked. ${unlock!.label}` : `${name} hat`}
                title={locked ? unlock!.label : name}
                disabled={locked}
                onClick={() => set({ hat: h as HatStyle })}
              >
                {locked && <span className="lock"><LockGlyph /></span>}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'overalls' && (
        <div className="grid-4" role="tabpanel">
          {COLOR_KEYS.map((k) => (
            <button key={k} className="swatch" style={{ background: C[k] }} aria-pressed={look.overalls === k} aria-label={`${COLOR_NAMES[k]} overalls`} title={COLOR_NAMES[k]} onClick={() => set({ overalls: k })} />
          ))}
        </div>
      )}

      {tab === 'tool' && (
        <div className="grid-3" role="tabpanel">
          {(Object.keys(TOOL_NAMES) as ToolKey[]).map((t) => (
            <button key={t} className="swatch" aria-pressed={look.tool === t} onClick={() => set({ tool: t })} style={{ aspectRatio: 'auto', padding: '6px 4px 8px', gap: 2 }} aria-label={TOOL_NAMES[t]}>
              <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', width: '180%', left: '-112%', top: '-176%' }}>
                  <Otis look={{ ...look, tool: t, companion: 'none' }} shadow={false} />
                </div>
              </div>
              <span className="small strong">{TOOL_NAMES[t]}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'extras' && (
        <div className="stack" role="tabpanel">
          <button className="chip" aria-pressed={look.band} onClick={() => set({ band: !look.band })} style={{ alignSelf: 'flex-start' }}>
            {look.band ? 'Hat band on' : 'Add a hat band'}
          </button>
          <p className="label">A friend on your hat</p>
          <div className="grid-4">
            {(['none', 'bird', 'butterfly', 'ladybug'] as Companion[]).map((c) => {
              const unlock = COMPANION_UNLOCKS[c];
              const locked = !!unlock && !unlock.check(s, level);
              const icon = c === 'bird' ? 'bird' : c === 'butterfly' ? 'butterfly' : c === 'ladybug' ? 'ladybug' : null;
              return (
                <button
                  key={c}
                  className="swatch"
                  aria-pressed={look.companion === c}
                  disabled={locked}
                  title={locked ? unlock!.label : c}
                  aria-label={locked ? `${c}, locked. ${unlock!.label}` : c === 'none' ? 'No friend' : c}
                  onClick={() => set({ companion: c })}
                >
                  {icon ? <Icon name={icon} size={40} /> : <span className="small strong">None</span>}
                  {locked && <span className="lock"><LockGlyph /></span>}
                </button>
              );
            })}
          </div>
          {Object.entries(COMPANION_UNLOCKS).some(([, u]) => !u!.check(s, level)) && (
            <ul className="hint" style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(COMPANION_UNLOCKS).filter(([, u]) => !u!.check(s, level)).map(([k, u]) => (
                <li key={k}>{k[0].toUpperCase() + k.slice(1)}: {u!.label.toLowerCase()}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'card' && (
        <div className="grid-3" role="tabpanel">
          {COLOR_KEYS.map((k) => (
            <button key={k} className="swatch" style={{ background: C[k] }} aria-pressed={look.card === k} aria-label={`${COLOR_NAMES[k]} card`} title={`${COLOR_NAMES[k]} card`} onClick={() => set({ card: k })} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect x="4" y="11" width="18" height="13" rx="4" fill="#FDFAEF" stroke="#16541A" strokeWidth="2.6" />
      <path d="M8 11V8a5 5 0 0 1 10 0v3" stroke="#16541A" strokeWidth="2.6" fill="none" />
    </svg>
  );
}
