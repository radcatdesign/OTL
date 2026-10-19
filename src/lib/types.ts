import type { OtisLook } from '../brand/otis/Otis';
import type { ColorKey } from '../brand/palette';
import type { GuideIntent, Role, SeedIntent } from './intents';

export type Id = string;

export interface User {
  id: Id;
  name: string;
  email: string;
  role: Role;
  bio: string;
  link?: string;
  intents: GuideIntent[];
  otis: OtisLook;
  createdAt: number;
  demo?: boolean; // seeded community member (demo mode only)
}

export interface Contribution {
  mode: 'free' | 'donate';
  amount: number; // whole dollars, honest system: pledged, not verified
}

export interface LawnEvent {
  id: Id;
  code: string; // invite code, e.g. "PINE42"
  gate: string; // check-in code shown at the event, e.g. "LAWN"
  title: string;
  about: string;
  hostId: Id;
  startsAt: number;
  endsAt: number;
  venue: string;
  address: string;
  color: ColorKey;
  visibility: 'public' | 'invite';
  capacity?: number;
  contribution: Contribution;
  createdAt: number;
}

export type MemberStatus = 'invited' | 'going' | 'here';

export interface Membership {
  id: Id;
  eventId: Id;
  userId: Id;
  status: MemberStatus;
  invitedBy?: Id;
  spot: { x: number; y: number }; // where their Otis stands on the lawn, 0..1
  createdAt: number;
  checkedInAt?: number;
}

export interface EmailInvite {
  id: Id;
  eventId: Id;
  email: string;
  invitedBy: Id;
  createdAt: number;
}

export interface Seed {
  id: Id;
  eventId: Id;
  userId: Id;
  intent: SeedIntent;
  title: string;
  details: string;
  link?: string;
  createdAt: number;
  bloomedAt?: number;
  partners: Id[]; // who it bloomed with
}

export interface Watering {
  id: Id;
  seedId: Id;
  userId: Id;
  message: string;
  createdAt: number;
}

export type ActivityKind = 'joined' | 'checked_in' | 'planted' | 'watered' | 'bloomed' | 'hosted';

export interface Activity {
  id: Id;
  eventId: Id;
  userId: Id;
  kind: ActivityKind;
  seedId?: Id;
  otherUserId?: Id;
  createdAt: number;
}

export interface DB {
  users: User[];
  events: LawnEvent[];
  memberships: Membership[];
  emailInvites: EmailInvite[];
  seeds: Seed[];
  waterings: Watering[];
  activity: Activity[];
}
