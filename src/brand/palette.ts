// Colors pulled straight from the OTL Figma file (Otis presets + card fronts).
export const C = {
  pine: '#16541A', // outlines, ink
  forest: '#217426', // dark green hats/overalls
  lawn: '#8CB200',
  sun: '#F5C31D',
  tomato: '#F73D00',
  sky: '#70A0F9',
  tangerine: '#FF8101',
  cream: '#FDFAEF',
  white: '#FFFFFF',
  paper: '#FFFFFF',
  soil: '#9A5B34',
  soilDark: '#6F3E22',
} as const;

export type ColorKey = 'lawn' | 'sun' | 'tomato' | 'sky' | 'tangerine' | 'forest';

export const COLOR_KEYS: ColorKey[] = ['lawn', 'sun', 'tomato', 'sky', 'tangerine', 'forest'];

export const COLOR_NAMES: Record<ColorKey, string> = {
  lawn: 'Lawn',
  sun: 'Sun',
  tomato: 'Tomato',
  sky: 'Sky',
  tangerine: 'Tangerine',
  forest: 'Forest',
};

export const hex = (k: ColorKey) => C[k];

// Text color that reads on top of each card color.
// A soft tinted badge for list and category colors in the clean platform UI.
export const tint = (k: ColorKey, amount = 18) => ({
  background: `color-mix(in srgb, ${C[k]} ${amount}%, white)`,
  borderColor: `color-mix(in srgb, ${C[k]} 45%, white)`,
  color: 'var(--ink)',
});

export const onColor = (k: ColorKey) => (k === 'sun' || k === 'lawn' ? C.pine : C.cream);
