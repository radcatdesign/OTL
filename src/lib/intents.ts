import { C, type ColorKey } from '../brand/palette';
import type { IconKey } from '../brand/icons';

// What you plant in a garden: a specific ask. Colors follow Otis' Guide on the card back.
export type SeedIntent = 'feedback' | 'advice' | 'mentor' | 'mentee' | 'collab' | 'launch';

export interface SeedIntentInfo {
  key: SeedIntent;
  label: string; // short chip label
  ask: string; // how it reads on a seed
  prompt: string; // placeholder for the title field
  waterVerb: string; // what someone offers when they water
  color: ColorKey;
  accent: ColorKey; // second petal color in bloom
  icon: IconKey;
}

export const SEED_INTENTS: SeedIntentInfo[] = [
  {
    key: 'feedback', label: 'Feedback', ask: 'Looking for feedback',
    prompt: 'Review my brand deck before Friday',
    waterVerb: 'Offer a review', color: 'sky', accent: 'sun', icon: 'letter',
  },
  {
    key: 'advice', label: 'Advice', ask: 'Looking for advice',
    prompt: 'How do you price a first brand project?',
    waterVerb: 'Share advice', color: 'tangerine', accent: 'sun', icon: 'phone',
  },
  {
    key: 'mentor', label: 'Find a mentor', ask: 'Looking for a mentor',
    prompt: 'A mentor for moving from freelance to studio',
    waterVerb: 'Offer to mentor', color: 'forest', accent: 'lawn', icon: 'trees',
  },
  {
    key: 'mentee', label: 'Mentor someone', ask: 'Looking for someone to mentor',
    prompt: 'I can mentor a student in motion design',
    waterVerb: 'Raise your hand', color: 'lawn', accent: 'sun', icon: 'plant',
  },
  {
    key: 'collab', label: 'Collaborate', ask: 'Looking for a collaborator',
    prompt: 'Illustrator for a zine about Bend trails',
    waterVerb: 'Offer to team up', color: 'tomato', accent: 'tangerine', icon: 'picnicTable',
  },
  {
    key: 'launch', label: 'Spread the word', ask: 'Help me spread the word',
    prompt: 'Launching my ceramics shop this weekend',
    waterVerb: 'Offer a boost', color: 'sun', accent: 'tomato', icon: 'tunes',
  },
];

export const SEED_INTENT = Object.fromEntries(SEED_INTENTS.map((i) => [i.key, i])) as Record<SeedIntent, SeedIntentInfo>;

export const intentColor = (k: SeedIntent) => C[SEED_INTENT[k].color];

// "Looking to..." on your profile card, verbatim from Otis' Guide on the card back.
export type GuideIntent = 'learn' | 'idea' | 'feedback' | 'launch' | 'encourage' | 'mentor';

export const GUIDE_INTENTS: { key: GuideIntent; label: string; color: ColorKey }[] = [
  { key: 'learn', label: 'Learning and creating', color: 'tomato' },
  { key: 'idea', label: 'Want to share a new idea', color: 'lawn' },
  { key: 'feedback', label: 'Looking for in-progress feedback', color: 'sky' },
  { key: 'launch', label: 'Ready to promote a new launch', color: 'sun' },
  { key: 'encourage', label: 'Here to encourage and shine light', color: 'tangerine' },
  { key: 'mentor', label: 'Looking to be a mentor or guide', color: 'forest' },
];

// "I am a..." from the OTL registration form.
export const ROLES = ['Creator', 'Strategist', 'Marketer', 'Analyst', 'Founder', 'Investor', 'Mentor', 'Student', 'Other'] as const;
export type Role = (typeof ROLES)[number];
