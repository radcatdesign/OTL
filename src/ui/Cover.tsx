import { memo, type CSSProperties } from 'react';
import { Icon } from '../brand/icons';
import { Otis } from '../brand/otis/Otis';
import { Plant, Wildflower } from '../brand/Plant';
import { C } from '../brand/palette';
import { ROLE_LOOKS } from '../lib/presets';
import type { Cover as CoverT, CoverArt } from '../lib/types';
import { checkerBg } from './ProfileCard';

export const COVER_ARTS: { key: CoverArt; name: string }[] = [
  { key: 'lawn', name: 'On the lawn' },
  { key: 'picnic', name: 'Picnic' },
  { key: 'garden', name: 'Garden' },
  { key: 'sky', name: 'Big sky' },
  { key: 'checker', name: 'Checker' },
  { key: 'plaid', name: 'Plaid' },
];

const plaid = `repeating-linear-gradient(90deg, transparent 0 22px, ${C.tomato}cc 22px 34px, transparent 34px 58px, ${C.lawn}aa 58px 64px), repeating-linear-gradient(0deg, ${C.cream} 0 18px, ${C.sky} 18px 30px, ${C.cream} 30px 48px, ${C.sun} 48px 56px)`;

function Cloud({ x, y, w }: { x: string; y: string; w: number }) {
  return (
    <svg viewBox="0 0 120 52" style={{ position: 'absolute', left: x, top: y, width: w }} aria-hidden>
      <path d="M18 46C7 46 2 38 6 31C9 25 16 24 20 26C21 16 30 9 41 11C46 2 62 0 70 9C76 4 90 5 94 15C106 13 116 22 112 33C118 36 117 46 108 46Z" fill="#fff" />
    </svg>
  );
}

const Art = memo(function Art({ art }: { art: CoverArt }) {
  const fill: CSSProperties = { position: 'absolute', inset: 0 };
  switch (art) {
    case 'lawn':
      return (
        <div style={{ ...fill, background: 'linear-gradient(180deg, #8fc3fb 0%, #d7ecfd 52%, #8cb200 52.4%, #86ad00 100%)' }}>
          <Cloud x="8%" y="10%" w={80} />
          <Cloud x="70%" y="16%" w={60} />
          {[[16, 78, 15, ROLE_LOOKS.Creator], [38, 92, 18, ROLE_LOOKS.Strategist], [62, 88, 17, { ...ROLE_LOOKS.Other, hat: 'checker' as const }], [84, 80, 15, ROLE_LOOKS.Marketer]].map(([x, y, w, look], i) => (
            <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, transform: 'translate(-50%, -100%)' }}>
              <Otis look={look as typeof ROLE_LOOKS.Creator} />
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: '68%' }}><Wildflower size={22} /></div>
          <div style={{ position: 'absolute', left: '92%', top: '90%' }}><Wildflower size={18} /></div>
        </div>
      );
    case 'picnic':
      return (
        <div style={{ ...fill, background: '#8cb200' }}>
          <div style={{ position: 'absolute', left: '14%', right: '14%', top: '30%', bottom: '14%', transform: 'skewX(-12deg)', border: `3px solid ${C.pine}`, borderRadius: 12, background: `repeating-conic-gradient(${C.tomato} 0 25%, ${C.cream} 0 50%) 0 0 / 44px 44px` }} />
          <div style={{ position: 'absolute', left: '30%', top: '38%' }}><Icon name="basket" size={86} /></div>
          <div style={{ position: 'absolute', left: '52%', top: '48%' }}><Icon name="watermelon" size={70} /></div>
          <div style={{ position: 'absolute', left: '66%', top: '34%' }}><Icon name="drink" size={62} /></div>
          <div style={{ position: 'absolute', left: '6%', top: '8%' }}><Wildflower size={28} /></div>
          <div style={{ position: 'absolute', left: '88%', top: '12%' }}><Icon name="butterfly" size={40} /></div>
        </div>
      );
    case 'garden':
      return (
        <div style={{ ...fill, background: `linear-gradient(180deg, ${C.cream} 0 60%, ${C.soil} 60%)` }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '30%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2%' }}>
            {(['bloom', 'bud', 'bloom', 'sprout', 'bloom', 'bud'] as const).map((s, i) => (
              <div key={i} style={{ width: '13%' }}>
                <Plant stage={s} color={(['tomato', 'sky', 'sun', 'lawn', 'tangerine', 'tomato'] as const)[i]} accent={(['sun', 'sun', 'tomato', 'sun', 'sun', 'tangerine'] as const)[i]} size="100%" />
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: '82%', top: '10%' }}><Icon name="ladybug" size={40} /></div>
        </div>
      );
    case 'sky':
      return (
        <div style={{ ...fill, background: 'linear-gradient(180deg, #70a0f9, #cfe7fd)' }}>
          <div style={{ position: 'absolute', right: '12%', top: '14%', width: '18%', aspectRatio: '1', borderRadius: '50%', background: C.sun, border: `3px solid ${C.pine}` }} />
          <Cloud x="6%" y="18%" w={120} />
          <Cloud x="40%" y="46%" w={90} />
          <Cloud x="64%" y="62%" w={70} />
          <div style={{ position: 'absolute', left: '22%', top: '62%' }}><Icon name="bird" size={48} /></div>
        </div>
      );
    case 'checker':
      return (
        <div style={{ ...fill, backgroundImage: checkerBg, backgroundSize: '72px 72px', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '30%', aspectRatio: '1', borderRadius: '50%', background: C.cream, border: `3px solid ${C.pine}`, display: 'grid', placeItems: 'center' }}>
            <Wildflower size={70} />
          </div>
        </div>
      );
    case 'plaid':
      return (
        <div style={{ ...fill, background: plaid, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '26%' }}><Plant stage="bloom" color="tomato" accent="sun" size="100%" /></div>
        </div>
      );
  }
});

export function Cover({ cover, ratio = '2 / 1', radius = 14, style, label, framed = false }: { cover: CoverT; ratio?: string; radius?: number; style?: CSSProperties; label?: string; framed?: boolean }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ position: 'relative', aspectRatio: ratio, maxWidth: '100%', borderRadius: radius, border: framed ? `3px solid ${C.pine}` : '1px solid var(--border)', overflow: 'hidden', background: C.cream, ...style }}
    >
      {cover.kind === 'photo' ? (
        <img src={cover.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Art art={cover.art} />
      )}
    </div>
  );
}
