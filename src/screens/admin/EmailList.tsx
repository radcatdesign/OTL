import { useMemo, useState } from 'react';
import { C, COLOR_KEYS, COLOR_NAMES, type ColorKey } from '../../brand/palette';
import { parseCSV, rowsToContacts, toCSV, validEmail } from '../../lib/email';
import { downloadText } from '../../lib/media';
import { useStore } from '../../lib/store';
import type { Contact, Group } from '../../lib/types';
import { useWide } from '../../lib/useWide';
import { copyText, fmtDay } from '../../lib/util';
import { Sheet } from '../../ui/Sheet';

const SOURCE: Record<Contact['source'], string> = { member: 'Member', rsvp: 'RSVP', import: 'Imported', manual: 'Added by hand' };
const PAGE = 40;

function ImportSheet({ group, open, onClose }: { group: Group; open: boolean; onClose: () => void }) {
  const db = useStore((s) => s.db);
  const importContacts = useStore((s) => s.importContacts);
  const createList = useStore((s) => s.createList);
  const lists = db.contactLists.filter((l) => l.groupId === group.id);
  const [text, setText] = useState('');
  const [listChoice, setListChoice] = useState<string>('');
  const [newList, setNewList] = useState('');
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);

  const rows = useMemo(() => rowsToContacts(parseCSV(text)), [text]);
  const valid = rows.filter((r) => validEmail(r.email));
  const existing = new Set(db.contacts.filter((c) => c.groupId === group.id).map((c) => c.email));
  const fresh = valid.filter((r) => !existing.has(r.email)).length;

  const close = () => { setText(''); setResult(null); setListChoice(''); setNewList(''); onClose(); };
  const readFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result ?? ''));
    r.readAsText(f);
  };
  const run = () => {
    let listId = listChoice || undefined;
    if (listChoice === '__new') {
      const l = newList.trim() ? createList(group.id, newList, 'sky') : null;
      listId = l?.id;
    }
    setResult(importContacts(group.id, rows, listId));
  };

  return (
    <Sheet open={open} onClose={close} label="Import contacts">
      {result ? (
        <div className="stack-lg">
          <h2 className="display h2">Imported</h2>
          <div className="grid-3">
            <div className="stat"><b>{result.added}</b><span>New contacts</span></div>
            <div className="stat"><b>{result.updated}</b><span>Already on the list</span></div>
            <div className="stat"><b>{result.skipped}</b><span>Skipped</span></div>
          </div>
          {result.skipped > 0 && <p className="small strong muted">Skipped rows had a broken email, a repeat in the file, or belong to someone banned from the group.</p>}
          <button className="btn sun block" onClick={close}>Done</button>
        </div>
      ) : (
        <div className="stack-lg">
          <div className="stack" style={{ gap: 6 }}>
            <h2 className="display h2">Import contacts</h2>
            <p className="muted strong">Upload a CSV or paste one in. We look for an email column and a name column, with or without a header row. People already on the list keep their status.</p>
          </div>
          <input id="imp-file" type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
          <label htmlFor="imp-file" className="btn cream block" style={{ cursor: 'pointer' }}>Choose a CSV file</label>
          <div className="field">
            <label htmlFor="imp-text">Or paste here</label>
            <textarea id="imp-text" className="textarea" style={{ minHeight: 130, fontFamily: 'var(--font-code)', fontSize: '0.85rem' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'name,email\nAlex Morgan,alex@example.com'} />
          </div>
          {text.trim() && (
            <div className="panel stack" style={{ gap: 8 }}>
              <p className="strong">{valid.length} contacts found, {fresh} new{rows.length - valid.length ? `, ${rows.length - valid.length} rows without a usable email` : ''}.</p>
              {valid.length > 0 && (
                <div className="table-wrap" style={{ maxHeight: 180 }}>
                  <table className="table">
                    <thead><tr><th>Name</th><th>Email</th></tr></thead>
                    <tbody>{valid.slice(0, 6).map((r, i) => <tr key={i}><td>{r.name || <span className="muted">No name</span>}</td><td>{r.email}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <div className="field">
            <label htmlFor="imp-list">Also add them to</label>
            <select id="imp-list" className="input select" value={listChoice} onChange={(e) => setListChoice(e.target.value)}>
              <option value="">Just the main list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              <option value="__new">A new list</option>
            </select>
            {listChoice === '__new' && <input className="input" value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="Name the new list" aria-label="New list name" />}
          </div>
          <button className="btn sun block" disabled={!valid.length} onClick={run}>Import {valid.length || ''} {valid.length === 1 ? 'contact' : 'contacts'}</button>
        </div>
      )}
    </Sheet>
  );
}

function AddSheet({ group, open, onClose }: { group: Group; open: boolean; onClose: () => void }) {
  const db = useStore((s) => s.db);
  const add = useStore((s) => s.addContact);
  const toast = useStore((s) => s.toast);
  const lists = db.contactLists.filter((l) => l.groupId === group.id);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [listIds, setListIds] = useState<string[]>([]);
  const [err, setErr] = useState('');
  return (
    <Sheet open={open} onClose={onClose} label="Add a contact">
      <form
        className="stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          const r = add(group.id, { email, name, listIds });
          if (r === 'added') { toast({ text: `${email.trim()} added`, tone: 'good' }); setEmail(''); setName(''); setListIds([]); setErr(''); onClose(); }
          else setErr(r === 'invalid' ? 'That email looks off. Check for a typo.' : r === 'exists' ? 'That email is already on the list.' : r === 'banned' ? 'That person is banned from the group.' : 'Only hosts and co-hosts can edit the list.');
        }}
      >
        <h2 className="display h2">Add a contact</h2>
        <div className="field">
          <label htmlFor="ac-email">Email</label>
          <input id="ac-email" className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        </div>
        <div className="field">
          <label htmlFor="ac-name">Name</label>
          <input id="ac-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {lists.length > 0 && (
          <div className="field">
            <span className="label">Lists</span>
            <div className="row-wrap">
              {lists.map((l) => {
                const on = listIds.includes(l.id);
                return <button type="button" key={l.id} className="chip" aria-pressed={on} style={{ ['--chip-on' as string]: C[l.color] }} onClick={() => setListIds((xs) => (on ? xs.filter((x) => x !== l.id) : [...xs, l.id]))}>{l.name}</button>;
              })}
            </div>
          </div>
        )}
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn sun block" type="submit">Add contact</button>
      </form>
    </Sheet>
  );
}

export function EmailList({ group }: { group: Group }) {
  const db = useStore((s) => s.db);
  const createList = useStore((s) => s.createList);
  const renameList = useStore((s) => s.renameList);
  const deleteList = useStore((s) => s.deleteList);
  const setStatus = useStore((s) => s.setContactStatus);
  const addToList = useStore((s) => s.addToList);
  const removeFromList = useStore((s) => s.removeFromList);
  const deleteContacts = useStore((s) => s.deleteContacts);
  const toast = useStore((s) => s.toast);
  const wide = useWide();

  const [listFilter, setListFilter] = useState<string>('all');
  const [status, setStatusFilter] = useState<'all' | Contact['status']>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<ColorKey>('sky');
  const [renaming, setRenaming] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'deleteList' | null>(null);

  const lists = db.contactLists.filter((l) => l.groupId === group.id);
  const all = db.contacts.filter((c) => c.groupId === group.id);
  const filtered = all
    .filter((c) => listFilter === 'all' || c.listIds.includes(listFilter))
    .filter((c) => status === 'all' || c.status === status)
    .filter((c) => !q.trim() || `${c.name} ${c.email}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);
  const shown = filtered.slice(0, limit);
  const subscribed = all.filter((c) => c.status === 'subscribed').length;
  const activeList = lists.find((l) => l.id === listFilter);
  const allShownSelected = shown.length > 0 && shown.every((c) => sel.includes(c.id));

  const toggle = (id: string) => setSel((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const exportCsv = async () => {
    const csv = toCSV(db, filtered);
    const name = `${group.slug}-${activeList ? activeList.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'contacts'}.csv`;
    if (downloadText(name, csv, 'text/csv')) toast({ text: `Exported ${filtered.length} contacts`, tone: 'good' });
    else toast({ text: (await copyText(csv)) ? 'Downloads are blocked here, so the CSV is on your clipboard.' : 'Export is blocked in this preview.', tone: 'info' });
  };

  return (
    <>
      <section className="card stack">
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <h2 className="display h3">Email list</h2>
            <p className="small strong muted">{subscribed} subscribed, {all.length - subscribed} unsubscribed. Members and RSVPs are added on their own.</p>
          </div>
          <button className="btn cream small" onClick={() => setAdding(true)}>Add contact</button>
          <button className="btn cream small" onClick={() => setImporting(true)}>Import</button>
          <button className="btn cream small" onClick={exportCsv}>Export CSV</button>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <p className="label">Lists</p>
          <div className="row-wrap" role="group" aria-label="Filter by list">
            <button className="chip" aria-pressed={listFilter === 'all'} onClick={() => { setListFilter('all'); setSel([]); }}>Everyone <span style={{ opacity: 0.7 }}>{all.length}</span></button>
            {lists.map((l) => (
              <button key={l.id} className="chip" aria-pressed={listFilter === l.id} style={{ ['--chip-on' as string]: C[l.color], color: listFilter === l.id && (l.color === 'forest' || l.color === 'tomato') ? C.cream : undefined }} onClick={() => { setListFilter(l.id); setSel([]); }}>
                <span className="dot" style={{ background: C[l.color] }} />{l.name} <span style={{ opacity: 0.7 }}>{all.filter((c) => c.listIds.includes(l.id)).length}</span>
              </button>
            ))}
            <button className="chip" onClick={() => setNewListOpen((v) => !v)} aria-expanded={newListOpen}>+ New list</button>
          </div>
          {newListOpen && (
            <form className="row panel" style={{ flexWrap: 'wrap', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { const l = createList(group.id, newName, newColor); if (l) { setListFilter(l.id); setNewName(''); setNewListOpen(false); } } }}>
              <label htmlFor="nl-name" className="sr-only">List name</label>
              <input id="nl-name" className="input grow" style={{ minHeight: 42, minWidth: 160 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Facilitators" />
              <div className="row" style={{ gap: 4 }} role="group" aria-label="List color">
                {COLOR_KEYS.map((k) => <button type="button" key={k} className="swatch" style={{ width: 30, height: 30, borderRadius: 9, background: C[k], borderWidth: 2.5 }} aria-pressed={newColor === k} aria-label={COLOR_NAMES[k]} onClick={() => setNewColor(k)} />)}
              </div>
              <button className="btn sun small" type="submit" disabled={!newName.trim()}>Create list</button>
            </form>
          )}
          {activeList && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {renaming ? (
                <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); renameList(activeList.id, renaming); setRenaming(''); }}>
                  <input className="input" style={{ minHeight: 38 }} value={renaming} onChange={(e) => setRenaming(e.target.value)} aria-label="New list name" />
                  <button className="btn sun small" type="submit">Save</button>
                  <button className="btn cream small" type="button" onClick={() => setRenaming('')}>Cancel</button>
                </form>
              ) : (
                <button className="link-btn small" onClick={() => setRenaming(activeList.name)}>Rename "{activeList.name}"</button>
              )}
              {confirm === 'deleteList' ? (
                <>
                  <span className="small strong">Delete the list? Contacts stay on the main list.</span>
                  <button className="btn danger small" onClick={() => { deleteList(activeList.id); setListFilter('all'); setConfirm(null); }}>Delete list</button>
                  <button className="btn cream small" onClick={() => setConfirm(null)}>Keep</button>
                </>
              ) : (
                <button className="link-btn small" onClick={() => setConfirm('deleteList')}>Delete list</button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="stack">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor="ct-q" className="sr-only">Search contacts</label>
          <input id="ct-q" className="input grow" style={{ minHeight: 44, minWidth: 180 }} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search by name or email" />
          <div className="row-wrap" role="group" aria-label="Filter by status">
            {(['all', 'subscribed', 'unsubscribed'] as const).map((s) => (
              <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'Any status' : s === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}</button>
            ))}
          </div>
        </div>

        {sel.length > 0 && (
          <div className="card row" style={{ gap: 8, flexWrap: 'wrap', padding: 12, background: C.sun, position: 'sticky', top: 8, zIndex: 5 }}>
            <span className="strong">{sel.length} selected</span>
            <select className="input select small" style={{ width: 'auto' }} value="" aria-label="Add selected to a list" onChange={(e) => { if (e.target.value) { addToList(sel, e.target.value); toast({ text: `Added to ${lists.find((l) => l.id === e.target.value)?.name}`, tone: 'good' }); } }}>
              <option value="">Add to list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {activeList && <button className="btn cream small" onClick={() => { removeFromList(sel, activeList.id); setSel([]); }}>Remove from {activeList.name}</button>}
            <button className="btn cream small" onClick={() => setStatus(sel, 'unsubscribed')}>Unsubscribe</button>
            <button className="btn cream small" onClick={() => setStatus(sel, 'subscribed')}>Resubscribe</button>
            {confirm === 'delete' ? (
              <>
                <button className="btn danger small" onClick={() => { deleteContacts(sel); setSel([]); setConfirm(null); }}>Delete {sel.length}</button>
                <button className="btn cream small" onClick={() => setConfirm(null)}>Keep</button>
              </>
            ) : (
              <button className="btn cream small" onClick={() => setConfirm('delete')}>Delete</button>
            )}
            <span className="grow" />
            <button className="link-btn small" onClick={() => setSel([])}>Clear</button>
          </div>
        )}

        <p className="small strong muted">{filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}</p>
        {wide ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" className="check" aria-label="Select all shown" checked={allShownSelected} onChange={() => setSel(allShownSelected ? [] : shown.map((c) => c.id))} /></th>
                  <th>Contact</th><th>Lists</th><th>Status</th><th>Source</th><th>Added</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} className={sel.includes(c.id) ? 'sel' : ''}>
                    <td><input type="checkbox" className="check" aria-label={`Select ${c.email}`} checked={sel.includes(c.id)} onChange={() => toggle(c.id)} /></td>
                    <td><span className="strong" style={{ display: 'block' }}>{c.name || 'No name'}</span><span className="small muted">{c.email}</span></td>
                    <td><div className="row-wrap" style={{ gap: 4 }}>{c.listIds.map((id) => { const l = lists.find((x) => x.id === id); return l ? <span key={id} className="pill" style={{ background: C[l.color], color: l.color === 'forest' || l.color === 'tomato' ? C.cream : C.pine, fontSize: 11, padding: '1px 8px' }}>{l.name}</span> : null; })}</div></td>
                    <td><span className={`pill ${c.status === 'subscribed' ? 'lawn' : ''}`} style={{ fontSize: 11 }}>{c.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}</span></td>
                    <td className="small">{SOURCE[c.source]}</td>
                    <td className="small">{fmtDay(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="list">
              {shown.map((c) => (
                <label key={c.id} className="row" style={{ padding: '12px 0', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" className="check" style={{ marginTop: 3 }} checked={sel.includes(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.email}`} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="strong" style={{ display: 'block' }}>{c.name || 'No name'}</span>
                    <span className="small muted" style={{ display: 'block', overflowWrap: 'anywhere' }}>{c.email}</span>
                    <span className="row-wrap" style={{ gap: 4, marginTop: 4 }}>
                      {c.status === 'unsubscribed' && <span className="pill" style={{ fontSize: 11 }}>Unsubscribed</span>}
                      {c.listIds.map((id) => { const l = lists.find((x) => x.id === id); return l ? <span key={id} className="pill" style={{ background: C[l.color], color: l.color === 'forest' || l.color === 'tomato' ? C.cream : C.pine, fontSize: 11, padding: '1px 8px' }}>{l.name}</span> : null; })}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        {filtered.length > limit && <button className="btn cream block" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, filtered.length - limit)} more</button>}
        {filtered.length === 0 && <p className="panel strong">No contacts match. Try another list or clear the search.</p>}
      </section>

      <ImportSheet group={group} open={importing} onClose={() => setImporting(false)} />
      <AddSheet group={group} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
