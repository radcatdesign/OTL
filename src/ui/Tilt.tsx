import { useRef, type CSSProperties, type ReactNode, type PointerEvent } from 'react';

// Wraps a card so it leans toward the pointer in 3D, with a soft glare.
export function Tilt({ children, max = 10, className = '', style, lift = true }: {
  children: ReactNode; max?: number; className?: string; style?: CSSProperties; lift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max * 1.2}deg) ${lift ? 'translateY(-4px)' : ''}`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
    el.style.setProperty('--go', '1');
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    el.style.setProperty('--go', '0');
  };

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={{ transition: 'transform 220ms cubic-bezier(.2,.8,.3,1)', ...style }}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerCancel={leave}
      onPointerUp={(e) => e.pointerType !== 'mouse' && leave()}
    >
      {children}
    </div>
  );
}
