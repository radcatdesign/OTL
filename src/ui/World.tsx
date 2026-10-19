import { memo } from 'react';

// The sky-and-lawn backdrop from the OTL poster, fixed behind every screen.
function Cloud({ x, y, s, o = 1 }: { x: string; y: string; s: number; o?: number }) {
  return (
    <svg className="world-cloud" style={{ left: x, top: y, width: s, opacity: o }} viewBox="0 0 120 52" aria-hidden>
      <path d="M18 46C7 46 2 38 6 31C9 25 16 24 20 26C21 16 30 9 41 11C46 2 62 0 70 9C76 4 90 5 94 15C106 13 116 22 112 33C118 36 117 46 108 46Z" fill="#fff" />
    </svg>
  );
}

function Tuft({ x, y, s = 22 }: { x: string; y: string; s?: number }) {
  return (
    <svg style={{ position: 'absolute', left: x, top: y, width: s }} viewBox="0 0 24 16" aria-hidden>
      <path d="M2 15L6 4L9 15L12 1L15 15L18 5L22 15Z" fill="#7aa000" stroke="#16541A" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export const World = memo(function World() {
  return (
    <div className="world" aria-hidden>
      <Cloud x="6%" y="7%" s={96} />
      <Cloud x="70%" y="4%" s={74} o={0.95} />
      <Cloud x="44%" y="17%" s={58} o={0.9} />
      <Cloud x="86%" y="22%" s={50} o={0.85} />
      <svg className="world-ground" viewBox="0 0 1000 440" preserveAspectRatio="none">
        <path d="M0 70C160 30 330 20 500 36C680 52 830 30 1000 52V440H0Z" fill="#8CB200" />
        <path d="M0 70C160 30 330 20 500 36C680 52 830 30 1000 52" stroke="#16541A" strokeWidth="4" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '44%' }}>
        <Tuft x="8%" y="30%" />
        <Tuft x="31%" y="58%" s={18} />
        <Tuft x="62%" y="26%" s={20} />
        <Tuft x="83%" y="64%" />
        <Tuft x="47%" y="82%" s={16} />
        <Tuft x="14%" y="76%" s={18} />
      </div>
    </div>
  );
});
