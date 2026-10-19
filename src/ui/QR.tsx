import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { C } from '../brand/palette';

// Square QR with chunky rounded modules in pine on cream.
export function QR({ text, size = 180, label }: { text: string; size?: number; label: string }) {
  const { n, cells } = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const count = q.getModuleCount();
    const on: [number, number][] = [];
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (q.isDark(r, c)) on.push([c, r]);
    return { n: count, cells: on };
  }, [text]);
  const pad = 2;
  return (
    <svg viewBox={`${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`} width={size} height={size} role="img" aria-label={label} style={{ display: 'block', background: C.cream, borderRadius: 12 }}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.28} fill={C.pine} />
      ))}
    </svg>
  );
}
