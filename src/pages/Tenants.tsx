import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, MessageSquare, KeyRound, Ban, RotateCcw, Phone, Download, Users, Mail, MapPin, Undo2, X, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react'
import { useStore } from '../data/store'
import { ago, cap, date, dateTime, downloadCsv, tzs } from '../lib/format'
import { Avatar, Confirm, Drawer, Empty, Modal, PaymentBadge, ViewingBadge } from '../components/ui'
import type { Tenant } from '../data/types'

type Filter = 'all' | 'registered' | 'guest' | 'suspended'

export default function Tenants() {
  const { db, setTenantStatus } = useStore()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [grantFor, setGrantFor] = useState<string | null>(params.get('grant') ? '' : null)
  const nav = useNavigate()
  const openId = params.get('open')
  const setOpen = (id?: string) => setParams(p => { const n = new URLSearchParams(p); n.delete('grant'); id ? n.set('open', id) : n.delete('open'); return n })

  const stats = useMemo(() => {
    const m = new Map<string, { unlocks: number; spent: number }>()
    db.unlocks.forEach(u => { const s = m.get(u.tenantId) ?? { unlocks: 0, spent: 0 }; s.unlocks++; m.set(u.tenantId, s) })
    db.payments.forEach(p => { if (p.status === 'paid') { const s = m.get(p.tenantId) ?? { unlocks: 0, spent: 0 }; s.spent += p.amount; m.set(p.tenantId, s) } })
    return m
  }, [db.unlocks, db.payments])

  const counts = {
    all: db.tenants.length,
    registered: db.tenants.filter(t => !t.isGuest).length,
    guest: db.tenants.filter(t => t.isGuest).length,
    suspended: db.tenants.filter(t => t.status === 'suspended').length,
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.tenants
      .filter(t => filter === 'all' || (filter === 'guest' ? t.isGuest : filter === 'registered' ? !t.isGuest : t.status === 'suspended'))
      .filter(t => !term || `${t.name} ${t.phone} ${t.email ?? ''} ${t.area ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
  }, [db.tenants, filter, q])

  const open = openId ? db.tenants.find(t => t.id === openId) : undefined

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Tenants</h1>
          <p>Everyone using the Android app, including guests browsing without an account.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => downloadCsv('dalali-tenants.csv', [
            ['ID', 'Name', 'Phone', 'Email', 'Guest', 'Status', 'Joined', 'Last active', 'Unlocks', 'Total paid TZS'],
            ...rows.map(t => [t.id, t.name, t.phone, t.email ?? '', t.isGuest ? 'yes' : 'no', t.status, date(t.joinedAt), date(t.lastActiveAt), stats.get(t.id)?.unlocks ?? 0, stats.get(t.id)?.spent ?? 0]),
          ])}><Download size={18} /> Export</button>
          <button className="btn btn-primary" onClick={() => setGrantFor('')}><KeyRound size={18} /> Grant free unlock</button>
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="chips">
            {(['all', 'registered', 'guest', 'suspended'] as Filter[]).map(f => (
              <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'guest' ? 'Guests' : cap(f)} <span className="n">{counts[f]}</span>
              </button>
            ))}
          </div>
          <span className="grow" />
          <div className="search-box">
            <Search size={16} />
            <input className="input" placeholder="Search name, phone, email…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Tenant</th><th className="hide-sm">Phone</th><th className="hide-sm">Joined</th><th>Last active</th><th className="num">Unlocks</th><th className="num hide-sm">Total paid</th><th style={{ width: 130 }} /></tr></thead>
            <tbody>
              {rows.map(t => (
                <tr key={t.id} className="clickable" onClick={() => setOpen(t.id)}>
                  <td>
                    <div className="row" style={{ gap: 12 }}>
                      <Avatar name={t.name} kind={t.isGuest ? 'guest' : undefined} />
                      <div>
                        <div className="cell-main">{t.name} {t.status === 'suspended' && <span className="badge badge-red" style={{ marginLeft: 6 }}>Suspended</span>}{t.isGuest && <span className="badge badge-slate" style={{ marginLeft: 6 }}>Guest</span>}</div>
                        <div className="cell-sub">{t.email ?? t.area ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm mono">{t.phone || '—'}</td>
                  <td className="hide-sm cell-sub">{date(t.joinedAt)}</td>
                  <td className="cell-sub">{ago(t.lastActiveAt)}</td>
                  <td className="num">{stats.get(t.id)?.unlocks ?? 0}</td>
                  <td className="num hide-sm">{tzs(stats.get(t.id)?.spent ?? 0)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions">
                      {!t.isGuest && <button className="btn btn-ghost btn-sm btn-icon" title="Message" aria-label="Message" onClick={() => nav(`/inbox?tenant=${t.id}`)}><MessageSquare size={16} /></button>}
                      {!t.isGuest && <button className="btn btn-ghost btn-sm btn-icon" title="Grant free unlock" aria-label="Grant free unlock" onClick={() => setGrantFor(t.id)}><KeyRound size={16} /></button>}
                      {t.status === 'active'
                        ? <button className="btn btn-ghost btn-sm btn-icon" title="Suspend" aria-label="Suspend" onClick={() => setTenantStatus(t.id, 'suspended')}><Ban size={16} /></button>
                        : <button className="btn btn-ghost btn-sm btn-icon" title="Reactivate" aria-label="Reactivate" onClick={() => setTenantStatus(t.id, 'active')}><RotateCcw size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty icon={<Users size={40} />} title="No tenants found" />}
        </div>
      </section>

      {open && <TenantDrawer t={open} onClose={() => setOpen()} onGrant={() => setGrantFor(open.id)} />}
      {grantFor !== null && <GrantModal tenantId={grantFor} onClose={() => { setGrantFor(null); setParams(p => { const n = new URLSearchParams(p); n.delete('grant'); return n }) }} />}
    </main>
  )
}

function TenantDrawer({ t, onClose, onGrant }: { t: Tenant; onClose: () => void; onGrant: () => void }) {
  const { db, maps, me, setTenantStatus, updateTenant, revokeUnlock, refundPayment, logCall } = useStore()
  const nav = useNavigate()
  const [notes, setNotes] = useState(t.notes ?? '')
  const [refund, setRefund] = useState<string | null>(null)
  const unlocks = db.unlocks.filter(u => u.tenantId === t.id)
  const pays = db.payments.filter(p => p.tenantId === t.id)
  const viewings = db.viewings.filter(v => v.tenantId === t.id)
  const calls = db.calls.filter(c => c.tenantId === t.id)
  const spent = pays.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0)

  return (
    <Drawer wide title={t.name} onClose={onClose} headExtra={t.status === 'suspended' ? <span className="badge badge-red">Suspended</span> : <span className="badge badge-teal">Active</span>}
      footer={<>
        {t.status === 'active'
          ? <button className="btn btn-danger" onClick={() => setTenantStatus(t.id, 'suspended')}><Ban size={16} /> Suspend</button>
          : <button className="btn btn-secondary" onClick={() => setTenantStatus(t.id, 'active')}><RotateCcw size={16} /> Reactivate</button>}
        <span className="grow" />
        {!t.isGuest && <>
          <button className="btn btn-ghost" onClick={() => logCall(t.id, 0, 'missed')} title="Logs an outbound call attempt"><Phone size={16} /> Log call</button>
          <button className="btn btn-secondary" onClick={onGrant}><KeyRound size={16} /> Grant unlock</button>
          <button className="btn btn-primary" onClick={() => nav(`/inbox?tenant=${t.id}`)}><MessageSquare size={16} /> Message as {me!.name}</button>
        </>}
      </>}>
      <div className="row" style={{ gap: 16, marginBottom: 18 }}>
        <Avatar name={t.name} size="lg" kind={t.isGuest ? 'guest' : undefined} />
        <div className="grow">
          <div className="row-wrap muted small">
            {t.phone && <span className="row" style={{ gap: 4 }}><Phone size={14} /> {t.phone}</span>}
            {t.email && <span className="row" style={{ gap: 4 }}><Mail size={14} /> {t.email}</span>}
            {t.area && <span className="row" style={{ gap: 4 }}><MapPin size={14} /> Looking in {t.area}</span>}
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>{t.isGuest ? 'Guest · browsing without an account' : 'Registered tenant'} · Joined {date(t.joinedAt)} · Active {ago(t.lastActiveAt)}</div>
        </div>
      </div>
      <div className="grid-3" style={{ gap: 10 }}>
        <div className="card" style={{ padding: '10px 14px' }}><div className="small muted">Unlocked</div><b>{unlocks.length} listings</b></div>
        <div className="card" style={{ padding: '10px 14px' }}><div className="small muted">Total paid</div><b>{tzs(spent)}</b></div>
        <div className="card" style={{ padding: '10px 14px' }}><div className="small muted">Viewings</div><b>{viewings.length}</b></div>
      </div>

      <div className="section-title">Admin notes (only admins see this)</div>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (t.notes ?? '') && updateTenant(t.id, { notes })} placeholder="e.g. Wants 2 bedroom near Mwenge, budget 800k" />

      <div className="section-title">Unlocked listings</div>
      {unlocks.length ? <div className="card"><table className="table"><tbody>
        {unlocks.map(u => (
          <tr key={u.id}>
            <td><div className="cell-main ellipsis" style={{ maxWidth: 280 }}>{maps.listing.get(u.listingId)?.title ?? 'Deleted listing'}</div><div className="cell-sub">{u.paymentId ? 'Paid' : 'Granted free'} · expires {date(u.expiresAt)}</div></td>
            <td><div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={() => revokeUnlock(u.id)}><X size={14} /> Remove access</button></div></td>
          </tr>
        ))}
      </tbody></table></div> : <p className="small muted">Hasn't unlocked anything yet.</p>}

      <div className="section-title">Payments</div>
      {pays.length ? <div className="card"><table className="table"><tbody>
        {pays.map(p => (
          <tr key={p.id}>
            <td><div className="mono">{p.ref}</div><div className="cell-sub">{cap(p.kind)} · {p.method} · {dateTime(p.createdAt)}</div></td>
            <td className="num">{tzs(p.amount)}</td>
            <td><PaymentBadge s={p.status} /></td>
            <td><div className="row-actions">{p.status === 'paid' && p.escrow !== 'released' && <button className="btn btn-ghost btn-sm" onClick={() => setRefund(p.id)}><Undo2 size={14} /> Refund</button>}</div></td>
          </tr>
        ))}
      </tbody></table></div> : <p className="small muted">No payments.</p>}

      <div className="section-title">Viewings</div>
      {viewings.length ? <div className="card"><table className="table"><tbody>
        {viewings.map(v => <tr key={v.id}><td className="ellipsis" style={{ maxWidth: 300 }}>{maps.listing.get(v.listingId)?.title}</td><td className="cell-sub">{dateTime(v.date)}</td><td><ViewingBadge s={v.status} /></td></tr>)}
      </tbody></table></div> : <p className="small muted">No viewings.</p>}

      <div className="section-title">Calls</div>
      {calls.length ? <div className="card"><table className="table"><tbody>
        {calls.map(c => {
          const I = c.outcome === 'missed' ? PhoneMissed : c.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
          return <tr key={c.id}><td><span className="row"><I size={15} /> {c.outcome === 'missed' ? 'Missed' : `${Math.ceil(c.durationSec / 60)} min`}</span></td><td className="cell-sub">{maps.admin.get(c.adminId)?.name}</td><td className="cell-sub">{dateTime(c.at)}</td></tr>
        })}
      </tbody></table></div> : <p className="small muted">No calls.</p>}

      {refund && <Confirm title="Refund this payment?" body="The money goes back to the tenant's mobile money account and any access it bought is removed." confirmLabel="Refund" onClose={() => setRefund(null)} onConfirm={() => refundPayment(refund, 'Refunded by admin')} />}
    </Drawer>
  )
}

export function GrantModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const { db, grantUnlock } = useStore()
  const [tid, setTid] = useState(tenantId)
  const [lid, setLid] = useState('')
  const tenants = db.tenants.filter(t => !t.isGuest && t.status === 'active')
  const listings = db.listings.filter(l => l.status === 'live')
  return (
    <Modal onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!tid || !lid} onClick={() => { grantUnlock(tid, lid); onClose() }}><KeyRound size={16} /> Grant access</button>
    </>}>
      <h2>Grant a free unlock</h2>
      <p className="muted small" style={{ marginTop: 0 }}>The tenant sees the owner's contact and location without paying, e.g. after a failed payment or as goodwill.</p>
      <div className="stack" style={{ gap: 12 }}>
        <label className="field"><span>Tenant</span>
          <select className="select" value={tid} onChange={e => setTid(e.target.value)}>
            <option value="">Choose tenant…</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} · {t.phone}</option>)}
          </select>
        </label>
        <label className="field"><span>Listing</span>
          <select className="select" value={lid} onChange={e => setLid(e.target.value)}>
            <option value="">Choose listing…</option>
            {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  )
}
