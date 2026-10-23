import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { OtisLook } from '../brand/otis/Otis';
import type { ColorKey } from '../brand/palette';
import { buildDemoDB, DEMO_CHAT_REPLIES, DEMO_REPLIES, lawnSpot } from './demoData';
import { audienceFor, campaignStats, newBlocks, validEmail } from './email';
import { levelFor, statsFor, xpFor } from './game';
import type { GuideIntent, Role, SeedIntent } from './intents';
import { ABILITIES, canActOn, canIn, isBanned, isStaffRole, roleIn, type Ability } from './perms';
import type {
  Activity, Campaign, Contact, ContactList, Contribution, Cover, DB, Group, GroupRole, Id, LawnEvent,
  Membership, Seed, User,
} from './types';

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (n: number) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const GATE_WORDS = ['LAWN', 'SEED', 'BLOOM', 'FERN', 'MOSS', 'SPROUT', 'CLOVER', 'PINE', 'TULIP', 'ACORN', 'MEADOW', 'PETAL'];

// Storage that never throws (private windows, blocked storage, sandboxed previews, full quota).
const memory = new Map<string, string>();
let warnedFull = false;
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; } },
  setItem: (k, v) => {
    try { localStorage.setItem(k, v); memory.delete(k); } catch {
      memory.set(k, v);
      if (!warnedFull) {
        warnedFull = true;
        setTimeout(() => useStore.getState().toast({ text: 'This browser is out of demo storage. Changes last until you close the tab.', tone: 'info' }), 0);
      }
    }
  },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* noop */ } memory.delete(k); },
};

export interface Toast { id: string; text: string; xp?: number; tone?: 'good' | 'info' | 'error' }
export interface Celebration { kind: 'level' | 'bloom' | 'unlock' | 'welcome' | 'ban'; title: string; body?: string; seedId?: Id }

export interface EventInput {
  groupId: Id;
  title: string;
  about: string;
  startsAt: number;
  endsAt: number;
  venue: string;
  address: string;
  geo?: { lat: number; lng: number };
  cover: Cover;
  color: ColorKey;
  cohostIds: Id[];
  visibility: 'public' | 'invite';
  capacity?: number;
  chat: boolean;
  photos: boolean;
  contribution: Contribution;
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
  // groups
  createGroup: (p: { name: string; tagline: string; about: string; color: ColorKey }) => Group;
  updateGroup: (groupId: Id, patch: Partial<Pick<Group, 'name' | 'tagline' | 'about' | 'color' | 'replyTo'>>) => void;
  joinGroup: (groupId: Id) => boolean;
  leaveGroup: (groupId: Id) => void;
  setRole: (groupId: Id, userId: Id, role: GroupRole) => void;
  removeMember: (groupId: Id, userId: Id) => void;
  banMember: (groupId: Id, userId: Id, reason: string) => boolean;
  unban: (banId: Id) => void;
  inviteToGroup: (groupId: Id, emails: string[], role: GroupRole) => number;
  revokeInvite: (inviteId: Id) => void;
  resendInvite: (inviteId: Id) => void;
  demoSetMyRole: (groupId: Id, role: GroupRole) => void;
  // lawns
  createEvent: (p: EventInput) => LawnEvent | null;
  updateEvent: (eventId: Id, patch: Partial<EventInput>) => void;
  deleteEvent: (eventId: Id) => void;
  rsvp: (eventId: Id, invitedBy?: Id) => void;
  leave: (eventId: Id) => void;
  checkIn: (eventId: Id, gate: string) => boolean;
  invitePeople: (eventId: Id, userIds: Id[]) => void;
  inviteEmails: (eventId: Id, emails: string[]) => number;
  // chat and photos
  postMessage: (eventId: Id, text: string, replyTo?: Id) => boolean;
  hideMessage: (messageId: Id) => void;
  unhideMessage: (messageId: Id) => void;
  addPhoto: (eventId: Id, src: string, caption: string) => boolean;
  deletePhoto: (photoId: Id) => void;
  toggleLike: (photoId: Id) => void;
  // garden
  plantSeed: (eventId: Id, p: { intent: SeedIntent; title: string; details: string; link?: string; spot?: { x: number; y: number } }) => Seed;
  waterSeed: (seedId: Id, message: string, as?: Id) => void;
  bloomSeed: (seedId: Id, partnerIds: Id[]) => void;
  // email list
  createList: (groupId: Id, name: string, color: ColorKey) => ContactList | null;
  renameList: (listId: Id, name: string) => void;
  deleteList: (listId: Id) => void;
  addContact: (groupId: Id, p: { email: string; name: string; listIds: Id[] }) => 'added' | 'exists' | 'invalid' | 'banned' | 'denied';
  importContacts: (groupId: Id, rows: { email: string; name: string }[], listId?: Id) => { added: number; updated: number; skipped: number };
  setContactStatus: (ids: Id[], status: Contact['status']) => void;
  addToList: (ids: Id[], listId: Id) => void;
  removeFromList: (ids: Id[], listId: Id) => void;
  deleteContacts: (ids: Id[]) => void;
  // campaigns
  createCampaign: (groupId: Id, eventId?: Id) => Campaign | null;
  updateCampaign: (id: Id, patch: Partial<Omit<Campaign, 'id' | 'groupId'>>) => void;
  deleteCampaign: (id: Id) => void;
  duplicateCampaign: (id: Id) => Campaign | null;
  scheduleCampaign: (id: Id, at: number) => void;
  unscheduleCampaign: (id: Id) => void;
  sendCampaignNow: (id: Id) => void;
  processScheduled: () => void;
  // ui
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  celebrate: (c: Celebration | null) => void;
  resetDemo: () => void;
}

const xpOf = (db: DB, id: Id | null) => (id ? xpFor(statsFor(db, id)) : 0);

const ROLE_WORDS: Record<string, string> = {
  host: 'hosts', cohost: 'hosts and co-hosts', moderator: 'hosts, co-hosts, and moderators',
};

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
      const patchDb = (fn: (db: DB) => Partial<DB>) => set((s) => ({ db: { ...s.db, ...fn(s.db) } }));

      const log = (db: DB, a: Omit<Activity, 'id' | 'createdAt'>): DB => ({
        ...db, activity: [...db.activity, { id: uid('a'), createdAt: Date.now(), ...a }],
      });

      const nextSpot = (db: DB, eventId: Id) => {
        const n = db.memberships.filter((m) => m.eventId === eventId).length;
        return lawnSpot(n, Math.max(n + 1, 8));
      };

      // Permission check that explains itself.
      const allowed = (groupId: Id, ability: Ability) => {
        const { db, me } = get();
        if (canIn(db, groupId, me, ability)) return true;
        const who = ABILITIES[ability].roles.length === 2 ? ROLE_WORDS.cohost : ROLE_WORDS.moderator;
        get().toast({ text: `Only ${who} can ${ABILITIES[ability].label.toLowerCase()}.`, tone: 'error' });
        return false;
      };

      // Keep the email list in step with membership.
      const upsertContact = (db: DB, groupId: Id, user: User, source: Contact['source']): Contact[] => {
        const existing = db.contacts.find((c) => c.groupId === groupId && c.email === user.email);
        if (existing) return db.contacts.map((c) => (c.id === existing.id ? { ...c, userId: user.id, name: c.name || user.name } : c));
        return [...db.contacts, { id: uid('ct'), groupId, email: user.email, name: user.name, listIds: [], status: 'subscribed', source, userId: user.id, createdAt: Date.now() }];
      };

      const ensureMember = (db: DB, groupId: Id, userId: Id, role: GroupRole = 'member', source: Contact['source'] = 'member'): DB => {
        if (db.groupMembers.some((m) => m.groupId === groupId && m.userId === userId)) return db;
        const user = db.users.find((x) => x.id === userId);
        if (!user) return db;
        return {
          ...db,
          groupMembers: [...db.groupMembers, { id: uid('gm'), groupId, userId, role, joinedAt: Date.now() }],
          contacts: upsertContact(db, groupId, user, source),
        };
      };

      const eventGroup = (eventId: Id) => get().db.events.find((e) => e.id === eventId)?.groupId;

      return {
        db: buildDemoDB(),
        me: null,
        demo: true,
        toasts: [],
        celebration: null,

        // ---------- auth ----------
        signUp: (p) => {
          const user: User = {
            id: uid('u'), name: p.name.trim(), email: p.email.trim().toLowerCase(), role: p.role,
            bio: p.bio ?? '', intents: p.intents, otis: p.otis, createdAt: Date.now(),
          };
          set((s) => {
            let db: DB = { ...s.db, users: [...s.db.users, user] };
            // Pending group invites for this email turn into memberships.
            const invites = db.groupInvites.filter((i) => i.email === user.email && i.status === 'pending');
            invites.forEach((i) => { db = ensureMember(db, i.groupId, user.id, i.role); });
            db = { ...db, groupInvites: db.groupInvites.map((i) => (invites.includes(i) ? { ...i, status: 'accepted' as const } : i)) };
            // Demo: you help run On The Lawn so every admin tool is open to try.
            if (s.demo) db = ensureMember(db, 'otl', user.id, 'cohost');
            return { db, me: user.id };
          });
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
          patchDb((db) => ({ users: db.users.map((x) => (x.id === me ? { ...x, ...patch } : x)) }));
        },

        // ---------- groups ----------
        createGroup: (p) => {
          const me = get().me!;
          const base = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
          let slug = base;
          let n = 2;
          while (get().db.groups.some((g) => g.slug === slug)) slug = `${base}-${n++}`;
          const user = get().db.users.find((x) => x.id === me)!;
          const g: Group = { id: uid('g'), slug, name: p.name.trim(), tagline: p.tagline.trim(), about: p.about.trim(), color: p.color, city: 'Bend, OR', createdAt: Date.now(), replyTo: user.email };
          set((s) => ({ db: ensureMember({ ...s.db, groups: [...s.db.groups, g] }, g.id, me, 'host') }));
          get().toast({ text: `${g.name} is up. You're the host.`, tone: 'good' });
          return g;
        },
        updateGroup: (groupId, patch) => {
          if (!allowed(groupId, 'editGroup')) return;
          patchDb((db) => ({ groups: db.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)) }));
          get().toast({ text: 'Group saved', tone: 'good' });
        },
        joinGroup: (groupId) => {
          const { me, db } = get();
          if (!me) return false;
          if (isBanned(db, groupId, me)) {
            get().toast({ text: "You can't join this group.", tone: 'error' });
            return false;
          }
          set((s) => ({ db: ensureMember(s.db, groupId, me) }));
          get().toast({ text: 'Joined the group', tone: 'good' });
          return true;
        },
        leaveGroup: (groupId) => {
          const { me, db } = get();
          if (roleIn(db, groupId, me) === 'host') {
            get().toast({ text: 'Hosts can’t leave their own group. Make someone else host first.', tone: 'error' });
            return;
          }
          patchDb((d) => ({ groupMembers: d.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === me)) }));
          get().toast({ text: 'You left the group', tone: 'info' });
        },
        setRole: (groupId, userId, role) => {
          if (!allowed(groupId, 'manageRoles')) return;
          const { db, me } = get();
          const current = roleIn(db, groupId, userId);
          if (current === 'host' && userId !== me) return get().toast({ text: "The host's role can't be changed here.", tone: 'error' });
          if (role === 'host' && roleIn(db, groupId, me) !== 'host') return get().toast({ text: 'Only the host can hand over hosting.', tone: 'error' });
          if (userId !== me && current !== 'host' && !canActOn(roleIn(db, groupId, me), current)) return get().toast({ text: "Only the host can change another co-host's role.", tone: 'error' });
          patchDb((d) => ({
            groupMembers: d.groupMembers.map((m) => {
              if (m.groupId !== groupId) return m;
              if (m.userId === userId) return { ...m, role };
              if (role === 'host' && m.userId === me) return { ...m, role: 'cohost' as const }; // handing over
              return m;
            }),
          }));
          const name = db.users.find((x) => x.id === userId)?.name.split(' ')[0];
          get().toast({ text: `${name} is now ${role === 'cohost' ? 'a co-host' : role === 'moderator' ? 'a moderator' : role === 'host' ? 'the host' : 'a member'}`, tone: 'good' });
        },
        removeMember: (groupId, userId) => {
          if (!allowed(groupId, 'removeMembers')) return;
          const { db, me } = get();
          if (roleIn(db, groupId, userId) === 'host') return get().toast({ text: "The host can't be removed.", tone: 'error' });
          if (userId === me) return get().toast({ text: 'Use "Leave group" to remove yourself.', tone: 'error' });
          if (!canActOn(roleIn(db, groupId, me), roleIn(db, groupId, userId))) return get().toast({ text: 'Only the host can remove a co-host.', tone: 'error' });
          patchDb((d) => ({ groupMembers: d.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === userId)) }));
          get().toast({ text: 'Removed from the group', tone: 'info' });
        },
        banMember: (groupId, userId, reason) => {
          if (!allowed(groupId, 'banMembers')) return false;
          const { db, me } = get();
          const target = db.users.find((x) => x.id === userId);
          if (!target) return false;
          if (roleIn(db, groupId, userId) === 'host') { get().toast({ text: "The host can't be banned.", tone: 'error' }); return false; }
          if (userId === me) { get().toast({ text: "You can't ban yourself.", tone: 'error' }); return false; }
          if (!canActOn(roleIn(db, groupId, me), roleIn(db, groupId, userId))) { get().toast({ text: 'Only the host can ban a co-host.', tone: 'error' }); return false; }
          const groupEvents = new Set(db.events.filter((e) => e.groupId === groupId).map((e) => e.id));
          const now = Date.now();
          patchDb((d) => ({
            groupMembers: d.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === userId)),
            groupBans: [...d.groupBans, { id: uid('gb'), groupId, userId, email: target.email, name: target.name, reason: reason.trim() || 'No reason given', bannedBy: me!, createdAt: now }],
            // Off upcoming lawns, chat hidden, and no more email.
            memberships: d.memberships.filter((m) => !(m.userId === userId && groupEvents.has(m.eventId) && d.events.find((e) => e.id === m.eventId)!.endsAt > now)),
            messages: d.messages.map((m) => (m.userId === userId && groupEvents.has(m.eventId) && !m.hiddenBy ? { ...m, hiddenBy: me! } : m)),
            contacts: d.contacts.map((c) => (c.groupId === groupId && c.email === target.email ? { ...c, status: 'unsubscribed' as const } : c)),
          }));
          return true;
        },
        unban: (banId) => {
          const ban = get().db.groupBans.find((b) => b.id === banId);
          if (!ban || !allowed(ban.groupId, 'banMembers')) return;
          patchDb((d) => ({ groupBans: d.groupBans.filter((b) => b.id !== banId) }));
          get().toast({ text: `${ban.name} can join again`, tone: 'info' });
        },
        inviteToGroup: (groupId, emails, role) => {
          if (!allowed(groupId, 'inviteMembers')) return 0;
          const { db, me } = get();
          const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(validEmail))]
            .filter((e) => !isBanned(db, groupId, null, e))
            .filter((e) => !db.groupMembers.some((m) => m.groupId === groupId && db.users.find((x) => x.id === m.userId)?.email === e))
            .filter((e) => !db.groupInvites.some((i) => i.groupId === groupId && i.email === e && i.status === 'pending'));
          if (role === 'host') role = 'cohost';
          patchDb((d) => ({
            groupInvites: [...d.groupInvites, ...clean.map((email) => ({ id: uid('gi'), groupId, email, role, invitedBy: me!, createdAt: Date.now(), status: 'pending' as const, sentCount: 1 }))],
          }));
          return clean.length;
        },
        revokeInvite: (inviteId) => {
          const inv = get().db.groupInvites.find((i) => i.id === inviteId);
          if (!inv || !allowed(inv.groupId, 'inviteMembers')) return;
          patchDb((d) => ({ groupInvites: d.groupInvites.map((i) => (i.id === inviteId ? { ...i, status: 'revoked' as const } : i)) }));
          get().toast({ text: 'Invite revoked', tone: 'info' });
        },
        resendInvite: (inviteId) => {
          const inv = get().db.groupInvites.find((i) => i.id === inviteId);
          if (!inv || !allowed(inv.groupId, 'inviteMembers')) return;
          patchDb((d) => ({ groupInvites: d.groupInvites.map((i) => (i.id === inviteId ? { ...i, sentCount: i.sentCount + 1, createdAt: Date.now() } : i)) }));
          get().toast({ text: `Invite sent again to ${inv.email}`, tone: 'good' });
        },
        demoSetMyRole: (groupId, role) => {
          const { me, demo } = get();
          if (!demo || !me) return;
          set((s) => {
            const db = ensureMember(s.db, groupId, me, role);
            return { db: { ...db, groupMembers: db.groupMembers.map((m) => (m.groupId === groupId && m.userId === me ? { ...m, role } : m)) } };
          });
        },

        // ---------- lawns ----------
        createEvent: (p) => {
          if (!allowed(p.groupId, 'createEvents')) return null;
          const me = get().me!;
          const ev: LawnEvent = {
            id: uid('e'), code: code(6), gate: GATE_WORDS[Math.floor(Math.random() * GATE_WORDS.length)],
            hostId: me, createdAt: Date.now(), ...p,
          };
          progress(p.contribution.mode === 'donate' && p.contribution.amount > 0 ? 'Lawn created. Thanks for chipping in.' : 'Lawn created', (db) => {
            const m: Membership = { id: uid('m'), eventId: ev.id, userId: me, status: 'going', spot: lawnSpot(0, 8), createdAt: Date.now() };
            return log({ ...db, events: [...db.events, ev], memberships: [...db.memberships, m] }, { eventId: ev.id, userId: me, kind: 'hosted' });
          });
          return ev;
        },
        updateEvent: (eventId, patch) => {
          const ev = get().db.events.find((e) => e.id === eventId);
          if (!ev || !allowed(ev.groupId, 'createEvents')) return;
          if (patch.groupId && patch.groupId !== ev.groupId && !allowed(patch.groupId, 'createEvents')) return;
          patchDb((db) => ({ events: db.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)) }));
          get().toast({ text: 'Lawn saved', tone: 'good' });
        },
        deleteEvent: (eventId) => {
          const ev = get().db.events.find((e) => e.id === eventId);
          if (!ev || !allowed(ev.groupId, 'createEvents')) return;
          patchDb((db) => ({
            events: db.events.filter((e) => e.id !== eventId),
            memberships: db.memberships.filter((m) => m.eventId !== eventId),
            messages: db.messages.filter((m) => m.eventId !== eventId),
            photos: db.photos.filter((m) => m.eventId !== eventId),
          }));
          get().toast({ text: `${ev.title} was deleted`, tone: 'info' });
        },

        rsvp: (eventId, invitedBy) => {
          const { me, db } = get();
          const ev = db.events.find((e) => e.id === eventId);
          if (!me || !ev) return;
          if (isBanned(db, ev.groupId, me)) return get().toast({ text: "You can't join this group's lawns.", tone: 'error' });
          progress("You're on the list", (d0) => {
            const d = ensureMember(d0, ev.groupId, me, 'member', 'rsvp');
            const existing = d.memberships.find((m) => m.eventId === eventId && m.userId === me);
            if (existing) {
              if (existing.status !== 'invited') return d;
              return log({ ...d, memberships: d.memberships.map((m) => (m.id === existing.id ? { ...m, status: 'going', createdAt: Date.now() } : m)) }, { eventId, userId: me, kind: 'joined' });
            }
            const m: Membership = { id: uid('m'), eventId, userId: me, status: 'going', invitedBy, spot: nextSpot(d, eventId), createdAt: Date.now() };
            return log({ ...d, memberships: [...d.memberships, m] }, { eventId, userId: me, kind: 'joined' });
          });
        },

        leave: (eventId) => {
          const me = get().me;
          patchDb((db) => ({ memberships: db.memberships.filter((m) => !(m.eventId === eventId && m.userId === me)) }));
          get().toast({ text: 'You left the lawn', tone: 'info' });
        },

        checkIn: (eventId, gate) => {
          const { me, db } = get();
          const ev = db.events.find((e) => e.id === eventId);
          if (!me || !ev) return false;
          if (isBanned(db, ev.groupId, me)) { get().toast({ text: "You can't join this group's lawns.", tone: 'error' }); return false; }
          if (gate.trim().toUpperCase() !== ev.gate.toUpperCase()) return false;
          progress('Checked in. The garden is open.', (d0) => {
            const d = ensureMember(d0, ev.groupId, me, 'member', 'rsvp');
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
          const gid = eventGroup(eventId);
          set((s) => {
            const have = new Set(s.db.memberships.filter((m) => m.eventId === eventId).map((m) => m.userId));
            const fresh = userIds.filter((id) => !have.has(id) && !(gid && isBanned(s.db, gid, id)));
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
          const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(validEmail))];
          patchDb((db) => ({ emailInvites: [...db.emailInvites, ...clean.map((email) => ({ id: uid('i'), eventId, email, invitedBy: me, createdAt: Date.now() }))] }));
          return clean.length;
        },

        // ---------- chat and photos ----------
        postMessage: (eventId, text, replyTo) => {
          const { me, db, demo } = get();
          const ev = db.events.find((e) => e.id === eventId);
          if (!me || !ev || !text.trim()) return false;
          if (!ev.chat) { get().toast({ text: 'Chat is off for this lawn.', tone: 'error' }); return false; }
          if (isBanned(db, ev.groupId, me)) { get().toast({ text: "You can't post in this group.", tone: 'error' }); return false; }
          const role = roleIn(db, ev.groupId, me);
          const onList = db.memberships.some((m) => m.eventId === eventId && m.userId === me && m.status !== 'invited');
          if (!onList && !isStaffRole(role)) { get().toast({ text: "RSVP to join the chat.", tone: 'error' }); return false; }
          const msg = { id: uid('c'), eventId, userId: me, text: text.trim().slice(0, 600), replyTo, createdAt: Date.now() };
          patchDb((d) => ({ messages: [...d.messages, msg] }));
          // Demo: a staff member answers questions so the loop is visible.
          if (demo && text.trim().endsWith('?') && !isStaffRole(role)) {
            setTimeout(() => {
              const d = get().db;
              const staff = d.groupMembers.filter((m) => m.groupId === ev.groupId && isStaffRole(m.role) && m.userId !== me && d.users.find((x) => x.id === m.userId)?.demo);
              if (!staff.length || !d.messages.some((m) => m.id === msg.id)) return;
              const who = staff[Math.floor(Math.random() * staff.length)].userId;
              patchDb((dd) => ({ messages: [...dd.messages, { id: uid('c'), eventId, userId: who, text: DEMO_CHAT_REPLIES[Math.floor(Math.random() * DEMO_CHAT_REPLIES.length)], replyTo: msg.id, createdAt: Date.now() }] }));
            }, 3500);
          }
          return true;
        },
        hideMessage: (messageId) => {
          const { me, db } = get();
          const m = db.messages.find((x) => x.id === messageId);
          if (!m || !me) return;
          if (m.userId !== me) {
            const gid = eventGroup(m.eventId);
            if (!gid || !allowed(gid, 'moderateChat')) return;
          }
          patchDb((d) => ({ messages: d.messages.map((x) => (x.id === messageId ? { ...x, hiddenBy: me } : x)) }));
          get().toast({ text: m.userId === me ? 'Message deleted' : 'Message hidden', tone: 'info' });
        },
        unhideMessage: (messageId) => {
          const m = get().db.messages.find((x) => x.id === messageId);
          const gid = m && eventGroup(m.eventId);
          if (!m || !gid || !allowed(gid, 'moderateChat')) return;
          patchDb((d) => ({ messages: d.messages.map((x) => (x.id === messageId ? { ...x, hiddenBy: undefined } : x)) }));
        },
        addPhoto: (eventId, src, caption) => {
          const { me, db } = get();
          const ev = db.events.find((e) => e.id === eventId);
          if (!me || !ev) return false;
          if (!ev.photos) { get().toast({ text: 'Photos are off for this lawn.', tone: 'error' }); return false; }
          if (isBanned(db, ev.groupId, me)) return false;
          const onList = db.memberships.some((m) => m.eventId === eventId && m.userId === me && m.status !== 'invited');
          if (!onList && !isStaffRole(roleIn(db, ev.groupId, me))) { get().toast({ text: 'RSVP to add photos.', tone: 'error' }); return false; }
          patchDb((d) => ({ photos: [...d.photos, { id: uid('p'), eventId, userId: me, src, caption: caption.trim().slice(0, 140), createdAt: Date.now(), likes: [] }] }));
          return true;
        },
        deletePhoto: (photoId) => {
          const { me, db } = get();
          const p = db.photos.find((x) => x.id === photoId);
          if (!p || !me) return;
          if (p.userId !== me) {
            const gid = eventGroup(p.eventId);
            if (!gid || !allowed(gid, 'moderateChat')) return;
          }
          patchDb((d) => ({ photos: d.photos.filter((x) => x.id !== photoId) }));
          get().toast({ text: 'Photo removed', tone: 'info' });
        },
        toggleLike: (photoId) => {
          const me = get().me;
          if (!me) return;
          patchDb((d) => ({ photos: d.photos.map((p) => (p.id === photoId ? { ...p, likes: p.likes.includes(me) ? p.likes.filter((x) => x !== me) : [...p.likes, me] } : p)) }));
        },

        // ---------- garden ----------
        plantSeed: (eventId, p) => {
          const me = get().me!;
          const seed: Seed = { id: uid('s'), eventId, userId: me, intent: p.intent, title: p.title.trim(), details: p.details.trim(), link: p.link?.trim() || undefined, createdAt: Date.now(), partners: [], spot: p.spot };
          progress('Seed planted', (db) => log({ ...db, seeds: [...db.seeds, seed] }, { eventId, userId: me, kind: 'planted', seedId: seed.id }));
          if (get().demo) {
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

        // ---------- email list ----------
        createList: (groupId, name, color) => {
          if (!allowed(groupId, 'manageEmail')) return null;
          const l: ContactList = { id: uid('l'), groupId, name: name.trim(), color, createdAt: Date.now() };
          patchDb((d) => ({ contactLists: [...d.contactLists, l] }));
          get().toast({ text: `List "${l.name}" created`, tone: 'good' });
          return l;
        },
        renameList: (listId, name) => {
          const l = get().db.contactLists.find((x) => x.id === listId);
          if (!l || !allowed(l.groupId, 'manageEmail') || !name.trim()) return;
          patchDb((d) => ({ contactLists: d.contactLists.map((x) => (x.id === listId ? { ...x, name: name.trim() } : x)) }));
        },
        deleteList: (listId) => {
          const l = get().db.contactLists.find((x) => x.id === listId);
          if (!l || !allowed(l.groupId, 'manageEmail')) return;
          patchDb((d) => ({
            contactLists: d.contactLists.filter((x) => x.id !== listId),
            contacts: d.contacts.map((c) => (c.listIds.includes(listId) ? { ...c, listIds: c.listIds.filter((x) => x !== listId) } : c)),
            campaigns: d.campaigns.map((c) => ({ ...c, audience: { ...c.audience, listIds: c.audience.listIds.filter((x) => x !== listId) } })),
          }));
          get().toast({ text: `List "${l.name}" deleted. Contacts stay on the main list.`, tone: 'info' });
        },
        addContact: (groupId, p) => {
          if (!canIn(get().db, groupId, get().me, 'manageEmail')) return 'denied';
          const email = p.email.trim().toLowerCase();
          if (!validEmail(email)) return 'invalid';
          const { db } = get();
          if (isBanned(db, groupId, null, email)) return 'banned';
          if (db.contacts.some((c) => c.groupId === groupId && c.email === email)) return 'exists';
          patchDb((d) => ({ contacts: [...d.contacts, { id: uid('ct'), groupId, email, name: p.name.trim(), listIds: p.listIds, status: 'subscribed', source: 'manual', createdAt: Date.now() }] }));
          return 'added';
        },
        importContacts: (groupId, rows, listId) => {
          const out = { added: 0, updated: 0, skipped: 0 };
          if (!allowed(groupId, 'manageEmail')) return out;
          const { db } = get();
          const byEmail = new Map(db.contacts.filter((c) => c.groupId === groupId).map((c) => [c.email, c]));
          const fresh: Contact[] = [];
          const touched = new Map<string, Contact>();
          const seen = new Set<string>();
          rows.forEach((r) => {
            const email = r.email.trim().toLowerCase();
            if (!validEmail(email) || seen.has(email) || isBanned(db, groupId, null, email)) { out.skipped++; return; }
            seen.add(email);
            const ex = byEmail.get(email);
            if (ex) {
              const lists = listId && !ex.listIds.includes(listId) ? [...ex.listIds, listId] : ex.listIds;
              touched.set(ex.id, { ...ex, name: ex.name || r.name.trim(), listIds: lists });
              out.updated++;
            } else {
              fresh.push({ id: uid('ct'), groupId, email, name: r.name.trim(), listIds: listId ? [listId] : [], status: 'subscribed', source: 'import', createdAt: Date.now() });
              out.added++;
            }
          });
          patchDb((d) => ({ contacts: [...d.contacts.map((c) => touched.get(c.id) ?? c), ...fresh] }));
          return out;
        },
        setContactStatus: (ids, status) => {
          const first = get().db.contacts.find((c) => c.id === ids[0]);
          if (!first || !allowed(first.groupId, 'manageEmail')) return;
          patchDb((d) => ({ contacts: d.contacts.map((c) => (ids.includes(c.id) ? { ...c, status } : c)) }));
        },
        addToList: (ids, listId) => {
          const first = get().db.contacts.find((c) => c.id === ids[0]);
          if (!first || !allowed(first.groupId, 'manageEmail')) return;
          patchDb((d) => ({ contacts: d.contacts.map((c) => (ids.includes(c.id) && !c.listIds.includes(listId) ? { ...c, listIds: [...c.listIds, listId] } : c)) }));
        },
        removeFromList: (ids, listId) => {
          const first = get().db.contacts.find((c) => c.id === ids[0]);
          if (!first || !allowed(first.groupId, 'manageEmail')) return;
          patchDb((d) => ({ contacts: d.contacts.map((c) => (ids.includes(c.id) ? { ...c, listIds: c.listIds.filter((x) => x !== listId) } : c)) }));
        },
        deleteContacts: (ids) => {
          const first = get().db.contacts.find((c) => c.id === ids[0]);
          if (!first || !allowed(first.groupId, 'manageEmail')) return;
          patchDb((d) => ({ contacts: d.contacts.filter((c) => !ids.includes(c.id)) }));
          get().toast({ text: ids.length === 1 ? 'Contact deleted' : `${ids.length} contacts deleted`, tone: 'info' });
        },

        // ---------- campaigns ----------
        createCampaign: (groupId, eventId) => {
          if (!allowed(groupId, 'sendCampaigns')) return null;
          const { db, me } = get();
          const g = db.groups.find((x) => x.id === groupId)!;
          const c: Campaign = {
            id: uid('cmp'), groupId, name: 'Untitled campaign', subject: '', preheader: '', fromName: g.name, accent: g.color,
            blocks: newBlocks(g, eventId), audience: { all: true, listIds: [] }, status: 'draft',
            createdBy: me!, createdAt: Date.now(), updatedAt: Date.now(),
          };
          patchDb((d) => ({ campaigns: [...d.campaigns, c] }));
          return c;
        },
        updateCampaign: (id, patch) => {
          const c = get().db.campaigns.find((x) => x.id === id);
          if (!c || !canIn(get().db, c.groupId, get().me, 'sendCampaigns')) return;
          patchDb((d) => ({ campaigns: d.campaigns.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)) }));
        },
        deleteCampaign: (id) => {
          const c = get().db.campaigns.find((x) => x.id === id);
          if (!c || !allowed(c.groupId, 'sendCampaigns')) return;
          patchDb((d) => ({ campaigns: d.campaigns.filter((x) => x.id !== id) }));
          get().toast({ text: 'Campaign deleted', tone: 'info' });
        },
        duplicateCampaign: (id) => {
          const c = get().db.campaigns.find((x) => x.id === id);
          if (!c || !allowed(c.groupId, 'sendCampaigns')) return null;
          const copy: Campaign = {
            ...c, id: uid('cmp'), name: `${c.name} (copy)`, status: 'draft', scheduledAt: undefined, sentAt: undefined, stats: undefined,
            blocks: c.blocks.map((b) => ({ ...b, id: uid('b') })), createdBy: get().me!, createdAt: Date.now(), updatedAt: Date.now(),
          };
          patchDb((d) => ({ campaigns: [...d.campaigns, copy] }));
          get().toast({ text: 'Copy made', tone: 'good' });
          return copy;
        },
        scheduleCampaign: (id, at) => {
          const c = get().db.campaigns.find((x) => x.id === id);
          if (!c || !allowed(c.groupId, 'sendCampaigns')) return;
          patchDb((d) => ({ campaigns: d.campaigns.map((x) => (x.id === id ? { ...x, status: 'scheduled', scheduledAt: at, updatedAt: Date.now() } : x)) }));
          get().toast({ text: 'Scheduled', tone: 'good' });
        },
        unscheduleCampaign: (id) => {
          const c = get().db.campaigns.find((x) => x.id === id);
          if (!c || !allowed(c.groupId, 'sendCampaigns')) return;
          patchDb((d) => ({ campaigns: d.campaigns.map((x) => (x.id === id ? { ...x, status: 'draft', scheduledAt: undefined } : x)) }));
          get().toast({ text: 'Moved back to drafts', tone: 'info' });
        },
        sendCampaignNow: (id) => {
          const { db } = get();
          const c = db.campaigns.find((x) => x.id === id);
          if (!c || !allowed(c.groupId, 'sendCampaigns')) return;
          const n = audienceFor(db, c.groupId, c.audience).length;
          patchDb((d) => ({ campaigns: d.campaigns.map((x) => (x.id === id ? { ...x, status: 'sent', sentAt: Date.now(), scheduledAt: undefined, stats: campaignStats(id, n) } : x)) }));
          get().toast({ text: `Sent to ${n} ${n === 1 ? 'person' : 'people'}`, tone: 'good' });
        },
        processScheduled: () => {
          const { db } = get();
          const now = Date.now();
          const due = db.campaigns.filter((c) => c.status === 'scheduled' && c.scheduledAt && c.scheduledAt <= now);
          if (!due.length) return;
          patchDb((d) => ({
            campaigns: d.campaigns.map((c) => (due.includes(c) ? { ...c, status: 'sent', sentAt: c.scheduledAt, stats: campaignStats(c.id, audienceFor(d, c.groupId, c.audience).length) } : c)),
          }));
        },

        // ---------- ui ----------
        toast: (t) => {
          const id = uid('t');
          set((s) => ({ toasts: [...s.toasts.slice(-2), { id, ...t }] }));
          setTimeout(() => get().dismissToast(id), t.tone === 'error' ? 4200 : 3200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        celebrate: (c) => set({ celebration: c }),
        resetDemo: () => set({ db: buildDemoDB(), me: null, toasts: [], celebration: null }),
      };
    },
    {
      name: 'otl-lawn-v2',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ db: s.db, me: s.me, demo: s.demo }),
    },
  ),
);

// Selectors
export const useMe = () => useStore((s) => (s.me ? s.db.users.find((u) => u.id === s.me) ?? null : null));
export const userById = (db: DB, id: Id) => db.users.find((u) => u.id === id);
export const groupById = (db: DB, id: Id) => db.groups.find((g) => g.id === id);
export const groupBySlug = (db: DB, slug: string) => db.groups.find((g) => g.slug === slug);
export const membershipOf = (db: DB, eventId: Id, userId: Id | null) =>
  userId ? db.memberships.find((m) => m.eventId === eventId && m.userId === userId) : undefined;
export const canEnterGarden = (db: DB, ev: LawnEvent, userId: Id | null) =>
  !!userId && (ev.hostId === userId || ev.cohostIds.includes(userId) || isStaffRole(roleIn(db, ev.groupId, userId)) || membershipOf(db, ev.id, userId)?.status === 'here');
