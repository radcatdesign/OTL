import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { OtisLook } from '../brand/otis/Otis';
import type { ColorKey } from '../brand/palette';
import { buildDemoDB, DEMO_REPLIES, lawnSpot } from './demoData';
import { levelFor, statsFor, xpFor } from './game';
import type { GuideIntent, Role, SeedIntent } from './intents';
import type { Activity, Contribution, DB, Id, LawnEvent, Membership, Seed, User } from './types';

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (n: number) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const GATE_WORDS = ['LAWN', 'SEED', 'BLOOM', 'FERN', 'MOSS', 'SPROUT', 'CLOVER', 'PINE', 'TULIP', 'ACORN', 'MEADOW', 'PETAL'];

// Storage that never throws (private windows, blocked storage, sandboxed previews).
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return memory.get(k) ?? null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { memory.set(k, v); } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { memory.delete(k); } },
};

export interface Toast { id: string; text: string; xp?: number; tone?: 'good' | 'info' | 'error' }
export interface Celebration { kind: 'level' | 'bloom' | 'unlock' | 'welcome'; title: string; body?: string; seedId?: Id }

interface NewEventInput {
  title: string; about: string; startsAt: number; endsAt: number; venue: string; address: string;
  color: ColorKey; visibility: 'public' | 'invite'; capacity?: number; contribution: Contribution;
}

interface State {
  db: DB;
  me: Id | null;
  demo: boolean;
  toasts: Toast[];
  celebration: Celebration | null;
  // auth
  signUp: (p: { name: string; email: string; role: Role; intents: GuideIntent[]; otis: OtisLook; bio?: string }) => User;
  signIn: (email: string) => boolean;
  signOut: () => void;
  updateMe: (patch: Partial<Pick<User, 'name' | 'bio' | 'link' | 'role' | 'intents' | 'otis'>>) => void;
  // lawns
  createEvent: (p: NewEventInput) => LawnEvent;
  rsvp: (eventId: Id, invitedBy?: Id) => void;
  leave: (eventId: Id) => void;
  checkIn: (eventId: Id, gate: string) => boolean;
  invitePeople: (eventId: Id, userIds: Id[]) => void;
  inviteEmails: (eventId: Id, emails: string[]) => number;
  // garden
  plantSeed: (eventId: Id, p: { intent: SeedIntent; title: string; details: string; link?: string }) => Seed;
  waterSeed: (seedId: Id, message: string, as?: Id) => void;
  bloomSeed: (seedId: Id, partnerIds: Id[]) => void;
  // ui
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  celebrate: (c: Celebration | null) => void;
  resetDemo: () => void;
}

const xpOf = (db: DB, id: Id | null) => (id ? xpFor(statsFor(db, id)) : 0);

export const useStore = create<State>()(
  persist(
    (set, get) => {
      // Run a change to the db, then report XP gained and any level-up.
      const progress = (label: string, mutate: (db: DB) => DB, opts: { quiet?: boolean } = {}) => {
        const { me, db } = get();
        const before = xpOf(db, me);
        const next = mutate(db);
        set({ db: next });
        const after = xpOf(next, me);
        const gained = after - before;
        if (!opts.quiet) get().toast({ text: label, xp: gained > 0 ? gained : undefined, tone: 'good' });
        const l0 = levelFor(before), l1 = levelFor(after);
        if (l1.index > l0.index) {
          setTimeout(() => get().celebrate({ kind: 'level', title: `Level ${l1.number}: ${l1.name}`, body: 'New things to try in the Otis studio.' }), 700);
        }
      };

      const log = (db: DB, a: Omit<Activity, 'id' | 'createdAt'>): DB => ({
        ...db, activity: [...db.activity, { id: uid('a'), createdAt: Date.now(), ...a }],
      });

      const nextSpot = (db: DB, eventId: Id) => {
        const n = db.memberships.filter((m) => m.eventId === eventId).length;
        return lawnSpot(n, Math.max(n + 1, 8));
      };

      return {
        db: buildDemoDB(),
        me: null,
        demo: true,
        toasts: [],
        celebration: null,

        signUp: (p) => {
          const user: User = {
            id: uid('u'), name: p.name.trim(), email: p.email.trim().toLowerCase(), role: p.role,
            bio: p.bio ?? '', intents: p.intents, otis: p.otis, createdAt: Date.now(),
          };
          set((s) => ({ db: { ...s.db, users: [...s.db.users, user] }, me: user.id }));
          return user;
        },
        signIn: (email) => {
          const e = email.trim().toLowerCase();
          const user = get().db.users.find((x) => x.email === e && !x.demo);
          if (!user) return false;
          set({ me: user.id });
          return true;
        },
        signOut: () => set({ me: null }),
        updateMe: (patch) => {
          const { me } = get();
          if (!me) return;
          set((s) => ({ db: { ...s.db, users: s.db.users.map((x) => (x.id === me ? { ...x, ...patch } : x)) } }));
        },

        createEvent: (p) => {
          const me = get().me!;
          const ev: LawnEvent = {
            id: uid('e'), code: code(6), gate: GATE_WORDS[Math.floor(Math.random() * GATE_WORDS.length)],
            hostId: me, createdAt: Date.now(), ...p,
          };
          progress(p.contribution.mode === 'donate' && p.contribution.amount > 0 ? 'Lawn created. Thanks for chipping in.' : 'Lawn created', (db) => {
            const m: Membership = { id: uid('m'), eventId: ev.id, userId: me, status: 'here', spot: lawnSpot(0, 8), createdAt: Date.now(), checkedInAt: Date.now() };
            return log({ ...db, events: [...db.events, ev], memberships: [...db.memberships, m] }, { eventId: ev.id, userId: me, kind: 'hosted' });
          });
          return ev;
        },

        rsvp: (eventId, invitedBy) => {
          const me = get().me;
          if (!me) return;
          progress("You're on the list", (db) => {
            const existing = db.memberships.find((m) => m.eventId === eventId && m.userId === me);
            if (existing) {
              if (existing.status !== 'invited') return db;
              return log({ ...db, memberships: db.memberships.map((m) => (m.id === existing.id ? { ...m, status: 'going', createdAt: Date.now() } : m)) }, { eventId, userId: me, kind: 'joined' });
            }
            const m: Membership = { id: uid('m'), eventId, userId: me, status: 'going', invitedBy, spot: nextSpot(db, eventId), createdAt: Date.now() };
            return log({ ...db, memberships: [...db.memberships, m] }, { eventId, userId: me, kind: 'joined' });
          });
        },

        leave: (eventId) => {
          const me = get().me;
          set((s) => ({ db: { ...s.db, memberships: s.db.memberships.filter((m) => !(m.eventId === eventId && m.userId === me)) } }));
          get().toast({ text: 'You left the lawn', tone: 'info' });
        },

        checkIn: (eventId, gate) => {
          const { me, db } = get();
          const ev = db.events.find((e) => e.id === eventId);
          if (!me || !ev) return false;
          if (gate.trim().toUpperCase() !== ev.gate.toUpperCase()) return false;
          progress('Checked in. The garden is open.', (d) => {
            const existing = d.memberships.find((m) => m.eventId === eventId && m.userId === me);
            const memberships = existing
              ? d.memberships.map((m) => (m.id === existing.id ? { ...m, status: 'here' as const, checkedInAt: Date.now() } : m))
              : [...d.memberships, { id: uid('m'), eventId, userId: me, status: 'here' as const, spot: nextSpot(d, eventId), createdAt: Date.now(), checkedInAt: Date.now() }];
            return log({ ...d, memberships }, { eventId, userId: me, kind: 'checked_in' });
          });
          return true;
        },

        invitePeople: (eventId, userIds) => {
          const me = get().me!;
          set((s) => {
            const have = new Set(s.db.memberships.filter((m) => m.eventId === eventId).map((m) => m.userId));
            const fresh = userIds.filter((id) => !have.has(id));
            const base = s.db.memberships.filter((m) => m.eventId === eventId).length;
            const added: Membership[] = fresh.map((userId, i) => ({
              id: uid('m'), eventId, userId, status: 'invited', invitedBy: me, spot: lawnSpot(base + i, Math.max(base + fresh.length, 8)), createdAt: Date.now(),
            }));
            return { db: { ...s.db, memberships: [...s.db.memberships, ...added] } };
          });
          get().toast({ text: userIds.length === 1 ? 'Invite sent' : `${userIds.length} invites sent`, tone: 'good' });
        },

        inviteEmails: (eventId, emails) => {
          const me = get().me!;
          const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => /.+@.+\..+/.test(e)))];
          set((s) => ({
            db: { ...s.db, emailInvites: [...s.db.emailInvites, ...clean.map((email) => ({ id: uid('i'), eventId, email, invitedBy: me, createdAt: Date.now() }))] },
          }));
          return clean.length;
        },

        plantSeed: (eventId, p) => {
          const me = get().me!;
          const seed: Seed = { id: uid('s'), eventId, userId: me, intent: p.intent, title: p.title.trim(), details: p.details.trim(), link: p.link?.trim() || undefined, createdAt: Date.now(), partners: [] };
          progress('Seed planted', (db) => log({ ...db, seeds: [...db.seeds, seed] }, { eventId, userId: me, kind: 'planted', seedId: seed.id }));
          if (get().demo) {
            // Demo mode: a neighbor from this lawn waters the new seed so the loop is visible.
            setTimeout(() => {
              const { db } = get();
              const neighbors = db.memberships.filter((m) => m.eventId === eventId && m.status === 'here' && m.userId !== me)
                .map((m) => db.users.find((x) => x.id === m.userId)).filter((x): x is User => !!x && !!x.demo);
              if (!neighbors.length || !db.seeds.find((s) => s.id === seed.id)) return;
              const who = neighbors[Math.floor(Math.random() * neighbors.length)];
              const lines = DEMO_REPLIES[seed.intent];
              get().waterSeed(seed.id, lines[Math.floor(Math.random() * lines.length)], who.id);
            }, 4500);
          }
          return seed;
        },

        waterSeed: (seedId, message, as) => {
          const { me, db } = get();
          const actor = as ?? me;
          const seed = db.seeds.find((s) => s.id === seedId);
          if (!actor || !seed) return;
          const w = { id: uid('w'), seedId, userId: actor, message: message.trim(), createdAt: Date.now() };
          if (as && as !== me) {
            const who = db.users.find((x) => x.id === as);
            set((s) => ({ db: log({ ...s.db, waterings: [...s.db.waterings, w] }, { eventId: seed.eventId, userId: actor, kind: 'watered', seedId, otherUserId: seed.userId }) }));
            get().toast({ text: `${who?.name.split(' ')[0] ?? 'Someone'} watered your seed`, tone: 'info' });
            return;
          }
          progress('Watered', (d) => log({ ...d, waterings: [...d.waterings, w] }, { eventId: seed.eventId, userId: actor, kind: 'watered', seedId, otherUserId: seed.userId }));
        },

        bloomSeed: (seedId, partnerIds) => {
          const { me, db } = get();
          const seed = db.seeds.find((s) => s.id === seedId);
          if (!me || !seed || seed.userId !== me || !partnerIds.length) return;
          progress('In bloom', (d) => log({
            ...d,
            seeds: d.seeds.map((s) => (s.id === seedId ? { ...s, bloomedAt: Date.now(), partners: partnerIds } : s)),
          }, { eventId: seed.eventId, userId: me, kind: 'bloomed', seedId, otherUserId: partnerIds[0] }), { quiet: true });
          const names = partnerIds.map((id) => db.users.find((x) => x.id === id)?.name.split(' ')[0]).filter(Boolean).join(' and ');
          get().celebrate({ kind: 'bloom', title: 'It bloomed', body: `You and ${names} are growing this together. Everyone in the garden can see it.`, seedId });
        },

        toast: (t) => {
          const id = uid('t');
          set((s) => ({ toasts: [...s.toasts.slice(-2), { id, ...t }] }));
          setTimeout(() => get().dismissToast(id), 3200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        celebrate: (c) => set({ celebration: c }),
        resetDemo: () => set({ db: buildDemoDB(), me: null, toasts: [], celebration: null }),
      };
    },
    {
      name: 'otl-lawn-v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ db: s.db, me: s.me, demo: s.demo }),
    },
  ),
);

// Selectors
export const useMe = () => useStore((s) => (s.me ? s.db.users.find((u) => u.id === s.me) ?? null : null));
export const userById = (db: DB, id: Id) => db.users.find((u) => u.id === id);
export const membershipOf = (db: DB, eventId: Id, userId: Id | null) =>
  userId ? db.memberships.find((m) => m.eventId === eventId && m.userId === userId) : undefined;
export const canEnterGarden = (db: DB, ev: LawnEvent, userId: Id | null) =>
  !!userId && (ev.hostId === userId || membershipOf(db, ev.id, userId)?.status === 'here');
