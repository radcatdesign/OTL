import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { ROLE_INFO } from '../lib/perms';
import type { GroupRole } from '../lib/types';

const ROLE_CLASS: Record<GroupRole, string> = { host: 'pine', cohost: 'lawn', moderator: 'sky', member: '' };

export function RoleBadge({ role, short = false }: { role: GroupRole; short?: boolean }) {
  return <span className={`pill ${ROLE_CLASS[role]}`}>{short ? ROLE_INFO[role].short : ROLE_INFO[role].name}</span>;
}

// Segmented control. In the community spaces it picks up the chunky chip look from art.css.
export function Tabs<T extends string>({ value, onChange, items, label }: {
  value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
          {typeof t.count === 'number' && <span className="count">{t.count}</span>}
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
    <div className="panel row" style={{ gap: 10, alignItems: 'flex-start' }}>
      <Lock size={16} strokeWidth={2.2} aria-hidden style={{ flex: 'none', marginTop: 2, color: 'var(--ink-soft)' }} />
      <p className="small" style={{ color: 'var(--ink-soft)' }}>{text}</p>
    </div>
  );
}
