import type { ReactNode } from 'react';
import { C } from '../brand/palette';
import { ROLE_INFO } from '../lib/perms';
import type { GroupRole } from '../lib/types';

const ROLE_STYLE: Record<GroupRole, { bg: string; fg: string }> = {
  host: { bg: C.pine, fg: C.cream },
  cohost: { bg: C.forest, fg: C.cream },
  moderator: { bg: C.sky, fg: C.pine },
  member: { bg: C.paper, fg: C.pine },
};

export function RoleBadge({ role, short = false }: { role: GroupRole; short?: boolean }) {
  const s = ROLE_STYLE[role];
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg }}>
      {short ? ROLE_INFO[role].short : ROLE_INFO[role].name}
    </span>
  );
}

export function Tabs<T extends string>({ value, onChange, items, label }: {
  value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; label: string;
}) {
  return (
    <div className="row" role="tablist" aria-label={label} style={{ overflowX: 'auto', gap: 8, paddingBottom: 6, marginInline: -4, paddingInline: 4 }}>
      {items.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} aria-pressed={value === t.key} className="chip" style={{ whiteSpace: 'nowrap' }} onClick={() => onChange(t.key)}>
          {t.label}
          {typeof t.count === 'number' && <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label htmlFor={id} className="row" style={{ cursor: 'pointer', alignItems: 'flex-start', gap: 12 }}>
      <span className="switch" data-on={checked}>
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <span className="switch-knob" />
      </span>
      <span className="grow">
        <span className="strong" style={{ display: 'block' }}>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
    </label>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card stack center" style={{ alignItems: 'center', padding: 28 }}>
      {icon}
      <p className="display h4">{title}</p>
      {children}
    </div>
  );
}

export function Locked({ text }: { text: string }) {
  return (
    <div className="panel row" style={{ gap: 10, background: C.cream, borderStyle: 'dashed' }}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden style={{ flex: 'none' }}>
        <rect x="4" y="11" width="18" height="13" rx="4" fill={C.cream} stroke={C.pine} strokeWidth="2.6" />
        <path d="M8 11V8a5 5 0 0 1 10 0v3" stroke={C.pine} strokeWidth="2.6" fill="none" />
      </svg>
      <p className="small strong">{text}</p>
    </div>
  );
}
