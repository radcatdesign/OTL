import type { DB, GroupRole, Id } from './types';

// Who can do what inside a group. Hosts and co-hosts have full admin. Moderators run
// lawns and conversations but don't touch membership or the email list.
export const ABILITIES = {
  editGroup: { label: 'Edit group details', roles: ['host', 'cohost'] },
  manageRoles: { label: 'Change roles', roles: ['host', 'cohost'] },
  inviteMembers: { label: 'Invite members', roles: ['host', 'cohost'] },
  removeMembers: { label: 'Remove members', roles: ['host', 'cohost'] },
  banMembers: { label: 'Ban members', roles: ['host', 'cohost'] },
  createEvents: { label: 'Create and edit lawns', roles: ['host', 'cohost', 'moderator'] },
  moderateChat: { label: 'Answer and hide chat messages', roles: ['host', 'cohost', 'moderator'] },
  viewStats: { label: 'See group stats', roles: ['host', 'cohost', 'moderator'] },
  manageEmail: { label: 'Manage the email list', roles: ['host', 'cohost'] },
  sendCampaigns: { label: 'Create and send campaigns', roles: ['host', 'cohost'] },
} as const satisfies Record<string, { label: string; roles: readonly GroupRole[] }>;

export type Ability = keyof typeof ABILITIES;

export const ROLE_INFO: Record<GroupRole, { name: string; short: string; blurb: string; rank: number }> = {
  host: { name: 'Host', short: 'Host', blurb: 'Started the group. Full admin.', rank: 4 },
  cohost: { name: 'Co-host', short: 'Co-host', blurb: 'Full admin, same as the host.', rank: 3 },
  moderator: { name: 'Moderator', short: 'Mod', blurb: "Creates lawns and answers messages. Can't add, remove, or ban members.", rank: 2 },
  member: { name: 'Member', short: 'Member', blurb: 'Joins lawns, chats, plants seeds.', rank: 1 },
};

export const ROLES_ORDER: GroupRole[] = ['host', 'cohost', 'moderator', 'member'];

export function roleIn(db: DB, groupId: Id, userId: Id | null | undefined): GroupRole | null {
  if (!userId) return null;
  return db.groupMembers.find((m) => m.groupId === groupId && m.userId === userId)?.role ?? null;
}

export function can(role: GroupRole | null | undefined, ability: Ability) {
  return !!role && (ABILITIES[ability].roles as readonly GroupRole[]).includes(role);
}

export function canIn(db: DB, groupId: Id, userId: Id | null | undefined, ability: Ability) {
  return can(roleIn(db, groupId, userId), ability);
}

export function isBanned(db: DB, groupId: Id, userId: Id | null | undefined, email?: string) {
  return db.groupBans.some((b) => b.groupId === groupId && ((userId && b.userId === userId) || (email && b.email === email.toLowerCase())));
}

// Groups where this person can run lawns.
export function groupsICanHost(db: DB, userId: Id | null) {
  if (!userId) return [];
  return db.groups.filter((g) => canIn(db, g.id, userId, 'createEvents'));
}

// Who can change, remove, or ban whom. The host can act on anyone else.
// Co-hosts can act on moderators and members, not on each other.
export function canActOn(actor: GroupRole | null | undefined, target: GroupRole | null | undefined) {
  if (actor === 'host') return target !== 'host';
  if (actor === 'cohost') return target === 'moderator' || target === 'member' || !target;
  return false;
}

export const isAdminRole = (r: GroupRole | null | undefined) => r === 'host' || r === 'cohost';
export const isStaffRole = (r: GroupRole | null | undefined) => r === 'host' || r === 'cohost' || r === 'moderator';
