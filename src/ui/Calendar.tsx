import { useMemo } from 'react';
import { C, onColor } from '../brand/palette';
import type { LawnEvent } from '../lib/types';
import { zoned } from '../lib/util';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Month grid. Days with lawns show chips; clicking a day picks it.
export function Calendar({
  month, onMonth, events = [], selected, onPick, onEvent, compact = false, pickPast = false, createHint,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  events?: LawnEvent[];
  selected?: string; // yyyy-mm-dd
  onPick?: (day: string) => void;
  onEvent?: (ev: LawnEvent) => void;
  compact?: boolean;
  pickPast?: boolean;
  createHint?: string;
}) {
  const today = zoned(Date.now()).day;
  const cells = useMemo(() => {
    const first = monthStart(month);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, LawnEvent[]>();
    events.forEach((e) => {
      const k = zoned(e.startsAt).day;
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [events]);
  const rows = cells[35].getMonth() === month.getMonth() ? 6 : 5;
  const label = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="cal">
      <div className="row between" style={{ marginBottom: 10 }}>
        <button type="button" className="btn cream small icon" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M11 3L5 9l6 6" stroke={C.pine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className="display h4" aria-live="polite">{label}</p>
        <button type="button" className="btn cream small icon" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M7 3l6 6-6 6" stroke={C.pine} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={label}>
        {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{compact ? d[0] : d}</div>)}
        {cells.slice(0, rows * 7).map((d) => {
          const k = dayKey(d);
          const evs = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === month.getMonth();
          const past = k < today;
          const pickable = !!onPick && (pickPast || !past);
          return (
            <div
              key={k}
              role="gridcell"
              aria-selected={selected === k}
              className={`cal-cell ${inMonth ? '' : 'out'} ${past ? 'past' : ''} ${k === today ? 'today' : ''} ${selected === k ? 'sel' : ''} ${pickable ? 'pickable' : ''} ${compact ? 'compact' : ''}`}
            >
              {pickable && (
                <button type="button" className="cal-pick" aria-label={`${createHint ?? 'Pick'} ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`} aria-pressed={selected === k} onClick={() => onPick!(k)} />
              )}
              <span className="cal-num">{d.getDate()}</span>
              {compact ? (
                evs.length > 0 && (
                  <span className="row" style={{ gap: 2, justifyContent: 'center' }}>
                    {evs.slice(0, 3).map((e) => <span key={e.id} className="dot" style={{ width: 8, height: 8, borderWidth: 1.5, borderRadius: 3, background: C[e.color] }} />)}
                  </span>
                )
              ) : (
                <span className="stack" style={{ gap: 3 }}>
                  {evs.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="cal-chip"
                      style={{ background: C[e.color], color: onColor(e.color) }}
                      onClick={(x) => { x.stopPropagation(); onEvent?.(e); }}
                      title={e.title}
                    >
                      {e.title}
                    </button>
                  ))}
                  {evs.length > 3 && <span className="small strong">+{evs.length - 3} more</span>}
                </span>
              )}
              {pickable && createHint && !compact && <span className="cal-add" aria-hidden>+</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
