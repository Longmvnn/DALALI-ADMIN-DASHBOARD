import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wallet, ShieldCheck, Building, Users, MessagesSquare, CalendarDays, Clock, Plus, Send, Download, KeyRound,
  CreditCard, UserPlus, Settings, Activity as ActivityIcon,
} from 'lucide-react'
import { useStore } from '../data/store'
import { ago, num, tzs, tzsShort } from '../lib/format'
import { Thumb } from '../components/ui'
import type { ActivityKind } from '../data/types'

const DAY = 86400_000

export default function Overview() {
  const { db, me } = useStore()
  const nav = useNavigate()

  const s = useMemo(() => {
    const now = Date.now()
    const paidUnlocks = db.payments.filter(p => p.kind === 'unlock' && p.status === 'paid')
    const inRange = (iso: string, from: number, to: number) => { const t = new Date(iso).getTime(); return t >= now - from && t < now - to }
    const rev30 = paidUnlocks.filter(p => inRange(p.createdAt, 30 * DAY, 0)).reduce((a, p) => a + p.amount, 0)
    const revPrev = paidUnlocks.filter(p => inRange(p.createdAt, 60 * DAY, 30 * DAY)).reduce((a, p) => a + p.amount, 0)
    const held = db.payments.filter(p => p.escrow === 'held')
    const registered = db.tenants.filter(t => !t.isGuest)
    const newTenants = registered.filter(t => inRange(t.joinedAt, 30 * DAY, 0)).length

    // 14-day bars of unlock revenue + deposits received
    const days = Array.from({ length: 14 }, (_, i) => {
      const start = new Date(now - (13 - i) * DAY); start.setHours(0, 0, 0, 0)
      const end = start.getTime() + DAY
      const inDay = (iso: string) => { const t = new Date(iso).getTime(); return t >= start.getTime() && t < end }
      return {
        label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        unlock: paidUnlocks.filter(p => inDay(p.createdAt)).reduce((a, p) => a + p.amount, 0),
        count: paidUnlocks.filter(p => inDay(p.createdAt)).length,
      }
    })

    return {
      rev30, revDelta: revPrev ? Math.round(((rev30 - revPrev) / revPrev) * 100) : 0,
      unlocks30: paidUnlocks.filter(p => inRange(p.createdAt, 30 * DAY, 0)).length,
      heldSum: held.reduce((a, p) => a + p.amount, 0), heldCount: held.length,
      live: db.listings.filter(l => l.status === 'live').length,
      drafts: db.listings.filter(l => l.status === 'draft').length,
      tenants: registered.length, guests: db.tenants.length - registered.length, newTenants,
      days,
      unread: db.conversations.filter(c => c.status === 'open' && c.unread > 0).length,
      requested: db.viewings.filter(v => v.status === 'requested').length,
      pending: db.payments.filter(p => p.status === 'pending').length,
      top: [...db.listings].filter(l => l.status === 'live').sort((a, b) => b.unlocks - a.unlocks).slice(0, 5),
    }
  }, [db])

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Habari za asubuhi' : hour < 17 ? 'Habari za mchana' : 'Habari za jioni'

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>{greet}, {me!.name}</h1>
          <p>Here's what's happening on DALALI today.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => nav('/inbox')}><MessagesSquare size={18} /> Open inbox</button>
          <button className="btn btn-primary" onClick={() => nav('/listings?new=1')}><Plus size={18} /> New listing</button>
        </div>
      </div>

      <div className="stats">
        <Stat icon={<Wallet size={16} />} label="Unlock revenue · 30 days" value={tzsShort(s.rev30)}
          delta={<><b className={s.revDelta < 0 ? 'down' : ''}>{s.revDelta >= 0 ? '+' : ''}{s.revDelta}%</b> vs previous 30 days</>} />
        <Stat icon={<ShieldCheck size={16} />} label="Held in escrow" value={tzsShort(s.heldSum)} delta={<>{s.heldCount} deposits waiting</>} />
        <Stat icon={<Building size={16} />} label="Live listings" value={num(s.live)} delta={<>{s.drafts} drafts not published</>} />
        <Stat icon={<Users size={16} />} label="Tenants" value={num(s.tenants)} delta={<><b>+{s.newTenants}</b> this month · {s.guests} guests</>} />
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Attention to="/inbox" icon={<MessagesSquare size={18} />} n={s.unread} label="Unread chats" />
        <Attention to="/viewings" icon={<CalendarDays size={18} />} n={s.requested} label="Viewing requests" />
        <Attention to="/payments?tab=escrow" icon={<ShieldCheck size={18} />} n={s.heldCount} label="Deposits to release" />
        <Attention to="/payments?status=pending" icon={<Clock size={18} />} n={s.pending} label="Pending payments" />
      </div>

      <div className="dash-grid">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Unlock revenue · last 14 days</h2>
              <div className="legend"><span><i style={{ background: 'var(--active)' }} />Paid unlocks ({num(s.unlocks30)} in 30 days)</span></div>
            </div>
            <BarChart days={s.days} />
          </section>

          <section className="card">
            <div className="card-head"><h2>Top listings by unlocks</h2><Link to="/listings">All listings</Link></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Listing</th><th className="num">Price</th><th className="num hide-sm">Views</th><th className="num">Unlocks</th></tr></thead>
                <tbody>
                  {s.top.map(l => (
                    <tr key={l.id} className="clickable" onClick={() => nav(`/listings?open=${l.id}`)}>
                      <td><div className="row"><Thumb l={l} /><div className="grow"><div className="cell-main ellipsis">{l.title}</div><div className="cell-sub">{l.area}, {l.district}</div></div></div></td>
                      <td className="num">{tzs(l.price)}</td>
                      <td className="num hide-sm">{num(l.views)}</td>
                      <td className="num"><b>{l.unlocks}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Quick actions</h2></div>
            <div className="quick">
              <Link to="/listings?new=1"><Plus size={18} /> Post listing</Link>
              <Link to="/inbox"><Send size={18} /> Reply to chats</Link>
              <Link to="/tenants?grant=1"><KeyRound size={18} /> Grant free unlock</Link>
              <Link to="/payments?tab=escrow"><ShieldCheck size={18} /> Release escrow</Link>
              <Link to="/payments?export=1"><Download size={18} /> Export payments</Link>
              <Link to="/settings?tab=pricing"><CreditCard size={18} /> Unlock pricing</Link>
              <Link to="/settings?tab=team"><UserPlus size={18} /> Add admin</Link>
              <Link to="/settings"><Settings size={18} /> App settings</Link>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>Recent activity</h2></div>
            <ul className="feed">
              {db.activity.slice(0, 9).map(a => (
                <li key={a.id}>
                  <span className={`dot ${a.kind}`}><FeedIcon k={a.kind} /></span>
                  <div className="grow"><p>{a.text}</p><span>{ago(a.at)}</span></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}

function Stat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: React.ReactNode }) {
  return (
    <div className="card stat">
      <span className="label">{icon}{label}</span>
      <span className="value">{value}</span>
      <span className="delta">{delta}</span>
    </div>
  )
}

function Attention({ to, icon, n, label }: { to: string; icon: React.ReactNode; n: number; label: string }) {
  return (
    <Link to={to} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', textDecoration: 'none' }}>
      <span className="dot" style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: n ? 'var(--amber-soft)' : 'var(--slate-soft)', color: n ? 'var(--amber)' : 'var(--text-2)' }}>{icon}</span>
      <span className="grow"><b style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 500 }}>{n}</b><br /><span className="small muted">{label}</span></span>
    </Link>
  )
}

function FeedIcon({ k }: { k: ActivityKind }) {
  const I = { payment: Wallet, escrow: ShieldCheck, listing: Building, tenant: Users, viewing: CalendarDays, message: MessagesSquare, admin: ActivityIcon }[k]
  return <I size={16} />
}

function BarChart({ days }: { days: { label: string; unlock: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 700, H = 200, pad = 28
  const max = Math.max(...days.map(d => d.unlock), 1)
  const nice = Math.ceil(max / 20_000) * 20_000
  const bw = (W - pad) / days.length
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label="Daily unlock revenue for the last 14 days">
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line className="grid-line" x1={pad} x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} />
            <text x={0} y={H - f * (H - 10) + 4}>{f ? `${Math.round((nice * f) / 1000)}K` : '0'}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const h = (d.unlock / nice) * (H - 10)
          const x = pad + i * bw + bw * 0.18
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <rect className="bar" x={x} y={H - h} width={bw * 0.64} height={Math.max(h, 1)} rx={4} opacity={hover === null || hover === i ? 1 : 0.45} />
              {(i % 2 === 1 || days.length < 8) && <text x={x + bw * 0.32} y={H + 16} textAnchor="middle">{d.label}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad + hover * bw + bw / 2) / W) * 100}%`, top: `${((H - (days[hover].unlock / nice) * (H - 10)) / (H + 20)) * 100}%` }}>
          <b>{tzs(days[hover].unlock)}</b> · {days[hover].count} unlocks · {days[hover].label}
        </div>
      )}
    </div>
  )
}
