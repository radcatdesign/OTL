import type { Companion, HatStyle } from '../brand/otis/Otis';
import type { IconKey } from '../brand/icons';
import type { DB, Id } from './types';

export const XP = {
  joinLawn: 20,
  checkIn: 30,
  plant: 15,
  water: 10,
  bloom: 40,
  host: 50,
  inviteAccepted: 15,
  support: 25,
} as const;

export const LEVELS = [
  { at: 0, name: 'Seed' },
  { at: 60, name: 'Sprout' },
  { at: 160, name: 'Seedling' },
  { at: 320, name: 'Bloomer' },
  { at: 520, name: 'Gardener' },
  { at: 800, name: 'Groundskeeper' },
  { at: 1200, name: 'Lawn legend' },
];

export interface Stats {
  lawns: number;
  attended: number;
  hosted: number;
  planted: number;
  watered: number;
  blooms: number;
  invitesAccepted: number;
  supported: number;
  donated: number;
  connections: number; // distinct people you've grown something with
}

export function statsFor(db: DB, userId: Id): Stats {
  const mine = db.memberships.filter((m) => m.userId === userId && m.status !== 'invited');
  const hosted = db.events.filter((e) => e.hostId === userId);
  const planted = db.seeds.filter((s) => s.userId === userId);
  const watered = new Set(db.waterings.filter((w) => w.userId === userId).map((w) => w.seedId));
  const bloomSeeds = db.seeds.filter((s) => s.bloomedAt && (s.userId === userId || s.partners.includes(userId)));
  const people = new Set<Id>();
  bloomSeeds.forEach((s) => [s.userId, ...s.partners].forEach((p) => p !== userId && people.add(p)));
  const lawnIds = new Set([...mine.map((m) => m.eventId), ...hosted.map((e) => e.id)]);
  const supportedEvents = hosted.filter((e) => e.contribution.mode === 'donate' && e.contribution.amount > 0);
  return {
    lawns: lawnIds.size,
    attended: mine.filter((m) => m.status === 'here').length,
    hosted: hosted.length,
    planted: planted.length,
    watered: watered.size,
    blooms: bloomSeeds.length,
    invitesAccepted: db.memberships.filter((m) => m.invitedBy === userId && m.status !== 'invited').length,
    supported: supportedEvents.length,
    donated: supportedEvents.reduce((n, e) => n + e.contribution.amount, 0),
    connections: people.size,
  };
}

export function xpFor(s: Stats) {
  return (
    s.lawns * XP.joinLawn +
    s.attended * XP.checkIn +
    s.planted * XP.plant +
    s.watered * XP.water +
    s.blooms * XP.bloom +
    s.hosted * XP.host +
    s.invitesAccepted * XP.inviteAccepted +
    s.supported * XP.support
  );
}

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].at) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    index: i,
    number: i + 1,
    name: cur.name,
    next: next ?? null,
    progress: next ? (xp - cur.at) / (next.at - cur.at) : 1,
    toNext: next ? next.at - xp : 0,
  };
}

export type BadgeKey = 'first-seed' | 'green-thumb' | 'matchmaker' | 'host' | 'regular' | 'supporter' | 'on-the-lawn' | 'connector';

export interface Badge {
  key: BadgeKey;
  name: string;
  how: string;
  icon: IconKey;
  earned: (s: Stats) => boolean;
  progress: (s: Stats) => [number, number];
}

export const BADGES: Badge[] = [
  { key: 'on-the-lawn', name: 'On the lawn', how: 'Check in at a lawn', icon: 'drink', earned: (s) => s.attended >= 1, progress: (s) => [Math.min(s.attended, 1), 1] },
  { key: 'first-seed', name: 'First seed', how: 'Plant a seed in a garden', icon: 'plant', earned: (s) => s.planted >= 1, progress: (s) => [Math.min(s.planted, 1), 1] },
  { key: 'green-thumb', name: 'Green thumb', how: 'Water 5 seeds', icon: 'wateringCan', earned: (s) => s.watered >= 5, progress: (s) => [Math.min(s.watered, 5), 5] },
  { key: 'matchmaker', name: 'In bloom', how: 'Grow a seed into a flower with someone', icon: 'tulip', earned: (s) => s.blooms >= 1, progress: (s) => [Math.min(s.blooms, 1), 1] },
  { key: 'host', name: 'Host', how: 'Host a lawn', icon: 'picnicTable', earned: (s) => s.hosted >= 1, progress: (s) => [Math.min(s.hosted, 1), 1] },
  { key: 'regular', name: 'Regular', how: 'Be part of 3 lawns', icon: 'trees', earned: (s) => s.lawns >= 3, progress: (s) => [Math.min(s.lawns, 3), 3] },
  { key: 'connector', name: 'Connector', how: 'Bring 3 people to a lawn', icon: 'letter', earned: (s) => s.invitesAccepted >= 3, progress: (s) => [Math.min(s.invitesAccepted, 3), 3] },
  { key: 'supporter', name: 'Supporter', how: 'Chip in to OTL when you host', icon: 'sunHat', earned: (s) => s.supported >= 1, progress: (s) => [Math.min(s.supported, 1), 1] },
];

// What each unlock needs. Everything else in the Otis studio is free from the start.
export interface Unlock { label: string; check: (s: Stats, level: number) => boolean }

export const HAT_UNLOCKS: Partial<Record<HatStyle, Unlock>> = {
  checker: { label: 'Reach level 2', check: (_s, l) => l >= 2 },
  plaid: { label: 'Reach level 3', check: (_s, l) => l >= 3 },
  xtreme: { label: 'Reach level 5', check: (_s, l) => l >= 5 },
};

export const COMPANION_UNLOCKS: Partial<Record<Companion, Unlock>> = {
  bird: { label: 'Grow a flower with someone', check: (s) => s.blooms >= 1 },
  butterfly: { label: 'Water 5 seeds', check: (s) => s.watered >= 5 },
  ladybug: { label: 'Host a lawn', check: (s) => s.hosted >= 1 },
};
