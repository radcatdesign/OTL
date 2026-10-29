import { memo } from 'react';

// Placeholder portraits for people who haven't added a photo yet. Each one is drawn from the
// person's id, so it stays the same everywhere. Real photos replace them when people upload one.

const BG = ['#e8effe', '#fdf3d0', '#e4f1df', '#fde9e2', '#efe6fb', '#dff3f0', '#ffeedd', '#eceff2'];
const SKIN = ['#f9dcc8', '#f1c4a3', '#e2a77f', '#c88a63', '#a06a46', '#6f4630'];
const HAIR = ['#2b2220', '#3e2a1e', '#6b4024', '#a86b36', '#d6ad6b', '#8c8c8c', '#b9472d', '#1d1d24'];
const SHIRT = ['#2f6bd8', '#217426', '#e0a91a', '#e2683a', '#56677a', '#7d55c7', '#1f9585', '#c9486a', '#f2f2ee'];
const INK = '#1f2a22';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}

type Hair = 'short' | 'part' | 'long' | 'bun' | 'curly' | 'buzz' | 'bob' | 'pony' | 'waves' | 'none';
const HAIRS: Hair[] = ['short', 'part', 'long', 'bun', 'curly', 'buzz', 'bob', 'pony', 'waves', 'short', 'long', 'none'];

export function faceMarkup(seed: string) {
  let h = hash(seed);
  const pick = <T,>(xs: T[]) => { const v = xs[h % xs.length]; h = Math.floor(h / xs.length) ^ (h << 3); h >>>= 0; return v; };
  const bg = pick(BG);
  const skin = pick(SKIN);
  const hairStyle = pick(HAIRS);
  const hair = hairStyle === 'none' ? skin : pick(HAIR);
  const shirt = pick(SHIRT);
  const glasses = h % 4 === 0; h = (h >>> 2) ^ 0x9e37;
  const beard = !['long', 'bun', 'bob', 'pony'].includes(hairStyle) && h % 5 === 0; h >>>= 3;
  const earring = ['long', 'bun', 'bob', 'pony', 'waves'].includes(hairStyle) && h % 3 === 0;
  const skinDark = shade(skin, -0.14);

  const back: string[] = [];
  const front: string[] = [];
  switch (hairStyle) {
    case 'long':
      back.push(`<path d="M30 46C28 28 38 19 50 19C62 19 72 28 70 46L72 74C64 79 36 79 28 74Z" fill="${hair}"/>`);
      front.push(`<path d="M33 44C32 30 40 23 50 23C61 23 68 30 67 44C62 36 56 31 48 31C42 34 37 38 33 44Z" fill="${hair}"/>`);
      break;
    case 'bob':
      back.push(`<path d="M30 46C29 28 39 20 50 20C61 20 71 28 70 46L69 60C64 62 36 62 31 60Z" fill="${hair}"/>`);
      front.push(`<path d="M33 45C32 30 40 23 50 23C60 23 68 30 67 45C63 37 52 33 44 33C39 35 35 39 33 45Z" fill="${hair}"/>`);
      break;
    case 'bun':
      front.push(`<circle cx="50" cy="19" r="7.5" fill="${hair}"/>`);
      front.push(`<path d="M33 43C32 29 40 23 50 23C60 23 68 29 67 43C63 35 57 31 50 31C43 31 37 35 33 43Z" fill="${hair}"/>`);
      break;
    case 'pony':
      back.push(`<path d="M64 30C74 32 76 46 72 58C70 50 67 42 63 38Z" fill="${hair}"/>`);
      front.push(`<path d="M33 43C32 29 40 23 50 23C60 23 68 29 67 43C64 34 57 30 50 30C42 30 37 35 33 43Z" fill="${hair}"/>`);
      break;
    case 'curly':
      back.push(`<g fill="${hair}"><circle cx="36" cy="32" r="9"/><circle cx="46" cy="24" r="10"/><circle cx="58" cy="25" r="10"/><circle cx="66" cy="34" r="9"/><circle cx="32" cy="43" r="7"/><circle cx="68" cy="44" r="7"/></g>`);
      break;
    case 'waves':
      back.push(`<path d="M31 46C29 29 38 20 50 20C63 20 72 29 69 47C72 54 70 62 66 66C64 56 64 50 62 44H38C36 50 36 56 34 66C30 62 28 54 31 46Z" fill="${hair}"/>`);
      front.push(`<path d="M34 42C34 30 41 24 50 24C59 24 66 30 66 42C61 34 55 32 50 34C45 32 39 35 34 42Z" fill="${hair}"/>`);
      break;
    case 'short':
      front.push(`<path d="M33 42C31 28 39 21 50 21C61 21 69 28 67 42C65 35 60 31 54 31C49 33 42 32 37 35C35 37 34 39 33 42Z" fill="${hair}"/>`);
      break;
    case 'part':
      front.push(`<path d="M33 43C31 28 39 21 51 21C62 21 69 28 67 41C62 33 55 29 46 30C42 33 38 37 33 43Z" fill="${hair}"/><path d="M46 30C47 26 49 24 52 22" stroke="${shade(hair, 0.25)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`);
      break;
    case 'buzz':
      front.push(`<path d="M33.5 40C33 29 41 24 50 24C59 24 67 29 66.5 40C62 33 56 30.5 50 30.5C44 30.5 38 33 33.5 40Z" fill="${hair}" opacity="0.85"/>`);
      break;
    default:
      break;
  }

  return [
    `<rect width="100" height="100" fill="${bg}"/>`,
    ...back,
    // shoulders and neck
    `<path d="M14 104C15 84 30 74 50 74C70 74 85 84 86 104Z" fill="${shirt}"/>`,
    `<path d="M43 60H57V73C57 78 43 78 43 73Z" fill="${skinDark}"/>`,
    `<path d="M40 75C44 79 56 79 60 75" stroke="${shade(shirt, -0.18)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    // head
    `<ellipse cx="33.5" cy="47" rx="3.4" ry="4.6" fill="${skinDark}"/>`,
    `<ellipse cx="66.5" cy="47" rx="3.4" ry="4.6" fill="${skinDark}"/>`,
    `<ellipse cx="50" cy="45" rx="16.5" ry="19.5" fill="${skin}"/>`,
    beard ? `<path d="M34 48C35 62 42 66 50 66C58 66 65 62 66 48C63 55 58 57 50 57C42 57 37 55 34 48Z" fill="${hair}"/>` : '',
    ...front,
    // face
    `<path d="M41 41.5Q44 40 46.5 41.3M53.5 41.3Q56 40 59 41.5" stroke="${shade(hair === skin ? '#5a4030' : hair, -0.05)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="44" cy="46.5" r="1.9" fill="${INK}"/><circle cx="56" cy="46.5" r="1.9" fill="${INK}"/>`,
    `<path d="M49.5 48.5Q48 52.5 50.5 53" stroke="${skinDark}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    beard ? `<path d="M45.5 57.5Q50 60 54.5 57.5" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7"/>`
      : `<path d="M45 56Q50 60.5 55 56" stroke="${INK}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
    `<circle cx="39.5" cy="52" r="2.6" fill="#f08a8a" opacity="0.22"/><circle cx="60.5" cy="52" r="2.6" fill="#f08a8a" opacity="0.22"/>`,
    glasses ? `<g stroke="${INK}" stroke-width="1.4" fill="rgba(255,255,255,0.18)"><rect x="38.5" y="42.2" width="10.5" height="8.6" rx="3.4"/><rect x="51" y="42.2" width="10.5" height="8.6" rx="3.4"/></g><path d="M49 45.5H51" stroke="${INK}" stroke-width="1.4"/>` : '',
    earring ? `<circle cx="33.5" cy="52.5" r="1.4" fill="#f5c31d"/><circle cx="66.5" cy="52.5" r="1.4" fill="#f5c31d"/>` : '',
  ].join('');
}

export const Face = memo(function Face({ seed, size }: { seed: string; size: number | string }) {
  return (
    <svg viewBox="13 11 74 74" width={size} height={size} style={{ display: "block" }} aria-hidden dangerouslySetInnerHTML={{ __html: faceMarkup(seed) }} />
  );
});
