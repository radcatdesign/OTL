import { motion } from 'framer-motion';
import { useState } from 'react';
import { OTLMark } from '../brand/Logo';
import { Otis } from '../brand/otis/Otis';
import { C, onColor } from '../brand/palette';
import { GUIDE_INTENTS } from '../lib/intents';
import type { User } from '../lib/types';

const CHECKER = (() => {
  const s = 18;
  const cells = [
    ['#F73D00', 0, 0], ['#70A0F9', 2, 0], ['#F5C31D', 1, 1], ['#8CB200', 3, 1],
    ['#70A0F9', 0, 2], ['#FF8101', 2, 2], ['#8CB200', 1, 3], ['#F5C31D', 3, 3],
  ] as const;
  const rects = cells.map(([c, x, y]) => `<rect x='${x * s}' y='${y * s}' width='${s}' height='${s}' fill='${c}'/>`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s * 4}' height='${s * 4}'><rect width='100%' height='100%' fill='#FDFAEF'/>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

export const checkerBg = CHECKER;

export function ProfileCard({ user, lawns, width = 300, flippable = true, startFlipped = false }: {
  user: User; lawns?: number; width?: number | string; flippable?: boolean; startFlipped?: boolean;
}) {
  const [flipped, setFlipped] = useState(startFlipped);
  const fg = onColor(user.otis.card);
  const dark = fg === C.cream;
  const face = {
    position: 'absolute' as const,
    inset: 0,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    borderRadius: 24,
    border: `3px solid ${C.pine}`,
    boxShadow: `0 7px 0 ${C.pine}`,
    overflow: 'hidden',
  };

  return (
    <div style={{ width, maxWidth: '100%', aspectRatio: '5 / 7', perspective: 1200, margin: '0 auto' }}>
      <motion.button
        type="button"
        onClick={() => flippable && setFlipped((f) => !f)}
        aria-label={flippable ? (flipped ? 'Show card front' : "Show Otis' guide on the back") : `${user.name}'s card`}
        disabled={!flippable}
        style={{
          position: 'relative', width: '100%', height: '100%', padding: 0, border: 0, background: 'none',
          transformStyle: 'preserve-3d', cursor: flippable ? 'pointer' : 'default', borderRadius: 24,
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Front: the card front from Figma, on the person's color */}
        <div style={{ ...face, background: C[user.otis.card], display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7% 8% 6%' }}>
          <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span className="pill" style={{ background: C.cream }}>{user.role}</span>
            {typeof lawns === 'number' && (
              <span className="pill" style={{ background: C.sun }} title="Lawns you're part of">
                {lawns} {lawns === 1 ? 'lawn' : 'lawns'}
              </span>
            )}
          </div>
          <div style={{ width: '62%', marginTop: '2%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <Otis look={user.otis} />
          </div>
          <h3 className={`display h3 ${dark ? 'outlined' : ''}`} style={{ color: dark ? undefined : C.pine, marginTop: 10, textAlign: 'center', fontSize: 'clamp(1.25rem, 6vw, 1.6rem)' }}>
            {user.name}
          </h3>
          <div style={{ marginTop: 8 }}>
            <OTLMark height={26} fill={C.cream} />
          </div>
        </div>

        {/* Back: Otis' guide, checker border, the person's "looking to" list */}
        <div style={{ ...face, transform: 'rotateY(180deg)', backgroundImage: CHECKER, backgroundSize: '36px 36px', padding: '9%' }}>
          <div style={{ height: '100%', background: C.cream, border: `3px solid ${C.pine}`, borderRadius: 16, padding: '8% 7%', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 34, flex: 'none' }}><Otis look={user.otis} shadow={false} /></div>
              <p className="display" style={{ fontSize: 'clamp(0.95rem, 4.4vw, 1.1rem)', lineHeight: 1.05, color: C.pine }}>
                Otis' guide to finding {user.name.split(' ')[0]}
              </p>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
              {GUIDE_INTENTS.map((g) => {
                const on = user.intents.includes(g.key);
                return (
                  <li key={g.key} className="row" style={{ gap: 8, opacity: on ? 1 : 0.32 }}>
                    <span className="dot" style={{ width: 16, height: 16, background: C[g.color] }} />
                    <span style={{ fontSize: 'clamp(0.72rem, 3.3vw, 0.85rem)', fontWeight: on ? 800 : 600, lineHeight: 1.15, color: C.pine }}>{g.label}</span>
                  </li>
                );
              })}
            </ul>
            {user.bio && <p style={{ fontSize: 'clamp(0.72rem, 3.2vw, 0.82rem)', lineHeight: 1.3, color: C.pine }}>{user.bio}</p>}
            <p className="display" style={{ color: C.lawn, fontSize: '1rem', textAlign: 'center', WebkitTextStroke: `0.1em ${C.pine}`, paintOrder: 'stroke fill' }}>On The Lawn</p>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
