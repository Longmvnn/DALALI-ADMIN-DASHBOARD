import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Star, Pencil, Copy, Trash2, EyeOff, Eye, KeyRound, BedDouble, Bath, Ruler, Lock, Download, Building, CheckCheck, MapPin, Phone, User,
} from 'lucide-react'
import { useStore } from '../data/store'
import { cap, date, downloadCsv, num, tzs } from '../lib/format'
import { Confirm, Drawer, Empty, ListingBadge, PaymentBadge, Thumb, ViewingBadge } from '../components/ui'
import ListingEditor from '../components/ListingEditor'
import type { Listing, ListingStatus } from '../data/types'

const STATUSES: (ListingStatus | 'all')[] = ['all', 'live', 'draft', 'hidden', 'rented']

export default function Listings() {
  const { db, setListingStatus, deleteListings, toggleFeatured, duplicateListing } = useStore()
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<ListingStatus | 'all'>('all')
  const [segment, setSegment] = useState<'all' | 'residential' | 'commercial'>('all')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<'new' | 'price-hi' | 'price-lo' | 'unlocks' | 'views'>('new')
  const [sel, setSel] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null)

  const openId = params.get('open')
  const editId = params.get('edit')
  const isNew = params.get('new') === '1'
  const setParam = (k: string, v?: string) => setParams(p => { const n = new URLSearchParams(p); ['open', 'edit', 'new'].forEach(x => n.delete(x)); if (v) n.set(k, v); return n })

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: db.listings.length }
    db.listings.forEach(l => { c[l.status] = (c[l.status] ?? 0) + 1 })
    return c
  }, [db.listings])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const r = db.listings.filter(l =>
      (status === 'all' || l.status === status) &&
      (segment === 'all' || l.segment === segment) &&
      (!term || `${l.title} ${l.area} ${l.district} ${l.ownerName} ${l.id}`.toLowerCase().includes(term)))
    const by: Record<typeof sort, (a: Listing, b: Listing) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      'price-hi': (a, b) => b.price - a.price,
      'price-lo': (a, b) => a.price - b.price,
      unlocks: (a, b) => b.unlocks - a.unlocks,
      views: (a, b) => b.views - a.views,
    }
    return r.sort((a, b) => Number(b.featured) - Number(a.featured) || by[sort](a, b))
  }, [db.listings, status, segment, q, sort])

  const allSel = rows.length > 0 && rows.every(r => sel.includes(r.id))
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const bulk = (st: ListingStatus) => { setListingStatus(sel, st); setSel([]) }

  function exportCsv() {
    downloadCsv('dalali-listings.csv', [
      ['ID', 'Title', 'Segment', 'Type', 'Area', 'District', 'Price TZS', 'Bedrooms', 'Status', 'Featured', 'Views', 'Unlocks', 'Owner', 'Owner phone', 'Created'],
      ...rows.map(l => [l.id, l.title, l.segment, l.kind, l.area, l.district, l.price, l.bedrooms, l.status, l.featured ? 'yes' : 'no', l.views, l.unlocks, l.ownerName, l.ownerPhone, date(l.createdAt)]),
    ])
  }

  const open = openId ? db.listings.find(l => l.id === openId) : undefined
  const editing = editId ? db.listings.find(l => l.id === editId) : undefined

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Listings</h1>
          <p>Every property in the app. Admins post and manage all of them.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={18} /> Export</button>
          <button className="btn btn-primary" onClick={() => setParam('new', '1')}><Plus size={18} /> New listing</button>
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="chips">
            {STATUSES.map(s => (
              <button key={s} className={`chip${status === s ? ' on' : ''}`} onClick={() => { setStatus(s); setSel([]) }}>
                {s === 'all' ? 'All' : cap(s)} <span className="n">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input className="input" placeholder="Search title, area, owner…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={segment} onChange={e => setSegment(e.target.value as typeof segment)} aria-label="Segment">
            <option value="all">Residential & commercial</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="new">Newest first</option>
            <option value="unlocks">Most unlocks</option>
            <option value="views">Most views</option>
            <option value="price-hi">Price: high to low</option>
            <option value="price-lo">Price: low to high</option>
          </select>
          <span className="grow" />
          <span className="small muted">{rows.length} listings</span>
        </div>

        {sel.length > 0 && (
          <div className="bulkbar">
            <b style={{ marginRight: 8 }}>{sel.length} selected</b>
            <button className="btn btn-sm" onClick={() => bulk('live')}><Eye size={15} /> Publish</button>
            <button className="btn btn-sm" onClick={() => bulk('hidden')}><EyeOff size={15} /> Hide</button>
            <button className="btn btn-sm" onClick={() => bulk('rented')}><CheckCheck size={15} /> Mark rented</button>
            <button className="btn btn-sm" onClick={() => bulk('draft')}>Move to drafts</button>
            <button className="btn btn-sm" onClick={() => setConfirmDelete(sel)}><Trash2 size={15} /> Delete</button>
            <span className="grow" />
            <button className="btn btn-sm" onClick={() => setSel([])}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : rows.map(r => r.id))} aria-label="Select all" /></th>
                <th>Listing</th>
                <th className="num">Price</th>
                <th className="hide-sm">Status</th>
                <th className="num hide-sm">Views</th>
                <th className="num">Unlocks</th>
                <th className="hide-sm">Updated</th>
                <th style={{ width: 150 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className={`clickable${sel.includes(l.id) ? ' selected' : ''}`} onClick={() => setParam('open', l.id)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.title}`} /></td>
                  <td>
                    <div className="row" style={{ gap: 12 }}>
                      <Thumb l={l} />
                      <div className="grow" style={{ maxWidth: 360 }}>
                        <div className="cell-main ellipsis">{l.featured && <Star size={13} fill="var(--amber)" color="var(--amber)" style={{ marginRight: 4, verticalAlign: -1 }} />}{l.title}</div>
                        <div className="cell-sub">{cap(l.segment)} · {l.area}, {l.district}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num"><b>{tzs(l.price)}</b><div className="cell-sub">/ {l.period}</div></td>
                  <td className="hide-sm"><ListingBadge s={l.status} /></td>
                  <td className="num hide-sm">{num(l.views)}</td>
                  <td className="num">{l.unlocks}</td>
                  <td className="hide-sm cell-sub">{date(l.updatedAt)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title={l.featured ? 'Unfeature' : 'Feature on home'} aria-label="Toggle featured" onClick={() => toggleFeatured(l.id)}>
                        <Star size={16} fill={l.featured ? 'var(--amber)' : 'none'} color={l.featured ? 'var(--amber)' : 'currentColor'} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" aria-label="Edit" onClick={() => setParam('edit', l.id)}><Pencil size={16} /></button>
                      {l.status === 'live'
                        ? <button className="btn btn-ghost btn-sm btn-icon" title="Hide from app" aria-label="Hide" onClick={() => setListingStatus([l.id], 'hidden')}><EyeOff size={16} /></button>
                        : <button className="btn btn-ghost btn-sm btn-icon" title="Publish" aria-label="Publish" onClick={() => setListingStatus([l.id], 'live')}><Eye size={16} /></button>}
                      <button className="btn btn-ghost btn-sm btn-icon" title="Duplicate" aria-label="Duplicate" onClick={() => duplicateListing(l.id)}><Copy size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Delete" aria-label="Delete" onClick={() => setConfirmDelete([l.id])}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty icon={<Building size={40} />} title="No listings match">Try another filter or post a new listing.</Empty>}
        </div>
      </section>

      {open && <ListingDrawer l={open} onClose={() => setParam('open')} onEdit={() => setParam('edit', open.id)} onDelete={() => setConfirmDelete([open.id])} />}
      {(isNew || editing) && <ListingEditor listing={editing} onClose={() => setParam(editing ? 'open' : 'new', editing?.id)} onSaved={id => setParam('open', id)} />}
      {confirmDelete && (
        <Confirm danger title={`Delete ${confirmDelete.length > 1 ? `${confirmDelete.length} listings` : 'this listing'}?`}
          body="Tenants who already unlocked it will lose access. This can't be undone. Hiding the listing is usually safer."
          confirmLabel="Delete" onClose={() => setConfirmDelete(null)}
          onConfirm={() => { deleteListings(confirmDelete); setSel(s => s.filter(x => !confirmDelete.includes(x))); setParam('open') }} />
      )}
    </main>
  )
}

function ListingDrawer({ l, onClose, onEdit, onDelete }: { l: Listing; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { db, maps, setListingStatus, toggleFeatured, duplicateListing } = useStore()
  const pays = db.payments.filter(p => p.listingId === l.id)
  const revenue = pays.filter(p => p.kind === 'unlock' && p.status === 'paid').reduce((a, p) => a + p.amount, 0)
  const unlocks = db.unlocks.filter(u => u.listingId === l.id)
  const viewings = db.viewings.filter(v => v.listingId === l.id)

  return (
    <Drawer wide title={l.title} onClose={onClose} headExtra={<ListingBadge s={l.status} />}
      footer={<>
        <button className="btn btn-danger" onClick={onDelete}><Trash2 size={16} /> Delete</button>
        <span className="grow" />
        <button className="btn btn-ghost" onClick={() => duplicateListing(l.id)}><Copy size={16} /> Duplicate</button>
        <button className="btn btn-ghost" onClick={() => toggleFeatured(l.id)}><Star size={16} /> {l.featured ? 'Unfeature' : 'Feature'}</button>
        {l.status !== 'rented' && <button className="btn btn-secondary" onClick={() => setListingStatus([l.id], 'rented')}><CheckCheck size={16} /> Mark rented</button>}
        {l.status === 'live'
          ? <button className="btn btn-secondary" onClick={() => setListingStatus([l.id], 'hidden')}><EyeOff size={16} /> Hide</button>
          : <button className="btn btn-secondary" onClick={() => setListingStatus([l.id], 'live')}><Eye size={16} /> Publish</button>}
        <button className="btn btn-primary" onClick={onEdit}><Pencil size={16} /> Edit</button>
      </>}>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 160 }}><div className="thumb arch" style={{ width: 160, height: 150 }}>{l.photos[0] ? <img src={l.photos[0]} alt="" /> : <Building size={36} strokeWidth={1.5} />}</div></div>
        <div className="grow stack" style={{ gap: 8 }}>
          {l.featured && <span className="badge badge-amber" style={{ alignSelf: 'flex-start' }}><Star size={11} /> Featured</span>}
          <div style={{ fontSize: 20, fontWeight: 700 }}>{tzs(l.price)} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>/ {l.period}</span></div>
          <div className="row-wrap muted small">
            {l.bedrooms > 0 && <span className="row" style={{ gap: 4 }}><BedDouble size={15} /> {l.bedrooms} bed</span>}
            <span className="row" style={{ gap: 4 }}><Bath size={15} /> {l.bathrooms} bath</span>
            <span className="row" style={{ gap: 4 }}><Ruler size={15} /> {l.sizeSqm} m²</span>
            <span className="row" style={{ gap: 4 }}><MapPin size={15} /> {l.area}, {l.district}</span>
          </div>
          <div className="grid-3" style={{ gap: 10, marginTop: 6 }}>
            <Mini label="Views" value={num(l.views)} /><Mini label="Unlocks" value={num(l.unlocks)} /><Mini label="Unlock revenue" value={tzs(revenue)} />
          </div>
        </div>
      </div>

      <p style={{ marginTop: 0 }}>{l.description}</p>
      {l.amenities.length > 0 && <div className="amenities">{l.amenities.map(a => <span key={a} className="badge badge-slate" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, height: 26 }}>{a}</span>)}</div>}

      <div className="section-title">Locked until the tenant pays · {tzs(l.unlockPrice)}</div>
      <dl className="kv">
        <dt className="row" style={{ gap: 6 }}><User size={14} /> Owner</dt><dd>{l.ownerName}</dd>
        <dt className="row" style={{ gap: 6 }}><Phone size={14} /> Phone</dt><dd>{l.ownerPhone}</dd>
        <dt className="row" style={{ gap: 6 }}><MapPin size={14} /> Address</dt><dd>{l.exactAddress}</dd>
      </dl>

      <div className="section-title">Tenants with access ({unlocks.length})</div>
      {unlocks.length ? (
        <div className="card"><table className="table"><tbody>
          {unlocks.slice(0, 8).map(u => (
            <tr key={u.id}>
              <td className="cell-main">{maps.tenant.get(u.tenantId)?.name}</td>
              <td className="cell-sub">{u.paymentId ? 'Paid' : <span className="row" style={{ gap: 4 }}><KeyRound size={13} /> Granted free</span>}</td>
              <td className="cell-sub">{date(u.createdAt)}</td>
            </tr>
          ))}
        </tbody></table></div>
      ) : <p className="muted small"><Lock size={13} /> Nobody has unlocked this yet.</p>}

      <div className="section-title">Viewings ({viewings.length})</div>
      {viewings.length ? (
        <div className="card"><table className="table"><tbody>
          {viewings.map(v => (
            <tr key={v.id}><td className="cell-main">{maps.tenant.get(v.tenantId)?.name}</td><td className="cell-sub">{date(v.date)}</td><td><ViewingBadge s={v.status} /></td></tr>
          ))}
        </tbody></table></div>
      ) : <p className="muted small">No viewings booked.</p>}

      <div className="section-title">Payments ({pays.length})</div>
      {pays.length ? (
        <div className="card"><table className="table"><tbody>
          {pays.slice(0, 8).map(p => (
            <tr key={p.id}><td className="mono">{p.ref}</td><td className="cell-sub">{cap(p.kind)} · {p.method}</td><td className="num">{tzs(p.amount)}</td><td><PaymentBadge s={p.status} /></td></tr>
          ))}
        </tbody></table></div>
      ) : <p className="muted small">No payments yet.</p>}

      <p className="small muted" style={{ marginTop: 20 }}>ID {l.id} · Created {date(l.createdAt)} · Updated {date(l.updatedAt)}</p>
    </Drawer>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="card" style={{ padding: '8px 12px' }}><div className="small muted">{label}</div><b>{value}</b></div>
}
