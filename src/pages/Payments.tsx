import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Download, Undo2, Check, ShieldCheck, Wallet, AlertTriangle, RotateCcw, Send, Info } from 'lucide-react'
import { useStore } from '../data/store'
import { dateTime, downloadCsv, tzs, tzsShort } from '../lib/format'
import { Confirm, Empty, EscrowBadge, PaymentBadge } from '../components/ui'
import type { Payment, PaymentMethod, PaymentStatus } from '../data/types'

type Tab = 'all' | 'unlock' | 'escrow'

export default function Payments() {
  const { db, maps, refundPayment, releaseEscrow, confirmPayment } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'all'
  const [status, setStatus] = useState<PaymentStatus | 'all'>((params.get('status') as PaymentStatus) || 'all')
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [q, setQ] = useState('')
  const [act, setAct] = useState<{ kind: 'refund' | 'release'; p: Payment } | null>(null)
  const [reason, setReason] = useState('')
  const nav = useNavigate()

  const month = useMemo(() => {
    const from = Date.now() - 30 * 86400_000
    const recent = db.payments.filter(p => new Date(p.createdAt).getTime() >= from)
    return {
      collected: recent.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0),
      held: db.payments.filter(p => p.escrow === 'held').reduce((a, p) => a + p.amount, 0),
      refunded: recent.filter(p => p.status === 'refunded').reduce((a, p) => a + p.amount, 0),
      failed: recent.filter(p => p.status === 'failed').length,
    }
  }, [db.payments])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.payments.filter(p =>
      (tab === 'all' || (tab === 'unlock' ? p.kind === 'unlock' : p.kind === 'deposit')) &&
      (status === 'all' || p.status === status) &&
      (method === 'all' || p.method === method) &&
      (!term || `${p.ref} ${maps.tenant.get(p.tenantId)?.name} ${maps.listing.get(p.listingId)?.title}`.toLowerCase().includes(term)))
  }, [db.payments, tab, status, method, q, maps])

  function exportCsv() {
    downloadCsv('dalali-payments.csv', [
      ['Reference', 'Date', 'Type', 'Tenant', 'Listing', 'Method', 'Amount TZS', 'Status', 'Escrow', 'Note'],
      ...rows.map(p => [p.ref, dateTime(p.createdAt), p.kind, maps.tenant.get(p.tenantId)?.name ?? '', maps.listing.get(p.listingId)?.title ?? '', p.method, p.amount, p.status, p.escrow ?? '', p.note ?? '']),
    ])
  }

  // ?export=1 from the overview's quick actions
  const exported = useRef(false)
  useEffect(() => {
    if (params.get('export') && !exported.current) {
      exported.current = true
      exportCsv()
      setParams(p => { const n = new URLSearchParams(p); n.delete('export'); return n }, { replace: true })
    }
  })

  const setTab = (t: Tab) => setParams(t === 'all' ? {} : { tab: t })
  const held = db.payments.filter(p => p.escrow === 'held')

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Payments & escrow</h1>
          <p>Unlock fees and rent deposits paid through the app. Deposits stay in escrow until you release them.</p>
        </div>
        <div className="actions"><button className="btn btn-secondary" onClick={exportCsv}><Download size={18} /> Export CSV</button></div>
      </div>

      <div className="stats">
        <Tile icon={<Wallet size={16} />} label="Collected · 30 days" value={tzsShort(month.collected)} />
        <Tile icon={<ShieldCheck size={16} />} label="Held in escrow now" value={tzsShort(month.held)} />
        <Tile icon={<RotateCcw size={16} />} label="Refunded · 30 days" value={tzsShort(month.refunded)} />
        <Tile icon={<AlertTriangle size={16} />} label="Failed · 30 days" value={String(month.failed)} />
      </div>

      <div className="tabs">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All payments <span className="n">{db.payments.length}</span></button>
        <button className={tab === 'unlock' ? 'on' : ''} onClick={() => setTab('unlock')}>Unlock fees</button>
        <button className={tab === 'escrow' ? 'on' : ''} onClick={() => setTab('escrow')}>Escrow deposits <span className="n">{held.length} held</span></button>
      </div>

      {tab === 'escrow' && held.length > 0 && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Info size={18} />
          <div>Deposits release to the landlord automatically {db.settings.escrowAutoReleaseDays} days after move-in unless the tenant raises a problem. Release early or refund below.</div>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input className="input" placeholder="Reference, tenant or listing" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select className="select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Status">
            <option value="all">Any status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
          </select>
          <select className="select" style={{ width: 'auto' }} value={method} onChange={e => setMethod(e.target.value as typeof method)} aria-label="Method">
            <option value="all">Any method</option>
            {(Object.keys(db.settings.paymentMethods) as PaymentMethod[]).map(m => <option key={m}>{m}</option>)}
          </select>
          <span className="grow" />
          <span className="small muted">{rows.length} payments · {tzs(rows.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0))} paid</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Tenant</th><th className="hide-sm">For</th><th className="hide-sm">Method</th><th className="num">Amount</th><th>Status</th><th style={{ width: 200 }} /></tr></thead>
            <tbody>
              {rows.slice(0, 200).map(p => {
                const t = maps.tenant.get(p.tenantId)
                const l = maps.listing.get(p.listingId)
                return (
                  <tr key={p.id}>
                    <td><div className="mono cell-main">{p.ref}</div><div className="cell-sub">{dateTime(p.createdAt)}</div></td>
                    <td><button className="link" style={{ textDecoration: 'none', fontSize: 14 }} onClick={() => nav(`/tenants?open=${p.tenantId}`)}>{t?.name ?? '—'}</button></td>
                    <td className="hide-sm"><div className="ellipsis" style={{ maxWidth: 240 }}>{l?.title ?? 'Deleted listing'}</div><div className="cell-sub">{p.kind === 'deposit' ? 'Rent deposit' : 'Unlock fee'}{p.note ? ` · ${p.note}` : ''}</div></td>
                    <td className="hide-sm">{p.method}</td>
                    <td className="num"><b>{tzs(p.amount)}</b></td>
                    <td>{p.kind === 'deposit' && p.escrow ? <EscrowBadge s={p.escrow} /> : <PaymentBadge s={p.status} />}</td>
                    <td>
                      <div className="row-actions">
                        {p.status === 'pending' && <button className="btn btn-secondary btn-sm" onClick={() => confirmPayment(p.id)}><Check size={14} /> Confirm</button>}
                        {p.escrow === 'held' && <button className="btn btn-teal btn-sm" onClick={() => setAct({ kind: 'release', p })}><Send size={14} /> Release</button>}
                        {p.status === 'paid' && p.escrow !== 'released' && <button className="btn btn-ghost btn-sm" onClick={() => { setReason(''); setAct({ kind: 'refund', p }) }}><Undo2 size={14} /> Refund</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <Empty icon={<Wallet size={40} />} title="No payments match" />}
        </div>
      </section>

      {act?.kind === 'release' && (
        <Confirm title={`Release ${tzs(act.p.amount)} to the landlord?`}
          body={`${maps.listing.get(act.p.listingId)?.ownerName} gets the deposit for ${maps.listing.get(act.p.listingId)?.title}. Do this once the tenant has moved in.`}
          confirmLabel="Release deposit" onClose={() => setAct(null)} onConfirm={() => releaseEscrow(act.p.id)} />
      )}
      {act?.kind === 'refund' && (
        <Confirm title={`Refund ${tzs(act.p.amount)}?`} body={`Sends the money back to ${maps.tenant.get(act.p.tenantId)?.name} via ${act.p.method}.${act.p.kind === 'unlock' ? ' Their access to this listing is removed.' : ''}`}
          confirmLabel="Refund" onClose={() => setAct(null)} onConfirm={() => refundPayment(act.p.id, reason || undefined)}>
          <label className="field" style={{ marginTop: 14 }}><span>Reason (optional)</span><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. House already rented" /></label>
        </Confirm>
      )}
    </main>
  )
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="card stat"><span className="label">{icon}{label}</span><span className="value">{value}</span></div>
}

