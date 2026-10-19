import type { OtisLook } from '../brand/otis/Otis';
import type { Role } from './intents';

// Starting looks per role, following the Otis Presets variants in Figma.
export const ROLE_LOOKS: Record<Role, OtisLook> = {
  Strategist: { hat: 'lawn', overalls: 'tomato', tool: 'trowel', band: false, companion: 'none', card: 'tomato' },
  Marketer: { hat: 'sun', overalls: 'sky', tool: 'megaphone', band: false, companion: 'none', card: 'sky' },
  Creator: { hat: 'tomato', overalls: 'lawn', tool: 'brush', band: false, companion: 'none', card: 'lawn' },
  Analyst: { hat: 'sky', overalls: 'sun', tool: 'shears', band: false, companion: 'none', card: 'sun' },
  Mentor: { hat: 'forest', overalls: 'forest', tool: 'marigold', band: false, companion: 'none', card: 'tangerine' },
  Investor: { hat: 'tangerine', overalls: 'tangerine', tool: 'marigold', band: false, companion: 'none', card: 'forest' },
  Founder: { hat: 'lawn', overalls: 'sky', tool: 'trowel', band: true, companion: 'none', card: 'forest' },
  Student: { hat: 'sky', overalls: 'tangerine', tool: 'brush', band: false, companion: 'none', card: 'lawn' },
  Other: { hat: 'tangerine', overalls: 'sky', tool: 'wildflower', band: false, companion: 'none', card: 'sky' },
};
