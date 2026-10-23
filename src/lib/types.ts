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

// ---------- Groups ----------

export type GroupRole = 'host' | 'cohost' | 'moderator' | 'member';

export interface Group {
  id: Id;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  color: ColorKey;
  city: string;
  createdAt: number;
  replyTo: string; // where campaign replies go
}

export interface GroupMember {
  id: Id;
  groupId: Id;
  userId: Id;
  role: GroupRole;
  joinedAt: number;
  invitedBy?: Id;
}

export interface GroupInvite {
  id: Id;
  groupId: Id;
  email: string;
  role: GroupRole;
  invitedBy: Id;
  createdAt: number;
  status: 'pending' | 'accepted' | 'revoked';
  sentCount: number;
}

export interface GroupBan {
  id: Id;
  groupId: Id;
  userId?: Id;
  email: string;
  name: string;
  reason: string;
  bannedBy: Id;
  createdAt: number;
}

// ---------- Email ----------

export interface ContactList {
  id: Id;
  groupId: Id;
  name: string;
  color: ColorKey;
  createdAt: number;
}

export interface Contact {
  id: Id;
  groupId: Id;
  email: string;
  name: string;
  listIds: Id[];
  status: 'subscribed' | 'unsubscribed';
  source: 'member' | 'rsvp' | 'import' | 'manual';
  userId?: Id;
  createdAt: number;
}

export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'event' | 'divider' | 'signoff';

export interface CampaignBlock {
  id: Id;
  type: BlockType;
  text?: string; // heading/text/button label/sign-off
  url?: string; // button link
  src?: string; // image data URL or https URL
  alt?: string;
  eventId?: Id;
}

export interface Campaign {
  id: Id;
  groupId: Id;
  name: string;
  subject: string;
  preheader: string;
  fromName: string;
  accent: ColorKey;
  blocks: CampaignBlock[];
  audience: { all: boolean; listIds: Id[] };
  status: 'draft' | 'scheduled' | 'sent';
  scheduledAt?: number;
  sentAt?: number;
  createdBy: Id;
  createdAt: number;
  updatedAt: number;
  stats?: { recipients: number; opens: number; clicks: number };
}

// ---------- Lawns (events) ----------

export interface Contribution {
  mode: 'free' | 'donate';
  amount: number; // whole dollars, honest system: pledged, not verified
}

export type CoverArt = 'lawn' | 'checker' | 'plaid' | 'sky' | 'garden' | 'picnic';
export type Cover = { kind: 'art'; art: CoverArt } | { kind: 'photo'; src: string };

export interface LawnEvent {
  id: Id;
  groupId: Id;
  code: string; // invite code, e.g. "PINE42"
  gate: string; // check-in code shown at the event, e.g. "LAWN"
  title: string;
  about: string;
  hostId: Id; // who created it
  cohostIds: Id[]; // shown as "Hosted by" next to the group
  startsAt: number;
  endsAt: number;
  venue: string;
  address: string;
  geo?: { lat: number; lng: number };
  cover: Cover;
  color: ColorKey;
  visibility: 'public' | 'invite';
  capacity?: number;
  chat: boolean;
  photos: boolean;
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

export interface ChatMessage {
  id: Id;
  eventId: Id;
  userId: Id;
  text: string;
  replyTo?: Id;
  createdAt: number;
  hiddenBy?: Id;
}

export interface EventPhoto {
  id: Id;
  eventId: Id;
  userId: Id;
  src: string;
  caption: string;
  createdAt: number;
  likes: Id[];
}

// ---------- Gardens ----------

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
  spot?: { x: number; y: number }; // where it sits in the walkable garden, as fractions of the plot
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
  groups: Group[];
  groupMembers: GroupMember[];
  groupInvites: GroupInvite[];
  groupBans: GroupBan[];
  contactLists: ContactList[];
  contacts: Contact[];
  campaigns: Campaign[];
  events: LawnEvent[];
  memberships: Membership[];
  emailInvites: EmailInvite[];
  messages: ChatMessage[];
  photos: EventPhoto[];
  seeds: Seed[];
  waterings: Watering[];
  activity: Activity[];
}
