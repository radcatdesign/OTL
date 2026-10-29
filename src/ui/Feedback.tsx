import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { Otis } from '../brand/otis/Otis';
import { Plant } from '../brand/Plant';
import { C } from '../brand/palette';
import { SEED_INTENT } from '../lib/intents';
import { useMe, useStore } from '../lib/store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            layout
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => dismiss(t.id)}
            data-tone={t.tone}
          >
            <span className="toast-dot" aria-hidden />
            <span>{t.text}</span>
            {t.xp ? (
              <motion.span className="xp-badge" initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 14, delay: 0.1 }}>
                +{t.xp} XP
              </motion.span>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const PETAL_COLORS = [C.sun, C.tomato, C.sky, C.lawn, C.tangerine, C.cream];

function PetalBurst() {
  const petals = useMemo(
    () => Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const d = 140 + Math.random() * 120;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 360, c: PETAL_COLORS[i % PETAL_COLORS.length], s: 12 + Math.random() * 10 };
    }),
    [],
  );
  return (
    <div aria-hidden style={{ position: 'absolute', left: '50%', top: '42%', width: 0, height: 0 }}>
      {petals.map((p, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 20 30"
          width={p.s}
          style={{ position: 'absolute', left: -p.s / 2, top: -p.s / 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y + 120, rotate: p.r, opacity: 0, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.15, 0.7, 0.3, 1] }}
        >
          <path d="M10 1C16 8 18 20 10 29C2 20 4 8 10 1Z" fill={p.c} stroke={C.pine} strokeWidth="2.4" />
        </motion.svg>
      ))}
    </div>
  );
}

export function Celebration() {
  const c = useStore((s) => s.celebration);
  const close = useStore((s) => s.celebrate);
  const seed = useStore((s) => (c?.seedId ? s.db.seeds.find((x) => x.id === c.seedId) : undefined));
  const me = useMe();
  return (
    <AnimatePresence>
      {c && (
        <motion.div
          className="scrim"
          style={{ alignItems: 'center', zIndex: 70 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => close(null)}
        >
          <PetalBurst />
          <motion.div
            className="card stack center art"
            role="dialog"
            aria-modal="true"
            aria-label={c.title}
            style={{ width: 'min(88vw, 360px)', alignItems: 'center', padding: 24 }}
            initial={{ scale: 0.6, rotate: -6, y: 40 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            {c.kind === 'bloom' && seed ? (
              <motion.div initial={{ scale: 0.3, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}>
                <Plant stage="bloom" color={SEED_INTENT[seed.intent].color} accent={SEED_INTENT[seed.intent].accent} size={150} />
              </motion.div>
            ) : me ? (
              <motion.div style={{ width: 120 }} initial={{ y: 20 }} animate={{ y: [20, -10, 0] }} transition={{ duration: 0.7 }}>
                <Otis look={me.otis} />
              </motion.div>
            ) : null}
            <h2 className="display h2">{c.title}</h2>
            {c.body && <p className="muted" style={{ maxWidth: '30ch' }}>{c.body}</p>}
            <button className="btn sun block" onClick={() => close(null)} autoFocus>
              {c.kind === 'welcome' ? 'Step onto the lawn' : 'Nice'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
