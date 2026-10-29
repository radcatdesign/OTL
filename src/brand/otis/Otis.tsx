import { memo, useId, type CSSProperties } from 'react';
import { C, type ColorKey } from '../palette';
import { ICONS } from '../icons';
import {
  ARM, BAND, BODY, EYES, FEET, HEAD, HIGHLIGHTS, MOUTH, NOSE, SHADOW, TOOLS,
  hat, hatPatternDefs, overalls, type ToolKey,
} from './parts';

export type HatStyle = ColorKey | 'checker' | 'plaid' | 'xtreme';
export type Companion = 'none' | 'bird' | 'butterfly' | 'ladybug';

export interface OtisLook {
  hat: HatStyle;
  overalls: ColorKey;
  tool: ToolKey;
  band: boolean;
  companion: Companion;
  card: ColorKey;
}

export const DEFAULT_LOOK: OtisLook = {
  hat: 'lawn', overalls: 'tomato', tool: 'trowel', band: false, companion: 'none', card: 'tomato',
};

const PATTERNS = new Set(['checker', 'plaid', 'xtreme']);

function companionMarkup(c: Companion) {
  if (c === 'none') return '';
  // Placed in Otis's coordinate space (viewBox 0 0 229 405).
  const spot = {
    bird: { x: 150, y: 108, s: 58 },
    butterfly: { x: 4, y: 104, s: 50 },
    ladybug: { x: 92, y: 118, s: 40 },
  }[c];
  const key = c === 'bird' ? 'bird' : c === 'butterfly' ? 'butterfly' : 'ladybug';
  return `<svg x="${spot.x}" y="${spot.y}" width="${spot.s}" height="${spot.s}" viewBox="0 0 56 56" overflow="visible">${ICONS[key]}</svg>`;
}

export function otisMarkup(look: OtisLook, uid: string, opts: { shadow?: boolean } = {}) {
  const u = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const hatFill = PATTERNS.has(look.hat) ? `url(#${u}${look.hat})` : C[look.hat as ColorKey];
  const tool = TOOLS[look.tool].replace(/\{u\}/g, u);
  return [
    `<defs>${hatPatternDefs(u)}</defs>`,
    opts.shadow === false ? '' : SHADOW,
    BODY,
    overalls(C[look.overalls]),
    ARM,
    FEET,
    HEAD,
    NOSE,
    hat(hatFill),
    look.band ? BAND : '',
    EYES,
    MOUTH,
    HIGHLIGHTS,
    tool,
    companionMarkup(look.companion),
  ].join('');
}

type Frame = 'full' | 'portrait';

// full: the whole character. portrait: hat tip to chin, for avatars.
const VIEWBOX: Record<Frame, string> = {
  full: '-6 -2 241 409',
  portrait: '-2 128 218 218',
};

export const Otis = memo(function Otis({
  look, frame = 'full', size, style, className, title, shadow,
}: {
  look: OtisLook;
  frame?: Frame;
  size?: number | string;
  style?: CSSProperties;
  className?: string;
  title?: string;
  shadow?: boolean;
}) {
  const uid = useId();
  const [, , w, h] = VIEWBOX[frame].split(' ').map(Number);
  return (
    <svg
      viewBox={VIEWBOX[frame]}
      width={size}
      style={{ display: 'block', height: 'auto', aspectRatio: `${w} / ${h}`, overflow: 'visible', ...style }}
      className={className}
      role="img"
      aria-label={title ?? 'Otis the gnome cat'}
      fill="none"
      dangerouslySetInnerHTML={{ __html: otisMarkup(look, uid, { shadow: frame === 'full' && shadow !== false }) }}
    />
  );
});

// Round avatar: Otis portrait on the person's card color.
export function OtisAvatar({ look, size = 40, ring = true, style, title }: {
  look: OtisLook; size?: number; ring?: boolean; style?: CSSProperties; title?: string;
}) {
  return (
    <span
      className={`otis-avatar${ring ? ' ring' : ''}`}
      title={title}
      style={{ width: size, height: size, background: C[look.card], ...style }}
    >
      <Otis look={look} frame="portrait" style={{ width: '100%' }} title={title} />
    </span>
  );
}
