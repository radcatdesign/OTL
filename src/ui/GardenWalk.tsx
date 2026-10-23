import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Icon } from '../brand/icons';
import { Otis, OtisAvatar } from '../brand/otis/Otis';
import { Plant, STAGE_NAMES, type Stage } from '../brand/Plant';
import { C } from '../brand/palette';
import { flowerHead } from '../brand/otis/parts';
import { SEED_INTENT, type SeedIntent } from '../lib/intents';
import { userById, useMe, useStore } from '../lib/store';
import type { LawnEvent, Seed, User } from '../lib/types';
import { firstName, stageOf } from '../lib/util';
import { useWide } from '../lib/useWide';

// ---------- the plot ----------
// World units. The camera follows your Otis around a plot bigger than the screen.
const W = 2200;
const H = 1400;
const WALK = { x0: 90, x1: W - 90, y0: 260, y1: H - 80 };
const GATE = { x: W / 2, y: H - 190 };
const PLAZA = { x: W / 2, y: 720, r: 130 };
const POND = { x: 1730, y: 1020, rx: 200, ry: 110 };
const BLANKET = { x: 300, y: 930, w: 280, h: 180 };
const TREES = [
  { x: 330, y: 520, s: 1.1 },
  { x: 1900, y: 520, s: 1.25 },
  { x: 760, y: 1180, s: 0.9 },
  { x: 1450, y: 400, s: 0.85 },
];
const SIGN = { x: PLAZA.x, y: PLAZA.y - 60 };

const SPEED = 310;
const NPC_SPEED = 72;
const REACH = 140;
const OTIS_W = 74;
const PLANT_W: Record<Stage, number> = { seed: 106, sprout: 110, bud: 114, bloom: 126 };
// How much of the plant art's height is actually drawn, from the ground up.
const SHOWN: Record<Stage, number> = { seed: 0.34, sprout: 0.5, bud: 0.74, bloom: 0.84 };
const plantTop = (stage: Stage) => PLANT_W[stage] * (140 / 120) * SHOWN[stage] + 8;

type Pt = { x: number; y: number };
type SeedInput = { intent: SeedIntent; title: string; details: string; link?: string };

export interface GardenWalkHandle {
  water: (seedId: string, message: string) => void;
  plant: (p: SeedInput) => void;
}

// ---------- helpers ----------
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const inPond = (p: Pt, pad = 0) => ((p.x - POND.x) / (POND.rx + pad)) ** 2 + ((p.y - POND.y) / (POND.ry + pad)) ** 2 < 1;
const onBlanket = (p: Pt, pad = 0) => p.x > BLANKET.x - pad && p.x < BLANKET.x + BLANKET.w + pad && p.y > BLANKET.y - pad && p.y < BLANKET.y + BLANKET.h + pad;

function plantable(p: Pt, taken: Pt[]) {
  if (p.x < WALK.x0 + 60 || p.x > WALK.x1 - 60 || p.y < WALK.y0 + 70 || p.y > WALK.y1 - 30) return false;
  if (inPond(p, 70) || onBlanket(p, 50) || dist(p, PLAZA) < PLAZA.r + 40 || dist(p, GATE) < 150) return false;
  // Keep plants out from behind tree canopies and the signpost, where they'd be hidden.
  if (TREES.some((t) => Math.abs(p.x - t.x) < 150 * t.s && p.y > t.y - 280 * t.s && p.y < t.y + 70)) return false;
  if (Math.abs(p.x - SIGN.x) < 150 && p.y > SIGN.y - 170 && p.y < SIGN.y + 40) return false;
  return taken.every((q) => dist(p, q) > 145);
}

// Seeds planted before the walkable garden existed get a stable spot from their id.
function layoutSeeds(seeds: Seed[]): Map<string, Pt> {
  const out = new Map<string, Pt>();
  const taken: Pt[] = [];
  const sorted = [...seeds].sort((a, b) => a.createdAt - b.createdAt);
  for (const s of sorted) if (s.spot) { const p = { x: s.spot.x * W, y: s.spot.y * H }; out.set(s.id, p); taken.push(p); }
  for (const s of sorted) {
    if (s.spot) continue;
    const r = rng(hash(s.id));
    let p: Pt = { x: 400 + r() * 1400, y: 380 + r() * 800 };
    for (let i = 0; i < 80; i++) {
      const c = { x: WALK.x0 + 80 + r() * (WALK.x1 - WALK.x0 - 160), y: WALK.y0 + 90 + r() * (WALK.y1 - WALK.y0 - 140) };
      if (plantable(c, taken)) { p = c; break; }
    }
    out.set(s.id, p);
    taken.push(p);
  }
  return out;
}

// Nearest open patch of soil around a point, spiralling out.
function spotNear(from: Pt, taken: Pt[]): Pt | null {
  if (plantable(from, taken)) return from;
  for (let r = 40; r <= 520; r += 30) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2 + r;
      const c = { x: from.x + Math.cos(ang) * r, y: from.y + Math.sin(ang) * r * 0.8 };
      if (plantable(c, taken)) return c;
    }
  }
  return null;
}

// Keep a point on the walkable lawn and out of the pond, trees and signpost.
function resolve(p: Pt, plants: Pt[]) {
  let { x, y } = p;
  x = Math.min(WALK.x1, Math.max(WALK.x0, x));
  y = Math.min(WALK.y1, Math.max(WALK.y0, y));
  const dx = (x - POND.x) / (POND.rx + 22), dy = (y - POND.y) / (POND.ry + 16);
  const d = Math.hypot(dx, dy);
  if (d < 1 && d > 0) { x = POND.x + (dx / d) * (POND.rx + 22); y = POND.y + (dy / d) * (POND.ry + 16); }
  const solids = [...TREES.map((t) => ({ x: t.x, y: t.y, r: 34 * t.s })), { x: SIGN.x, y: SIGN.y, r: 26 }, ...plants.map((q) => ({ ...q, r: 42 }))];
  for (const o of solids) {
    const ox = x - o.x, oy = (y - o.y) * 1.6;
    const od = Math.hypot(ox, oy);
    if (od < o.r && od > 0.01) { x = o.x + (ox / od) * o.r; y = o.y + (oy / od) * o.r / 1.6; }
  }
  return { x, y };
}

// ---------- scenery ----------
const Ground = memo(function Ground() {
  const tufts = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 110 }, () => ({ x: 60 + r() * (W - 120), y: 250 + r() * (H - 320) })).filter((p) => !inPond(p, 30) && !onBlanket(p, 10));
  }, []);
  const flowers = useMemo(() => {
    const r = rng(11);
    const sets = [
      ['#F5C31D', '#F73D00', '#F5C31D', '#F73D00', '#F5C31D', '#F73D00', '#F5C31D', '#F73D00'],
      ['#70A0F9', '#FDFAEF', '#70A0F9', '#FDFAEF', '#70A0F9', '#FDFAEF', '#70A0F9', '#FDFAEF'],
      ['#FF8101', '#F5C31D', '#FF8101', '#F5C31D', '#FF8101', '#F5C31D', '#FF8101', '#F5C31D'],
    ];
    return Array.from({ length: 34 }, (_, i) => ({ x: 70 + r() * (W - 140), y: 270 + r() * (H - 360), s: 0.16 + r() * 0.1, petals: sets[i % 3] }))
      .filter((p) => !inPond(p, 40) && !onBlanket(p, 20) && dist(p, PLAZA) > PLAZA.r + 20);
  }, []);
  const path = `M${W / 2} ${H + 20} C ${W / 2 - 40} ${H - 200}, ${W / 2 + 60} ${H - 380}, ${PLAZA.x} ${PLAZA.y}`;
  const left = `M${PLAZA.x - 60} ${PLAZA.y + 30} C ${PLAZA.x - 380} ${PLAZA.y + 120}, ${BLANKET.x + 420} ${BLANKET.y - 80}, ${BLANKET.x + BLANKET.w - 20} ${BLANKET.y + 40}`;
  const right = `M${PLAZA.x + 60} ${PLAZA.y + 30} C ${PLAZA.x + 300} ${PLAZA.y + 60}, ${POND.x - 360} ${POND.y - 160}, ${POND.x - POND.rx + 20} ${POND.y - 40}`;
  const back = `M${PLAZA.x} ${PLAZA.y - 40} C ${PLAZA.x - 40} ${PLAZA.y - 200}, ${PLAZA.x + 120} ${PLAZA.y - 330}, ${PLAZA.x + 40} ${WALK.y0 - 40}`;
  return (
    <svg className="gw-ground" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <pattern id="gw-check" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill={C.cream} /><rect width="20" height="20" fill={C.tomato} /><rect x="20" y="20" width="20" height="20" fill={C.tomato} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={C.lawn} />
      {Array.from({ length: Math.ceil(H / 96) }, (_, i) => <rect key={i} x="0" y={i * 96} width={W} height="48" fill="#9AC21A" opacity="0.55" />)}
      {/* tree line along the back */}
      <rect width={W} height="200" fill={C.forest} />
      {Array.from({ length: 24 }, (_, i) => {
        const x = i * 96 + (i % 2) * 30;
        return <g key={i}><circle cx={x} cy={170 + (i % 3) * 14} r={88} fill={C.forest} stroke={C.pine} strokeWidth="5" /><circle cx={x - 26} cy={140 + (i % 3) * 14} r={24} fill="#2E8A33" /></g>;
      })}
      <path d={`M0 228 H${W}`} stroke={C.pine} strokeWidth="5" opacity="0.25" />
      {/* paths */}
      {[path, left, right, back].map((d, i) => <path key={`o${i}`} d={d} stroke={C.pine} strokeWidth="96" strokeLinecap="round" fill="none" />)}
      {[path, left, right, back].map((d, i) => <path key={`f${i}`} d={d} stroke="#EFE3BE" strokeWidth="86" strokeLinecap="round" fill="none" />)}
      {[path, left, right, back].map((d, i) => <path key={`s${i}`} d={d} stroke="#E2D1A0" strokeWidth="10" strokeDasharray="2 38" strokeLinecap="round" fill="none" />)}
      <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r + 5} fill={C.pine} />
      <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r} fill="#EFE3BE" />
      <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r - 34} fill="none" stroke="#E2D1A0" strokeWidth="8" strokeDasharray="14 18" />
      {/* pond */}
      <ellipse cx={POND.x} cy={POND.y + 8} rx={POND.rx + 6} ry={POND.ry + 6} fill={C.pine} />
      <ellipse cx={POND.x} cy={POND.y} rx={POND.rx} ry={POND.ry} fill={C.sky} />
      <ellipse cx={POND.x - 60} cy={POND.y - 34} rx={70} ry={16} fill="#A9C6FC" />
      {[[-80, 30], [70, -20], [110, 40]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${POND.x + dx} ${POND.y + dy})`}><path d="M0 0 L22 -6 A24 14 0 1 1 22 6 Z" fill={C.lawn} stroke={C.pine} strokeWidth="4" /></g>
      ))}
      {/* picnic blanket */}
      <g transform={`rotate(-4 ${BLANKET.x + BLANKET.w / 2} ${BLANKET.y + BLANKET.h / 2})`}>
        <rect x={BLANKET.x} y={BLANKET.y} width={BLANKET.w} height={BLANKET.h} rx="10" fill="url(#gw-check)" stroke={C.pine} strokeWidth="5" />
      </g>
      {/* grass and wildflowers */}
      {tufts.map((t, i) => <path key={i} d={`M${t.x - 9} ${t.y} l4 -12 l3 9 l4 -14 l3 12 l4 -9 l3 14`} stroke={C.pine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />)}
      {flowers.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) scale(${f.s}) translate(-186.4 -305.3)`} dangerouslySetInnerHTML={{ __html: flowerHead(f.petals) }} />
      ))}
    </svg>
  );
});

function Tree({ s }: { s: number }) {
  return (
    <svg width={220 * s} height={260 * s} viewBox="0 0 220 260" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <ellipse cx="110" cy="250" rx="70" ry="14" fill={C.pine} opacity="0.2" />
      <path d="M96 250 L102 150 H118 L124 250 Z" fill={C.soil} stroke={C.pine} strokeWidth="6" strokeLinejoin="round" />
      <circle cx="110" cy="100" r="92" fill={C.forest} stroke={C.pine} strokeWidth="6" />
      <circle cx="62" cy="130" r="52" fill={C.forest} stroke={C.pine} strokeWidth="6" />
      <circle cx="160" cy="128" r="56" fill={C.forest} stroke={C.pine} strokeWidth="6" />
      <circle cx="80" cy="66" r="26" fill="#2E8A33" />
      <circle cx="150" cy="96" r="10" fill={C.tomato} stroke={C.pine} strokeWidth="3" />
      <circle cx="72" cy="140" r="9" fill={C.tomato} stroke={C.pine} strokeWidth="3" />
      <circle cx="118" cy="150" r="9" fill={C.tomato} stroke={C.pine} strokeWidth="3" />
    </svg>
  );
}

function Signpost({ title }: { title: string }) {
  const t = title.length > 22 ? `${title.slice(0, 21)}...` : title;
  return (
    <svg width="230" height="150" viewBox="0 0 230 150" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <ellipse cx="115" cy="146" rx="40" ry="8" fill={C.pine} opacity="0.2" />
      <rect x="106" y="60" width="18" height="86" rx="4" fill={C.soil} stroke={C.pine} strokeWidth="5" />
      <rect x="6" y="6" width="218" height="66" rx="14" fill={C.cream} stroke={C.pine} strokeWidth="6" />
      <text x="115" y="34" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="15" fill={C.pine}>Welcome to the garden</text>
      <text x="115" y="58" textAnchor="middle" fontFamily="'Titan One', sans-serif" fontSize="17" fill={C.forest}>{t}</text>
    </svg>
  );
}

const Fence = memo(function Fence() {
  const gap = { from: W / 2 - 130, to: W / 2 + 130 };
  const posts: number[] = [];
  for (let x = 10; x < W; x += 44) if (x < gap.from || x > gap.to) posts.push(x);
  return (
    <svg className="gw-fence" width={W} height="120" viewBox={`0 0 ${W} 120`} style={{ top: H - 92 }} aria-hidden>
      <rect x="0" y="40" width={gap.from} height="14" fill={C.cream} stroke={C.pine} strokeWidth="4" />
      <rect x={gap.to} y="40" width={W - gap.to} height="14" fill={C.cream} stroke={C.pine} strokeWidth="4" />
      {posts.map((x) => <path key={x} d={`M${x} 92 V22 L${x + 13} 8 L${x + 26} 22 V92 Z`} fill={C.cream} stroke={C.pine} strokeWidth="4" strokeLinejoin="round" />)}
      <path d={`M${gap.from - 6} 92 V0 M${gap.to + 6} 92 V0`} stroke={C.pine} strokeWidth="16" strokeLinecap="round" />
      <path d={`M${gap.from - 6} 6 Q ${W / 2} -70 ${gap.to + 6} 6`} stroke={C.pine} strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d={`M${gap.from - 6} 6 Q ${W / 2} -70 ${gap.to + 6} 6`} stroke={C.sun} strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  );
});

function Drop({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 12 16" aria-hidden style={{ display: 'block' }}>
      <path d="M6 1C8 5 11 8 11 10.5A5 5 0 0 1 1 10.5C1 8 4 5 6 1Z" fill={C.sky} stroke={C.pine} strokeWidth="1.8" />
    </svg>
  );
}

// ---------- plants ----------
const PlantSprite = memo(function PlantSprite({ seed, pos, stage, waters, mine, thirsty, focused, fresh, onPick }: {
  seed: Seed; pos: Pt; stage: Stage; waters: number; mine: boolean; thirsty: boolean; focused: boolean; fresh: boolean; onPick: (id: string) => void;
}) {
  const info = SEED_INTENT[seed.intent];
  const prev = useRef(stage);
  const prevWaters = useRef(waters);
  const [burst, setBurst] = useState(0);
  const [splash, setSplash] = useState(0);
  useEffect(() => {
    if (prev.current !== stage) { prev.current = stage; setBurst((b) => b + 1); }
  }, [stage]);
  useEffect(() => {
    if (waters > prevWaters.current) setSplash((x) => x + 1);
    prevWaters.current = waters;
  }, [waters]);
  const top = plantTop(stage);
  return (
    <button
      type="button"
      className={`gw-ent gw-plant${fresh ? ' fresh' : ''}${focused ? ' focused' : ''}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, zIndex: Math.round(pos.y) }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onPick(seed.id); }}
      aria-label={`${info.ask}: ${seed.title}. ${STAGE_NAMES[stage]}. Walk over.`}
    >
      <span className="gw-plant-art" key={`${stage}-${burst}`} style={{ width: PLANT_W[stage] }}>
        <Plant stage={stage} color={info.color} accent={info.accent} size="100%" />
      </span>
      {burst > 0 && <span key={`b${burst}`} className="gw-burst" style={{ top: -top * 0.7 }} aria-hidden><i /><i /><i /><i /><i /><i /></span>}
      {splash > 0 && <span key={`s${splash}`} className="gw-splash" style={{ top: -top * 0.45 }} aria-hidden><i /><i /><i /><i /><i /></span>}
      {mine && !seed.bloomedAt ? <span className="gw-badge mine" style={{ top: -top - 30 }} aria-hidden>Yours</span>
        : thirsty ? <span className="gw-badge thirsty" style={{ top: -top - 30 }} aria-hidden><Drop size={14} /></span> : null}
    </button>
  );
});

// ---------- people ----------
interface Npc {
  user: User;
  home: Pt;
  x: number; y: number;
  tx: number | null; ty: number | null;
  next: number;
  facing: 1 | -1;
  walkT: number;
  said: boolean;
  task?: { seedId: string; to: Pt; phase: 'walk' | 'pour'; t: number; wateringId: string };
  el?: HTMLDivElement | null;
  body?: HTMLDivElement | null;
}

const NpcSprite = memo(function NpcSprite({ user, onRef, onBodyRef, onPick }: {
  user: User; onRef: (el: HTMLDivElement | null) => void; onBodyRef: (el: HTMLDivElement | null) => void; onPick: (id: string) => void;
}) {
  return (
    <div ref={onRef} className="gw-ent gw-npc">
      <span className="gw-shadow" />
      <button
        type="button"
        className="gw-body-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPick(user.id); }}
        aria-label={`${user.name}. See their card.`}
      >
        <div ref={onBodyRef} className="gw-body">
          <Otis look={user.otis} shadow={false} size={OTIS_W} title={user.name} />
          <span className="gw-can" aria-hidden><Icon name="wateringCan" size={46} /></span>
          <span className="gw-drops" aria-hidden><i /><i /><i /><i /><i /></span>
        </div>
      </button>
      <span className="gw-tag">{firstName(user.name)}</span>
      <span className="gw-say" aria-hidden />
    </div>
  );
});

// ---------- the garden ----------
export const GardenWalk = forwardRef<GardenWalkHandle, {
  ev: LawnEvent;
  paused: boolean;
  onOpenSeed: (seedId: string) => void;
  onPerson: (userId: string) => void;
  onPlantHere: () => void;
}>(function GardenWalk({ ev, paused, onOpenSeed, onPerson, onPlantHere }, ref) {
  const me = useMe()!;
  const db = useStore((s) => s.db);
  const plantSeed = useStore((s) => s.plantSeed);
  const waterSeed = useStore((s) => s.waterSeed);
  const toast = useStore((s) => s.toast);
  const wide = useWide();
  const scale = wide ? 1 : 0.72;

  const seeds = useMemo(() => db.seeds.filter((s) => s.eventId === ev.id), [db.seeds, ev.id]);
  const spots = useMemo(() => layoutSeeds(seeds), [seeds]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of db.waterings) m.set(w.seedId, (m.get(w.seedId) ?? 0) + 1);
    return m;
  }, [db.waterings]);

  // Waterings by neighbors are held back until their Otis walks over and pours.
  const [held, setHeld] = useState<Record<string, number>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const [acting, setActing] = useState(false);
  const mountedAt = useRef(Date.now());

  const npcUsers = useMemo(() => {
    const here = db.memberships.filter((m) => m.eventId === ev.id && m.status === 'here' && m.userId !== me.id).map((m) => m.userId);
    const planters = seeds.map((s) => s.userId).filter((id) => id !== me.id);
    const ids = [...new Set([...planters, ...here])].slice(0, 16);
    return ids.map((id) => userById(db, id)).filter((u): u is User => !!u);
  }, [db, ev.id, me.id, seeds]);

  // ----- refs the frame loop reads -----
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const playerEl = useRef<HTMLDivElement>(null);
  const playerBody = useRef<HTMLDivElement>(null);
  const miniMe = useRef<SVGCircleElement>(null);
  const miniView = useRef<SVGRectElement>(null);
  const player = useRef({ x: GATE.x, y: GATE.y, tx: null as number | null, ty: null as number | null, facing: 1 as 1 | -1, walkT: 0, open: null as string | null, then: null as null | (() => void) });
  const action = useRef<null | { kind: 'water' | 'plant'; t: number; dur: number; fireAt: number; fired: boolean; fire: () => void }>(null);
  const keys = useRef(new Set<string>());
  const cam = useRef({ x: GATE.x - 600, y: GATE.y - 400, ready: false });
  const npcs = useRef(new Map<string, Npc>());
  const plantsPos = useRef<{ id: string; p: Pt }[]>([]);
  const pausedRef = useRef(paused);
  const focusRef = useRef<string | null>(null);
  const seenWaterings = useRef(new Set(db.waterings.map((w) => w.id)));
  const greetAt = useRef(0);
  const cbs = useRef({ onOpenSeed, onPerson });
  pausedRef.current = paused;
  cbs.current = { onOpenSeed, onPerson };
  plantsPos.current = seeds.map((s) => ({ id: s.id, p: spots.get(s.id)! }));

  // Set up and refresh the neighbors without losing where they are standing.
  for (const u of npcUsers) {
    if (npcs.current.has(u.id)) continue;
    const theirs = seeds.filter((s) => s.userId === u.id).sort((a, b) => b.createdAt - a.createdAt)[0];
    const r = rng(hash(u.id));
    let home: Pt;
    if (theirs) {
      const p = spots.get(theirs.id)!;
      home = resolve({ x: p.x + (r() > 0.5 ? 92 : -92), y: p.y + 14 }, []);
    } else {
      home = resolve({ x: WALK.x0 + 120 + r() * (WALK.x1 - WALK.x0 - 240), y: WALK.y0 + 80 + r() * (WALK.y1 - WALK.y0 - 160) }, []);
    }
    npcs.current.set(u.id, { user: u, home, x: home.x, y: home.y, tx: null, ty: null, next: performance.now() + 800 + r() * 4000, facing: r() > 0.5 ? 1 : -1, walkT: r() * 10, said: false });
  }

  // A neighbor watered a seed: send their Otis over to pour.
  useEffect(() => {
    const fresh = db.waterings.filter((w) => !seenWaterings.current.has(w.id));
    if (!fresh.length) return;
    const holds: Record<string, number> = {};
    for (const w of fresh) {
      seenWaterings.current.add(w.id);
      const n = npcs.current.get(w.userId);
      const p = spots.get(w.seedId);
      if (w.userId === me.id || !n || !p) continue;
      const side = n.x < p.x ? -1 : 1;
      n.task = { seedId: w.seedId, to: resolve({ x: p.x + side * 80, y: p.y + 10 }, []), phase: 'walk', t: 0, wateringId: w.id };
      holds[w.seedId] = (holds[w.seedId] ?? 0) + 1;
    }
    if (Object.keys(holds).length) setHeld((h) => { const n = { ...h }; for (const k in holds) n[k] = (n[k] ?? 0) + holds[k]; return n; });
  }, [db.waterings, spots, me.id]);

  const release = (seedId: string) => setHeld((h) => { const n = { ...h }; n[seedId] = Math.max(0, (n[seedId] ?? 0) - 1); if (!n[seedId]) delete n[seedId]; return n; });
  const releaseRef = useRef(release);
  releaseRef.current = release;

  // ----- actions the page can ask for -----
  const walkTo = (p: Pt, open: string | null = null) => {
    const q = resolve(p, []);
    player.current.tx = q.x; player.current.ty = q.y; player.current.open = open;
    setHint(false);
  };
  const standBy = (seedId: string): Pt => {
    const p = spots.get(seedId)!;
    const side = player.current.x < p.x ? -1 : 1;
    return { x: p.x + side * 80, y: p.y + 10 };
  };

  useImperativeHandle(ref, () => ({
    water: (seedId, message) => {
      const p = spots.get(seedId);
      if (!p) { waterSeed(seedId, message); return; }
      const pl = player.current;
      const begin = () => {
        pl.facing = pl.x < p.x ? 1 : -1;
        action.current = { kind: 'water', t: 0, dur: 1.7, fireAt: 1.05, fired: false, fire: () => waterSeed(seedId, message) };
      };
      setActing(true);
      // Step up beside the plant first, then pour.
      const at = resolve(standBy(seedId), []);
      if (dist(pl, at) > 18) { pl.tx = at.x; pl.ty = at.y; pl.open = null; pl.then = begin; }
      else begin();
    },
    plant: (input) => {
      const pl = player.current;
      const taken = plantsPos.current.map((x) => x.p);
      const at = spotNear({ x: pl.x + pl.facing * 82, y: pl.y + 4 }, taken) ?? spotNear({ x: W / 2, y: H / 2 }, taken);
      if (!at) { plantSeed(ev.id, input); return; }
      pl.tx = pl.ty = null;
      pl.facing = at.x >= pl.x ? 1 : -1;
      action.current = { kind: 'plant', t: 0, dur: 1.0, fireAt: 0.5, fired: false, fire: () => plantSeed(ev.id, { ...input, spot: { x: at.x / W, y: at.y / H } }) };
      setActing(true);
    },
  }), [spots, waterSeed, plantSeed, ev.id]);

  // ----- keyboard -----
  const onPlantHereRef = useRef(onPlantHere);
  onPlantHereRef.current = onPlantHere;
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const MOVE = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
    const down = (e: KeyboardEvent) => {
      if (pausedRef.current || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (MOVE.has(k)) { keys.current.add(k); e.preventDefault(); setHint(false); return; }
      if ((k === 'e' || k === ' ' || k === 'enter') && focusRef.current && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); cbs.current.onOpenSeed(focusRef.current); }
      if (k === 'p') { e.preventDefault(); onPlantHereRef.current(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  // ----- the frame loop -----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const pl = player.current;
      const vp = viewport.current;
      const plantPts = plantsPos.current.map((x) => x.p);
      let moving = false;

      // you
      const act = action.current;
      if (act) {
        act.t += dt;
        if (!act.fired && act.t >= act.fireAt) { act.fired = true; act.fire(); }
        if (act.t >= act.dur) { action.current = null; setActing(false); }
      } else if (!pausedRef.current) {
        const k = keys.current;
        let dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
        let dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
        if ((dx || dy) && !pl.then) {
          pl.tx = pl.ty = null; pl.open = null;
          const m = Math.hypot(dx, dy); dx /= m; dy /= m;
        } else if (pl.tx !== null && pl.ty !== null) {
          dx = dy = 0;
          const ex = pl.tx - pl.x, ey = pl.ty - pl.y;
          const d = Math.hypot(ex, ey);
          if (d < 6) {
            pl.tx = pl.ty = null;
            if (pl.then) { const f = pl.then; pl.then = null; f(); }
            else if (pl.open) {
              const sp = plantsPos.current.find((x) => x.id === pl.open)?.p;
              if (sp) pl.facing = sp.x >= pl.x ? 1 : -1;
              const id = pl.open; pl.open = null;
              cbs.current.onOpenSeed(id);
            }
          } else { dx = ex / d; dy = ey / d; }
        }
        if (dx || dy) {
          moving = true;
          const next = resolve({ x: pl.x + dx * SPEED * dt, y: pl.y + dy * SPEED * dt * 0.85 }, plantPts);
          if (Math.abs(next.x - pl.x) + Math.abs(next.y - pl.y) < 0.05 && pl.tx !== null) {
            pl.tx = pl.ty = null;
            if (pl.then) { const f = pl.then; pl.then = null; f(); }
          }
          pl.x = next.x; pl.y = next.y;
          if (Math.abs(dx) > 0.15) pl.facing = dx > 0 ? 1 : -1;
          pl.walkT += dt;
        }
      }
      if (playerEl.current) {
        playerEl.current.style.transform = `translate(${pl.x}px, ${pl.y}px)`;
        playerEl.current.style.zIndex = String(Math.round(pl.y) + 1);
        playerEl.current.dataset.act = action.current?.kind ?? '';
        playerEl.current.dataset.moving = moving ? '1' : '';
      }
      if (playerBody.current) {
        const bob = moving ? Math.abs(Math.sin(pl.walkT * 13)) * 9 : 0;
        const tilt = moving ? Math.sin(pl.walkT * 13) * 5 : 0;
        const breathe = moving ? 1 : 1 + Math.sin(now / 520) * 0.012;
        playerBody.current.style.transform = `translateY(${-bob}px) rotate(${tilt}deg) scale(${pl.facing}, ${breathe})`;
      }

      // neighbors
      for (const n of npcs.current.values()) {
        let nm = false;
        if (n.task) {
          const tk = n.task;
          if (tk.phase === 'walk') {
            const ex = tk.to.x - n.x, ey = tk.to.y - n.y, d = Math.hypot(ex, ey);
            if (d < 5 || tk.t > 14) {
              tk.phase = 'pour'; tk.t = 0;
              const sp = plantsPos.current.find((x) => x.id === tk.seedId)?.p;
              if (sp) n.facing = sp.x >= n.x ? 1 : -1;
            } else {
              const sp = NPC_SPEED * 2.2;
              const q = resolve({ x: n.x + (ex / d) * sp * dt, y: n.y + (ey / d) * sp * dt }, plantPts);
              n.x = q.x; n.y = q.y; n.facing = ex > 0 ? 1 : -1; nm = true; n.walkT += dt;
            }
            tk.t += dt;
          } else {
            tk.t += dt;
            if (tk.t > 1.4) { releaseRef.current(tk.seedId); n.task = undefined; n.next = now + 3000; n.home = { x: n.x, y: n.y }; }
          }
        } else {
          if (n.tx === null && now > n.next && !pausedRef.current) {
            const r = Math.random;
            const c = resolve({ x: n.home.x + (r() - 0.5) * 300, y: n.home.y + (r() - 0.5) * 200 }, []);
            if (!inPond(c, 30)) { n.tx = c.x; n.ty = c.y; }
            n.next = now + 3500 + r() * 6000;
          }
          if (n.tx !== null && n.ty !== null) {
            const ex = n.tx - n.x, ey = n.ty - n.y, d = Math.hypot(ex, ey);
            if (d < 4) { n.tx = n.ty = null; }
            else {
              const q = resolve({ x: n.x + (ex / d) * NPC_SPEED * dt, y: n.y + (ey / d) * NPC_SPEED * dt }, plantPts);
              if (Math.abs(q.x - n.x) + Math.abs(q.y - n.y) < 0.01) { n.tx = n.ty = null; }
              n.x = q.x; n.y = q.y; n.facing = ex > 0 ? 1 : -1; nm = true; n.walkT += dt;
            }
          }
        }
        const near = dist(n, pl) < 170;
        if (near && !n.said && n.el && dist(n, pl) < 135 && now > greetAt.current) {
          greetAt.current = now + 1600;
          n.said = true;
          n.facing = pl.x >= n.x ? 1 : -1;
          const say = n.el.querySelector('.gw-say') as HTMLElement | null;
          if (say) {
            const lines = [`Hi ${firstName(me.name)}!`, 'Hey neighbor', 'Good to see you', 'Water something?', 'Love your hat'];
            say.textContent = lines[hash(n.user.id + me.id) % lines.length];
            n.el.dataset.say = '1';
            setTimeout(() => { if (n.el) n.el.dataset.say = ''; }, 2400);
          }
        }
        if (n.el) {
          n.el.style.transform = `translate(${n.x}px, ${n.y}px)`;
          n.el.style.zIndex = String(Math.round(n.y));
          n.el.dataset.near = near ? '1' : '';
          n.el.dataset.act = n.task?.phase === 'pour' ? 'water' : '';
        }
        if (n.body) {
          const bob = nm ? Math.abs(Math.sin(n.walkT * 11)) * 7 : 0;
          const tilt = nm ? Math.sin(n.walkT * 11) * 4 : 0;
          n.body.style.transform = `translateY(${-bob}px) rotate(${tilt}deg) scaleX(${n.facing})`;
        }
      }

      // what's in reach
      let best: string | null = null, bd = REACH;
      for (const { id, p } of plantsPos.current) { const d = dist(pl, p); if (d < bd) { bd = d; best = id; } }
      if (best !== focusRef.current) { focusRef.current = best; setFocus(best); }

      // camera
      if (vp && world.current) {
        const vw = vp.clientWidth / scale, vh = vp.clientHeight / scale;
        const clampX = (x: number) => (W <= vw ? (W - vw) / 2 : Math.min(W - vw, Math.max(0, x)));
        const clampY = (y: number) => (H <= vh ? (H - vh) / 2 : Math.min(H - vh, Math.max(0, y)));
        const gx = clampX(pl.x - vw / 2), gy = clampY(pl.y - vh * 0.58);
        const c = cam.current;
        if (!c.ready) { c.x = gx; c.y = gy; c.ready = true; }
        const f = 1 - Math.exp(-dt * 6);
        c.x += (gx - c.x) * f; c.y += (gy - c.y) * f;
        world.current.style.transform = `translate(${-c.x * scale}px, ${-c.y * scale}px) scale(${scale})`;
        if (miniView.current) {
          miniView.current.setAttribute('x', String(c.x)); miniView.current.setAttribute('y', String(c.y));
          miniView.current.setAttribute('width', String(Math.min(W, vw))); miniView.current.setAttribute('height', String(Math.min(H, vh)));
        }
      }
      if (miniMe.current) { miniMe.current.setAttribute('cx', String(pl.x)); miniMe.current.setAttribute('cy', String(pl.y)); }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scale, me.name]);

  // ----- pointer: tap or click the lawn to walk there -----
  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  const toWorld = (cx: number, cy: number): Pt => {
    const r = viewport.current!.getBoundingClientRect();
    return { x: (cx - r.left) / scale + cam.current.x, y: (cy - r.top) / scale + cam.current.y };
  };
  const onDown = (e: React.PointerEvent) => { press.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current; press.current = null;
    if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12 || pausedRef.current || action.current) return;
    walkTo(toWorld(e.clientX, e.clientY));
  };
  const pickSeed = (id: string) => {
    if (action.current) return;
    const p = spots.get(id);
    if (!p) return;
    if (dist(player.current, p) < REACH) { player.current.facing = p.x >= player.current.x ? 1 : -1; onOpenSeed(id); return; }
    walkTo(standBy(id), id);
  };

  // ----- what's in reach -----
  const fSeed = focus ? seeds.find((s) => s.id === focus) : undefined;
  const fPos = fSeed ? spots.get(fSeed.id) : undefined;
  const stageFor = (s: Seed) => stageOf(s, Math.max(0, (counts.get(s.id) ?? 0) - (held[s.id] ?? 0)));
  const fInfo = fSeed ? SEED_INTENT[fSeed.intent] : undefined;
  const fPlanter = fSeed ? userById(db, fSeed.userId) : undefined;
  const fMine = fSeed?.userId === me.id;
  const fStage = fSeed ? stageFor(fSeed) : undefined;
  const fCount = fSeed ? counts.get(fSeed.id) ?? 0 : 0;
  const actionLabel = !fSeed ? '' : fSeed.bloomedAt ? 'See who is growing it' : fMine ? (fCount ? 'Pick who to grow it with' : 'Look at your seed') : 'Water it';
  const blooms = seeds.filter((s) => s.bloomedAt).length;
  const thirsty = seeds.filter((s) => !s.bloomedAt && !(counts.get(s.id) ?? 0) && s.userId !== me.id).length;

  return (
    <section className="gw" aria-label={`${ev.title} garden. Walk around, plant seeds and water other people's.`}>
      <div
        ref={viewport}
        className="gw-viewport"
        role="application"
        aria-roledescription="walkable garden"
        aria-label="Garden. Use the arrow keys or WASD to walk. Press E to open the seed in front of you and P to plant."
        tabIndex={0}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => { press.current = null; }}
      >
        <div ref={world} className="gw-world" style={{ width: W, height: H }}>
          <Ground />
          {TREES.map((t, i) => (
            <div key={i} className="gw-ent gw-prop" style={{ transform: `translate(${t.x}px, ${t.y}px)`, zIndex: Math.round(t.y) }}>
              <div style={{ transform: 'translate(-50%, -96%)' }}><Tree s={t.s} /></div>
            </div>
          ))}
          <div className="gw-ent gw-prop" style={{ transform: `translate(${SIGN.x}px, ${SIGN.y}px)`, zIndex: SIGN.y }}>
            <div style={{ transform: 'translate(-50%, -97%)' }}><Signpost title={`${ev.title}`} /></div>
          </div>
          <div className="gw-ent gw-prop" style={{ transform: `translate(${BLANKET.x + 205}px, ${BLANKET.y + 95}px)`, zIndex: BLANKET.y + 95 }}>
            <div style={{ transform: 'translate(-50%, -90%)' }}><Icon name="basket" size={86} /></div>
          </div>

          {seeds.map((s) => (
            <PlantSprite
              key={s.id}
              seed={s}
              pos={spots.get(s.id)!}
              stage={stageFor(s)}
              waters={Math.max(0, (counts.get(s.id) ?? 0) - (held[s.id] ?? 0))}
              mine={s.userId === me.id}
              thirsty={!s.bloomedAt && !(counts.get(s.id) ?? 0) && s.userId !== me.id}
              focused={focus === s.id}
              fresh={s.createdAt > mountedAt.current}
              onPick={pickSeed}
            />
          ))}

          {npcUsers.map((u) => (
            <NpcSprite
              key={u.id}
              user={u}
              onRef={(el) => { const n = npcs.current.get(u.id); if (n) n.el = el; }}
              onBodyRef={(el) => { const n = npcs.current.get(u.id); if (n) n.body = el; }}
              onPick={onPerson}
            />
          ))}

          <div ref={playerEl} className="gw-ent gw-player">
            <span className="gw-shadow gw-ring" />
            <div ref={playerBody} className="gw-body">
              <Otis look={me.otis} shadow={false} size={OTIS_W} title="You" />
              <span className="gw-can" aria-hidden><Icon name="wateringCan" size={46} /></span>
              <span className="gw-drops" aria-hidden><i /><i /><i /><i /><i /></span>
            </div>
            <span className="gw-dirt" aria-hidden><i /><i /><i /><i /><i /></span>
            <svg className="gw-you" width="26" height="22" viewBox="0 0 26 22" aria-hidden><path d="M3 3H23L13 19Z" fill={C.sun} stroke={C.pine} strokeWidth="3.5" strokeLinejoin="round" /></svg>
          </div>

          {fSeed && fPos && fInfo && fStage && !acting && (
            <div className="gw-label" style={{ transform: `translate(${fPos.x}px, ${fPos.y - Math.max(plantTop(fStage) + 40, 200)}px)` }}>
              <div className="gw-label-card">
                <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: C[fInfo.color] }} /><span className="small strong">{fInfo.ask}</span></span>
                <p className="strong" style={{ lineHeight: 1.2 }}>{fSeed.title}</p>
                <span className="row" style={{ gap: 6 }}>
                  {fPlanter && <OtisAvatar look={fPlanter.otis} size={22} />}
                  {fSeed.bloomedAt
                    ? <span className="small strong">{[fSeed.userId, ...fSeed.partners].map((id) => (id === me.id ? 'You' : firstName(userById(db, id)?.name ?? ''))).join(' and ')} are growing this</span>
                    : <span className="small strong">{fMine ? 'Your seed' : firstName(fPlanter?.name ?? 'Someone')}, {STAGE_NAMES[fStage].toLowerCase()}, watered {fCount}x</span>}
                </span>
              </div>
            </div>
          )}

          <Fence />
        </div>

        {/* HUD */}
        <div className="gw-hud-top">
          <span className="pill gw-pill">{seeds.length} {seeds.length === 1 ? 'seed' : 'seeds'}, {blooms} in bloom{thirsty ? `, ${thirsty} thirsty` : ''}</span>
        </div>
        <svg className="gw-mini" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the garden" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => {
          e.stopPropagation();
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          walkTo({ x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
        }}>
          <rect width={W} height={H} rx="60" fill={C.lawn} />
          <rect width={W} height="210" fill={C.forest} />
          <ellipse cx={POND.x} cy={POND.y} rx={POND.rx} ry={POND.ry} fill={C.sky} />
          <circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r} fill="#EFE3BE" />
          {seeds.map((s) => { const p = spots.get(s.id)!; return <circle key={s.id} cx={p.x} cy={p.y} r={s.bloomedAt ? 44 : 32} fill={C[SEED_INTENT[s.intent].color]} stroke={C.pine} strokeWidth="12" />; })}
          <rect ref={miniView} fill="none" stroke={C.cream} strokeWidth="18" rx="20" />
          <circle ref={miniMe} r="40" fill={C.tomato} stroke={C.cream} strokeWidth="14" />
        </svg>
        {hint && (
          <div className="gw-hint" role="note" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span><b>{wide ? 'Walk with the arrow keys or WASD,' : 'Tap anywhere to walk there,'}</b> or {wide ? 'click' : 'tap'} a plant to go to it. Get close to a seed to water it.</span>
            <button className="link-btn small" onClick={() => setHint(false)}>Got it</button>
          </div>
        )}
        <div className="gw-hud-bottom" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <button className="btn sun" onClick={() => { setHint(false); onPlantHere(); }}>
            <Icon name="plant" size={26} /> Plant here{wide && <kbd>P</kbd>}
          </button>
          {fSeed && (
            <button className={`btn ${fMine || fSeed.bloomedAt ? 'cream' : 'sky'}`} onClick={() => onOpenSeed(fSeed.id)}>
              {!fMine && !fSeed.bloomedAt && <Drop size={15} />} {actionLabel}{wide && <kbd>E</kbd>}
            </button>
          )}
          {!fSeed && thirsty > 0 && (
            <button className="btn cream" onClick={() => {
              const t = seeds.filter((s) => !s.bloomedAt && !(counts.get(s.id) ?? 0) && s.userId !== me.id)
                .map((s) => ({ s, d: dist(player.current, spots.get(s.id)!) })).sort((a, b) => a.d - b.d)[0];
              if (t) { walkTo(standBy(t.s.id)); toast({ text: `Heading to ${firstName(userById(db, t.s.userId)?.name ?? 'a')}'s seed`, tone: 'info' }); }
            }}>
              <Drop size={14} /> {wide ? 'Find a thirsty seed' : 'Thirsty seeds'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
});
