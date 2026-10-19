import { memo, type CSSProperties } from 'react';
import { C, type ColorKey } from './palette';
import { flowerHead } from './otis/parts';

export type Stage = 'seed' | 'sprout' | 'bud' | 'bloom';
export const STAGES: Stage[] = ['seed', 'sprout', 'bud', 'bloom'];
export const STAGE_NAMES: Record<Stage, string> = {
  seed: 'Planted', sprout: 'Sprouting', bud: 'Budding', bloom: 'In bloom',
};

const STROKE = C.pine;
const LEAF = 'M0 0C5 -12 20 -17 30 -15C27 -5 15 5 0 0Z';
const TULIP =
  'M18.3789 12.6013C18.3789 11.151 20.1636 10.4603 21.1399 11.5327L22.8599 13.4219C23.6176 14.1108 24.6151 14.0724 25.2073 13.4219L28.5146 9.78922C29.1442 9.0976 30.2324 9.09761 30.862 9.78922L34.1693 13.4219C34.7989 14.1135 35.887 14.1135 36.5167 13.4219L38.2367 11.5327C39.213 10.4603 40.9977 11.151 40.9977 12.6013V18.6189C40.9977 25.1 35.85 29.93 29.6883 29.9283C23.33 29.93 18.38 25.1 18.3789 18.6189V12.6013Z';

function petals(color: ColorKey, accent: ColorKey) {
  const a = C[color];
  const b = C[accent];
  return [a, b, a, b, a, b, a, b];
}

function mound(soil = true) {
  return soil
    ? `<path d="M10 132C18 112 102 112 110 132Z" fill="${C.soil}" stroke="${STROKE}" stroke-width="4" stroke-linejoin="round"/>
       <circle cx="38" cy="124" r="2.4" fill="${C.soilDark}"/><circle cx="78" cy="122" r="2" fill="${C.soilDark}"/>
       <circle cx="88" cy="128" r="1.8" fill="${C.soilDark}"/><circle cx="50" cy="129" r="1.6" fill="${C.soilDark}"/>`
    : '';
}

function stem(topY: number) {
  return `<path d="M60 120C60 ${(120 + topY) / 2 + 6} 62 ${(120 + topY) / 2 - 6} 60 ${topY}" stroke="${STROKE}" stroke-width="5" stroke-linecap="round"/>`;
}

function leaves(y: number, size = 1) {
  return `
  <path d="${LEAF}" transform="translate(61 ${y}) scale(${size})" fill="${C.lawn}" stroke="${STROKE}" stroke-width="${3.4 / size}" stroke-linejoin="round"/>
  <path d="${LEAF}" transform="translate(59 ${y + 8}) scale(${-size} ${size})" fill="${C.lawn}" stroke="${STROKE}" stroke-width="${3.4 / size}" stroke-linejoin="round"/>`;
}

export function plantMarkup(stage: Stage, color: ColorKey, accent: ColorKey) {
  const fill = C[color];
  switch (stage) {
    case 'seed':
      return `${mound()}
        <ellipse cx="60" cy="113" rx="9" ry="12" transform="rotate(-18 60 113)" fill="${fill}" stroke="${STROKE}" stroke-width="3.6"/>
        <path d="M57 106C59 103 62 103 63 104" stroke="${C.cream}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'sprout':
      return `${stem(78)}${leaves(84, 0.9)}${mound()}`;
    case 'bud':
      return `${stem(58)}${leaves(92, 1)}
        <g transform="translate(60 47) scale(1.55) translate(-29.7 -19.5)">
          <path d="${TULIP}" fill="${fill}" stroke="${STROKE}" stroke-width="2.3" stroke-linejoin="round"/>
        </g>${mound()}`;
    case 'bloom':
      return `${stem(56)}${leaves(94, 1.05)}
        <g transform="translate(60 44) scale(0.66) translate(-186.4 -305.3)">${flowerHead(petals(color, accent))}</g>${mound()}`;
  }
}

export const Plant = memo(function Plant({
  stage, color, accent, size = 120, style, title,
}: {
  stage: Stage; color: ColorKey; accent: ColorKey; size?: number | string; style?: CSSProperties; title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      style={{ display: 'block', height: 'auto', aspectRatio: '120 / 140', overflow: 'visible', ...style }}
      role="img"
      aria-label={title ?? STAGE_NAMES[stage]}
      fill="none"
      dangerouslySetInnerHTML={{ __html: plantMarkup(stage, color, accent) }}
    />
  );
});

// The rainbow flower from the scene, used as decoration.
export function Wildflower({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      viewBox="140 260 94 94"
      width={size}
      height={size}
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: flowerHead(['#F5C31D', '#F73D00', '#F5C31D', '#70A0F9', '#F73D00', '#8CB200', '#70A0F9', '#8CB200']),
      }}
    />
  );
}
