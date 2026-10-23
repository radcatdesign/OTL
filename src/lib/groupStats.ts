import type { DB, Id } from './types';

const DAY = 86_400_000;

export interface MemberStat {
  userId: Id;
  rsvps: number;
  checkins: number;
  seeds: number;
  waterings: number;
  blooms: number;
  messages: number;
  photos: number;
  lastActive: number;
  points: number;
}

export interface EventStat {
  id: Id;
  title: string;
  startsAt: number;
  past: boolean;
  rsvps: number; // going or checked in
  checkins: number;
  seeds: number;
  blooms: number;
  messages: number;
  photos: number;
}

export function groupStats(db: DB, groupId: Id, now = Date.now()) {
  const members = db.groupMembers.filter((m) => m.groupId === groupId);
  const events = db.events.filter((e) => e.groupId === groupId).sort((a, b) => a.startsAt - b.startsAt);
  const evIds = new Set(events.map((e) => e.id));
  const seeds = db.seeds.filter((s) => evIds.has(s.eventId));
  const seedIds = new Set(seeds.map((s) => s.id));
  const waterings = db.waterings.filter((w) => seedIds.has(w.seedId));
  const messages = db.messages.filter((m) => evIds.has(m.eventId) && !m.hiddenBy);
  const photos = db.photos.filter((p) => evIds.has(p.eventId));
  const rsvps = db.memberships.filter((m) => evIds.has(m.eventId) && m.status !== 'invited');

  // Per lawn
  const perEvent: EventStat[] = events.map((e) => {
    const r = rsvps.filter((m) => m.eventId === e.id);
    const s = seeds.filter((x) => x.eventId === e.id);
    return {
      id: e.id, title: e.title, startsAt: e.startsAt, past: e.endsAt < now,
      rsvps: r.length, checkins: r.filter((m) => m.status === 'here').length,
      seeds: s.length, blooms: s.filter((x) => x.bloomedAt).length,
      messages: messages.filter((m) => m.eventId === e.id).length,
      photos: photos.filter((p) => p.eventId === e.id).length,
    };
  });
  const past = perEvent.filter((e) => e.past);
  const pastRsvps = past.reduce((n, e) => n + e.rsvps, 0);
  const pastCheckins = past.reduce((n, e) => n + e.checkins, 0);

  // Per member
  const perMember = new Map<Id, MemberStat>();
  const get = (userId: Id, joinedAt = 0) => {
    let m = perMember.get(userId);
    if (!m) { m = { userId, rsvps: 0, checkins: 0, seeds: 0, waterings: 0, blooms: 0, messages: 0, photos: 0, lastActive: joinedAt, points: 0 }; perMember.set(userId, m); }
    return m;
  };
  members.forEach((m) => get(m.userId, m.joinedAt));
  const touch = (m: MemberStat, t: number) => { if (t > m.lastActive) m.lastActive = t; };
  rsvps.forEach((r) => { const m = get(r.userId); m.rsvps++; touch(m, r.createdAt); if (r.status === 'here') { m.checkins++; touch(m, r.checkedInAt ?? r.createdAt); } });
  seeds.forEach((s) => { const m = get(s.userId); m.seeds++; touch(m, s.createdAt); if (s.bloomedAt) { m.blooms++; s.partners.forEach((p) => get(p).blooms++); } });
  waterings.forEach((w) => { const m = get(w.userId); m.waterings++; touch(m, w.createdAt); });
  messages.forEach((x) => { const m = get(x.userId); m.messages++; touch(m, x.createdAt); });
  photos.forEach((p) => { const m = get(p.userId); m.photos++; touch(m, p.createdAt); });
  perMember.forEach((m) => { m.points = m.checkins * 3 + m.seeds * 2 + m.waterings * 2 + m.blooms * 4 + m.messages + m.photos; });

  const memberIds = new Set(members.map((m) => m.userId));
  const active90 = [...perMember.values()].filter((m) => memberIds.has(m.userId) && m.lastActive > now - 90 * DAY && (m.rsvps + m.seeds + m.waterings + m.messages + m.photos) > 0).length;
  const top = [...perMember.values()].filter((m) => memberIds.has(m.userId) && m.points > 0).sort((a, b) => b.points - a.points).slice(0, 6);

  // Cumulative members by month, last 12 months.
  const growth: { label: string; key: string; total: number; added: number }[] = [];
  const end = new Date(now);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const total = members.filter((m) => m.joinedAt < next).length;
    const added = members.filter((m) => m.joinedAt >= d.getTime() && m.joinedAt < next).length;
    growth.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), total, added });
  }

  const subscribers = db.contacts.filter((c) => c.groupId === groupId && c.status === 'subscribed').length;
  const newThisMonth = growth[growth.length - 1]?.added ?? 0;

  return {
    memberCount: members.length,
    roleCounts: {
      host: members.filter((m) => m.role === 'host').length,
      cohost: members.filter((m) => m.role === 'cohost').length,
      moderator: members.filter((m) => m.role === 'moderator').length,
      member: members.filter((m) => m.role === 'member').length,
    },
    active90,
    newThisMonth,
    checkinRate: pastRsvps ? pastCheckins / pastRsvps : 0,
    avgCheckins: past.length ? pastCheckins / past.length : 0,
    totals: { lawns: events.length, upcoming: perEvent.length - past.length, seeds: seeds.length, waterings: waterings.length, blooms: seeds.filter((s) => s.bloomedAt).length, messages: messages.length, photos: photos.length },
    perEvent,
    perMember,
    top,
    growth,
    subscribers,
  };
}

export type GroupStats = ReturnType<typeof groupStats>;
