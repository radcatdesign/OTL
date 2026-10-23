import { useRef, useState } from 'react';
import { C } from '../brand/palette';

// Validated pair (dataviz validator, light surface): forest + sky. Sky sits under 3:1
// against the surface, so every value is also printed as text and a table view exists.
export const SERIES = { checked: C.forest, noshow: C.sky };
const GRID = '#e3e7d3';
const MUTED = '#4a7a4c';

export function GrowthChart({ data }: { data: { label: string; total: number; added: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 640, H = 220, L = 34, R = 16, T = 16, B = 30;
  const max = Math.max(4, ...data.map((d) => d.total));
  const step = max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 25 : 50;
  const top = Math.ceil(max / step) * step;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, data.length - 1);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const last = data.length - 1;

  const move = (clientX: number) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover ?? last;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Members by month. ${data[0]?.label}: ${data[0]?.total}. ${data[last]?.label}: ${data[last]?.total}.`}
        style={{ display: 'block', touchAction: 'pan-y', overflow: 'visible' }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED} fontWeight="700">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.label + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED} fontWeight={i === h ? 800 : 600}>{d.label}</text>
        ))}
        <path d={area} fill={C.forest} opacity="0.1" />
        <path d={line} fill="none" stroke={C.forest} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(h)} x2={x(h)} y1={T} y2={y(0)} stroke={C.pine} strokeWidth="1" opacity={hover === null ? 0 : 0.5} />
        <circle cx={x(h)} cy={y(data[h].total)} r="5" fill={C.forest} stroke="#fff" strokeWidth="2" />
        <text x={x(last)} y={y(data[last].total) - 12} textAnchor="end" fontSize="13" fontWeight="800" fill={C.pine}>{data[last].total}</text>
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(h) / W) * 100}%` }}>
          <b>{data[h].label}</b>
          <span>{data[h].total} members</span>
          <span>+{data[h].added} joined</span>
        </div>
      )}
    </div>
  );
}

export function AttendanceBars({ rows }: { rows: { id: string; label: string; sub: string; checkins: number; rsvps: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.rsvps));
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 14 }} aria-hidden>
        <span className="row small strong" style={{ gap: 6 }}><span className="legend-key" style={{ background: SERIES.checked }} />Checked in</span>
        <span className="row small strong" style={{ gap: 6 }}><span className="legend-key" style={{ background: SERIES.noshow }} />RSVP'd, didn't check in</span>
      </div>
      {rows.map((r) => {
        const noshow = Math.max(0, r.rsvps - r.checkins);
        const rate = r.rsvps ? Math.round((r.checkins / r.rsvps) * 100) : 0;
        return (
          <div
            key={r.id}
            className="stack"
            style={{ gap: 4, position: 'relative' }}
            onPointerEnter={() => setHover(r.id)}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`${r.label}: ${r.checkins} checked in of ${r.rsvps} RSVPs`}
          >
            <div className="row between" style={{ gap: 8 }}>
              <span className="small strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label} <span className="muted">{r.sub}</span></span>
              <span className="small strong" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.checkins} of {r.rsvps}</span>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 14, opacity: hover && hover !== r.id ? 0.55 : 1, transition: 'opacity 120ms ease' }}>
              {r.checkins > 0 && <span style={{ width: `${(r.checkins / max) * 100}%`, background: SERIES.checked, borderRadius: noshow ? '0' : '0 4px 4px 0' }} />}
              {noshow > 0 && <span style={{ width: `${(noshow / max) * 100}%`, background: SERIES.noshow, borderRadius: '0 4px 4px 0' }} />}
            </div>
            {hover === r.id && (
              <div className="chart-tip" style={{ left: '50%', top: -6 }}>
                <b>{r.label}</b>
                <span>{r.checkins} checked in, {noshow} didn't</span>
                <span>{rate}% check-in rate</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
