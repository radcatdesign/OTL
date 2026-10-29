import { motion } from 'framer-motion';
import { Otis } from '../brand/otis/Otis';
import { Plant, Wildflower } from '../brand/Plant';
import { C } from '../brand/palette';
import { SEED_INTENT } from '../lib/intents';
import type { Membership, Seed, User } from '../lib/types';

export function LawnScene({ members, users, seeds, hostId, meId, onPick, onGarden, gardenOpen }: {
  members: Membership[];
  users: Map<string, User>;
  seeds: Seed[];
  hostId: string;
  meId: string | null;
  onPick: (userId: string) => void;
  onGarden: () => void;
  gardenOpen: boolean;
}) {
  const visible = members.filter((m) => m.status !== 'invited');
  const shown = visible.slice(0, 24).sort((a, b) => a.spot.y - b.spot.y);
  const blooms = seeds.filter((s) => s.bloomedAt).slice(-3);
  return (
    <div
      className="card flat art"
      style={{ padding: 0, overflow: 'hidden', background: 'linear-gradient(180deg, #8fc3fb 0%, #d7ecfd 34%, #8cb200 34.2%, #86ad00 100%)', height: 'var(--scene-h, clamp(300px, 78vw, 400px))' }}
    >
      <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M0 102C70 94 140 90 210 96C280 102 340 96 400 100" stroke="#16541A" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M30 34C24 34 22 29 25 26C27 24 30 24 32 25C33 20 38 17 43 18C46 13 54 13 57 18C61 15 68 17 69 22C75 22 79 27 76 32C79 33 79 34 75 34Z" fill="#fff" />
        <path d="M290 22C286 22 284 18 287 16C288 15 290 15 291 15.5C292 12 295 10 299 11C301 8 306 8 308 11C311 9 316 10 317 14C321 14 323 17 321 20C323 21 323 22 320 22Z" fill="#fff" />
      </svg>
      {/* Wildflowers scattered on the grass */}
      {[[8, 46], [91, 56], [52, 92], [23, 78], [72, 40]].map(([x, y], i) => (
        <div key={i} aria-hidden style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
          <Wildflower size={i % 2 ? 18 : 22} />
        </div>
      ))}

      {/* The garden bed */}
      <button
        type="button"
        onClick={onGarden}
        aria-label={gardenOpen ? 'Open the garden' : 'The garden opens when you check in'}
        style={{ position: 'absolute', right: '3%', bottom: '4%', width: '34%', minWidth: 120, background: 'none', border: 0, padding: 0, zIndex: 400 }}
      >
        <div style={{ position: 'relative', background: C.soil, border: `3px solid ${C.pine}`, borderRadius: '50% 50% 18px 18px / 40% 40% 18px 18px', height: 46, boxShadow: `0 4px 0 ${C.pine}` }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {(blooms.length ? blooms : seeds.slice(0, 3)).map((s) => (
              <Plant key={s.id} stage={s.bloomedAt ? 'bloom' : 'sprout'} color={SEED_INTENT[s.intent].color} accent={SEED_INTENT[s.intent].accent} size={34} />
            ))}
          </div>
        </div>
        <span className="pill" style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', background: gardenOpen ? C.sun : C.cream }}>
          {gardenOpen ? 'Garden' : 'Garden, locked'}
        </span>
      </button>

      {shown.map((m, i) => {
        const u = users.get(m.userId);
        if (!u) return null;
        const depth = 0.75 + m.spot.y * 0.55; // closer = bigger
        const top = 44 + m.spot.y * 46; // feet stay on the grass
        let left = m.spot.x * 86 + 7;
        if (top > 70 && left > 58) left -= 34; // keep clear of the garden bed
        const isMe = m.userId === meId;
        return (
          <div
            key={m.id}
            style={{
              position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${13 * depth}%`, minWidth: 42, maxWidth: 'var(--otis-max, 96px)',
              transform: 'translate(-50%, -88%)', zIndex: Math.round(m.spot.y * 100) + 10,
            }}
          >
            <motion.button
              type="button"
              onClick={() => onPick(m.userId)}
              aria-label={`${u.name}${m.userId === hostId ? ', host' : ''}`}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: Math.min(i * 0.04, 0.6) }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.92 }}
              style={{ display: 'block', width: '100%', background: 'none', border: 0, padding: 0, position: 'relative' }}
            >
              <Otis look={u.otis} />
              {(isMe || m.userId === hostId) && (
                <span className="pill" style={{ position: 'absolute', left: '50%', top: -14, transform: 'translateX(-50%)', fontSize: 10, padding: '1px 6px', background: isMe ? C.sun : C.cream }}>
                  {isMe ? 'You' : 'Host'}
                </span>
              )}
            </motion.button>
          </div>
        );
      })}
      {visible.length > 24 && (
        <span className="pill" style={{ position: 'absolute', left: 12, top: 12, zIndex: 300 }}>+{visible.length - 24} more on the lawn</span>
      )}
    </div>
  );
}
